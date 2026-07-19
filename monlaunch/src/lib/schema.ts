import {
  pgTable,
  text,
  boolean,
  timestamp,
  serial,
  integer,
  index,
} from "drizzle-orm/pg-core";

// ── Tokens ────────────────────────────────────────────────────────────────────
export const tokens = pgTable(
  "tokens",
  {
    id: serial("id").primaryKey(),
    address: text("address").notNull().unique(), // ERC-20 contract address
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    description: text("description").default(""),
    imageUrl: text("image_url").default(""), // resolved IPFS image URL
    metadataUri: text("metadata_uri").default(""), // ipfs://... metadata JSON
    creator: text("creator").notNull(), // wallet address of creator
    // Bonding curve state (cached from chain, updated on trade)
    monReserve: text("mon_reserve").default("0"), // as string to avoid overflow
    tokenReserve: text("token_reserve").default("0"),
    realMonRaised: text("real_mon_raised").default("0"),
    graduated: boolean("graduated").default(false),
    // Aggregated stats
    totalVolumeMon: text("total_volume_mon").default("0"),
    tradeCount: integer("trade_count").default(0),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    lastTradeAt: timestamp("last_trade_at"),
    // Block data
    txHash: text("tx_hash").default(""),
    blockNumber: text("block_number").default("0"),
  },
  (t) => [
    index("tokens_creator_idx").on(t.creator),
    index("tokens_created_at_idx").on(t.createdAt),
    index("tokens_graduated_idx").on(t.graduated),
  ]
);

// ── Trades ────────────────────────────────────────────────────────────────────
export const trades = pgTable(
  "trades",
  {
    id: serial("id").primaryKey(),
    tokenAddress: text("token_address").notNull(),
    traderAddress: text("trader_address").notNull(),
    type: text("type").notNull(), // 'buy' | 'sell'
    monAmount: text("mon_amount").notNull(), // wei, as string
    tokenAmount: text("token_amount").notNull(), // wei, as string
    txHash: text("tx_hash").notNull().unique(),
    blockNumber: text("block_number").default("0"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("trades_token_idx").on(t.tokenAddress),
    index("trades_trader_idx").on(t.traderAddress),
    index("trades_created_at_idx").on(t.createdAt),
  ]
);

// ── Comments ──────────────────────────────────────────────────────────────────
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    tokenAddress: text("token_address").notNull(),
    authorAddress: text("author_address").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("comments_token_idx").on(t.tokenAddress),
    index("comments_created_at_idx").on(t.createdAt),
  ]
);

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
