// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MemeToken.sol";

/**
 * @title MemeFactory
 * @notice Bonding-curve token launcher on Monad Testnet.
 *
 * Mechanism (constant-product AMM with virtual reserves):
 *   x * y = k
 *   x = MON reserve (virtual + real)
 *   y = token reserve remaining in the curve
 *
 * Buying:  tokensOut = tokenReserve * monIn  / (monReserve + monIn)
 * Selling: monOut    = monReserve  * tokenIn / (tokenReserve + tokenIn)
 *
 * A 1 % fee is applied on every trade. Fees accumulate and can be
 * withdrawn by the owner.
 *
 * Graduation: once a token has raised GRADUATION_THRESHOLD real MON,
 * it is marked as graduated and trading stops on the bonding curve.
 * At that point the collected MON can be seeded into a DEX.
 */
contract MemeFactory is Ownable, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Total supply minted per token (1 billion, 18 decimals)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    /**
     * @notice Virtual MON reserve seeded into every new curve.
     *         Setting this to 1.073 MON (1073 * 10^15 wei) means the
     *         starting price is ≈ 0.000000001073 MON per token — extremely
     *         cheap at launch, steeply rising with buys.
     */
    uint256 public constant VIRTUAL_MON_RESERVE = 1_073 * 10 ** 15; // 1.073 MON

    /// @notice Amount of real MON raised that triggers graduation
    uint256 public constant GRADUATION_THRESHOLD = 10 * 10 ** 18; // 10 MON

    /// @notice Optional flat fee to create a token (0 by default — change if desired)
    uint256 public creationFee = 0;

    /// @notice Trade fee in basis points (100 = 1 %)
    uint256 public constant TRADE_FEE_BPS = 100;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // ─── State ────────────────────────────────────────────────────────────────

    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        string metadataURI;   // IPFS URI with image + description JSON
        uint256 monReserve;   // current MON reserve (virtual + net buys)
        uint256 tokenReserve; // tokens still held by the curve
        uint256 realMonRaised;// net real MON raised (buys minus sells)
        bool graduated;
        uint256 createdAt;
    }

    /// @notice token address → metadata + curve state
    mapping(address => TokenInfo) public tokens;

    /// @notice ordered list of all launched tokens
    address[] public allTokens;

    /// @notice accumulated fees (in wei) available for withdrawal
    uint256 public feesAccumulated;

    // ─── Events ───────────────────────────────────────────────────────────────

    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        string metadataURI,
        uint256 timestamp
    );

    event TokensBought(
        address indexed tokenAddress,
        address indexed buyer,
        uint256 monIn,
        uint256 tokensOut,
        uint256 newMonReserve,
        uint256 newTokenReserve
    );

    event TokensSold(
        address indexed tokenAddress,
        address indexed seller,
        uint256 tokensIn,
        uint256 monOut,
        uint256 newMonReserve,
        uint256 newTokenReserve
    );

    event TokenGraduated(
        address indexed tokenAddress,
        uint256 totalMonRaised
    );

    event FeesWithdrawn(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Token creation ───────────────────────────────────────────────────────

    /**
     * @notice Launch a new meme token.
     * @param name        Token name (e.g. "Pepe on Monad")
     * @param symbol      Token ticker (e.g. "PEPE")
     * @param metadataURI IPFS URI pointing to JSON: { image, description, twitter, telegram, website }
     *
     * @dev Caller may send MON with the call to immediately buy into the curve
     *      after creation (msg.value > creationFee → excess is used to buy).
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata metadataURI
    ) external payable nonReentrant returns (address tokenAddress) {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(bytes(name).length > 0, "Name required");
        require(bytes(symbol).length > 0, "Symbol required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");

        // Deploy the ERC-20
        MemeToken token = new MemeToken(name, symbol, "", metadataURI, address(this));
        tokenAddress = address(token);

        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            metadataURI: metadataURI,
            monReserve: VIRTUAL_MON_RESERVE,
            tokenReserve: TOTAL_SUPPLY,
            realMonRaised: 0,
            graduated: false,
            createdAt: block.timestamp
        });

        allTokens.push(tokenAddress);

        emit TokenCreated(tokenAddress, msg.sender, name, symbol, metadataURI, block.timestamp);

        // Collect creation fee (if any); use the rest to buy tokens for creator
        feesAccumulated += creationFee;
        uint256 buyAmount = msg.value - creationFee;
        if (buyAmount > 0) {
            _buy(tokenAddress, msg.sender, buyAmount);
        }
    }

    // ─── Trading ──────────────────────────────────────────────────────────────

    /**
     * @notice Buy tokens with native MON.
     * @param tokenAddress Address of the token to buy.
     */
    function buy(address tokenAddress) external payable nonReentrant {
        require(msg.value > 0, "Send MON to buy");
        require(tokens[tokenAddress].tokenAddress != address(0), "Token not found");
        require(!tokens[tokenAddress].graduated, "Token has graduated - trade on DEX");
        _buy(tokenAddress, msg.sender, msg.value);
    }

    /**
     * @notice Sell tokens back to the curve for native MON.
     * @param tokenAddress Address of the token to sell.
     * @param tokensIn     Amount of tokens to sell (18 decimals).
     * @param minMonOut    Minimum MON to receive (slippage guard).
     */
    function sell(
        address tokenAddress,
        uint256 tokensIn,
        uint256 minMonOut
    ) external nonReentrant {
        require(tokensIn > 0, "Must sell > 0 tokens");
        require(tokens[tokenAddress].tokenAddress != address(0), "Token not found");
        require(!tokens[tokenAddress].graduated, "Token has graduated - trade on DEX");

        TokenInfo storage info = tokens[tokenAddress];

        // AMM: monOut = monReserve * tokensIn / (tokenReserve + tokensIn)
        uint256 monOut = (info.monReserve * tokensIn) / (info.tokenReserve + tokensIn);

        // Deduct 1 % fee
        uint256 fee = (monOut * TRADE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 monOutAfterFee = monOut - fee;

        require(monOutAfterFee >= minMonOut, "Slippage: too little MON out");
        require(address(this).balance >= monOutAfterFee, "Insufficient contract balance");

        feesAccumulated += fee;

        // Pull tokens from seller
        require(
            IERC20(tokenAddress).transferFrom(msg.sender, address(this), tokensIn),
            "Token transfer failed"
        );

        // Update reserves
        info.monReserve -= monOut;
        info.tokenReserve += tokensIn;
        if (info.realMonRaised >= monOut) {
            info.realMonRaised -= monOut;
        } else {
            info.realMonRaised = 0;
        }

        // Send MON to seller
        (bool sent, ) = payable(msg.sender).call{ value: monOutAfterFee }("");
        require(sent, "MON transfer failed");

        emit TokensSold(
            tokenAddress,
            msg.sender,
            tokensIn,
            monOutAfterFee,
            info.monReserve,
            info.tokenReserve
        );
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _buy(
        address tokenAddress,
        address buyer,
        uint256 monIn
    ) internal {
        TokenInfo storage info = tokens[tokenAddress];

        // Deduct 1 % fee
        uint256 fee = (monIn * TRADE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 monInAfterFee = monIn - fee;
        feesAccumulated += fee;

        // AMM: tokensOut = tokenReserve * monInAfterFee / (monReserve + monInAfterFee)
        uint256 tokensOut = (info.tokenReserve * monInAfterFee) / (info.monReserve + monInAfterFee);
        require(tokensOut > 0, "Zero tokens out");
        require(tokensOut <= info.tokenReserve, "Exceeds token reserve");

        // Update reserves
        info.monReserve += monInAfterFee;
        info.tokenReserve -= tokensOut;
        info.realMonRaised += monInAfterFee;

        // Transfer tokens to buyer
        require(
            IERC20(tokenAddress).transfer(buyer, tokensOut),
            "Token transfer failed"
        );

        emit TokensBought(
            tokenAddress,
            buyer,
            monIn,
            tokensOut,
            info.monReserve,
            info.tokenReserve
        );

        // Check graduation
        if (!info.graduated && info.realMonRaised >= GRADUATION_THRESHOLD) {
            info.graduated = true;
            emit TokenGraduated(tokenAddress, info.realMonRaised);
        }
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Current spot price in MON per token (18-decimal fraction)
    function getSpotPrice(address tokenAddress) external view returns (uint256) {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        // price = monReserve / tokenReserve  (both 18-decimal, result is also 18-decimal)
        return (info.monReserve * 10 ** 18) / info.tokenReserve;
    }

    /// @notice Simulate how many tokens you'd receive for `monIn` MON
    function quoteBuy(address tokenAddress, uint256 monIn)
        external
        view
        returns (uint256 tokensOut, uint256 fee)
    {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        fee = (monIn * TRADE_FEE_BPS) / BPS_DENOMINATOR;
        uint256 monInAfterFee = monIn - fee;
        tokensOut = (info.tokenReserve * monInAfterFee) / (info.monReserve + monInAfterFee);
    }

    /// @notice Simulate how much MON you'd receive for selling `tokensIn` tokens
    function quoteSell(address tokenAddress, uint256 tokensIn)
        external
        view
        returns (uint256 monOut, uint256 fee)
    {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        uint256 grossMonOut = (info.monReserve * tokensIn) / (info.tokenReserve + tokensIn);
        fee = (grossMonOut * TRADE_FEE_BPS) / BPS_DENOMINATOR;
        monOut = grossMonOut - fee;
    }

    /// @notice Market cap in MON (spot price × total supply)
    function getMarketCap(address tokenAddress) external view returns (uint256) {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        uint256 spotPrice = (info.monReserve * 10 ** 18) / info.tokenReserve;
        return (spotPrice * TOTAL_SUPPLY) / 10 ** 18;
    }

    /// @notice Progress toward graduation (0–10000 basis points = 0–100 %)
    function getGraduationProgress(address tokenAddress) external view returns (uint256) {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        if (info.graduated) return BPS_DENOMINATOR;
        return (info.realMonRaised * BPS_DENOMINATOR) / GRADUATION_THRESHOLD;
    }

    /// @notice Total number of tokens launched
    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @notice Paginated list of token addresses (most-recent first).
     * @param offset  Start index (0 = newest)
     * @param limit   Max items to return
     */
    function getTokensPaginated(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory result)
    {
        uint256 total = allTokens.length;
        if (offset >= total) return new address[](0);

        uint256 end = total - offset; // exclusive upper bound (newest → oldest)
        uint256 start = end > limit ? end - limit : 0;
        uint256 count = end - start;

        result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allTokens[start + i];
        }
        // Reverse so index 0 = newest
        for (uint256 i = 0; i < count / 2; i++) {
            (result[i], result[count - 1 - i]) = (result[count - 1 - i], result[i]);
        }
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Withdraw accumulated fees to owner
    function withdrawFees() external onlyOwner {
        uint256 amount = feesAccumulated;
        require(amount > 0, "Nothing to withdraw");
        feesAccumulated = 0;
        (bool sent, ) = payable(owner()).call{ value: amount }("");
        require(sent, "Fee withdrawal failed");
        emit FeesWithdrawn(owner(), amount);
    }

    /// @notice Update the token creation fee (owner only)
    function setCreationFee(uint256 newFee) external onlyOwner {
        creationFee = newFee;
    }

    /// @notice Receive MON sent directly (e.g. initial seeding)
    receive() external payable {}
}
