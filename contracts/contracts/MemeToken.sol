// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MemeToken
 * @notice A simple ERC-20 meme token created by MemeFactory.
 *         All 1 billion tokens are minted to the factory at deployment,
 *         which distributes them via the bonding curve.
 */
contract MemeToken is ERC20 {
    address public immutable factory;
    string public description;
    string public metadataURI; // IPFS URI — points to JSON with image, description, links

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _description,
        string memory _metadataURI,
        address _factory
    ) ERC20(_name, _symbol) {
        factory = _factory;
        description = _description;
        metadataURI = _metadataURI;
        // Mint entire supply to the factory — the bonding curve manages distribution
        _mint(_factory, 1_000_000_000 * 10 ** 18);
    }
}
