import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").notNull().default(0),
  role: text("role").notNull().default("user"),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // in cents
  imageUrl: text("image_url").notNull(),
  ingredients: text("ingredients").notNull().default(""), // JSON array as string
  nutrition: text("nutrition").notNull().default(""), // JSON object as string
  addOns: text("add_ons").notNull().default("[]"), // JSON: [{ name, price }] (price in cents)
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  amount: integer("amount").notNull(), // in cents (base + add-ons)
  pointsEarned: integer("points_earned").notNull(),
  selectedAddOns: text("selected_add_ons").notNull().default("[]"), // JSON: [{ name, price }]
  redemptionId: integer("redemption_id"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  amount: integer("amount").notNull(), // in cents, locked at request time (base + add-ons)
  pointsToEarn: integer("points_to_earn").notNull(),
  selectedAddOns: text("selected_add_ons").notNull().default("[]"), // JSON: [{ name, price }]
  redemptionId: integer("redemption_id"),
  notes: text("notes").notNull().default(""),
  proofImageUrl: text("proof_image_url"),
  referenceCode: text("reference_code").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | confirmed | rejected
  transactionId: integer("transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Discount tickets created by admin — customers redeem with points
export const discountTickets = pgTable("discount_tickets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  code: text("code").notNull().unique(), // base code admin sets, e.g. "FISH50OFF"
  pointsCost: integer("points_cost").notNull(), // points required to redeem
  discountType: text("discount_type").notNull().default("percent"), // "percent" | "flat"
  discountValue: integer("discount_value").notNull(), // percent (1-100) or flat in cents
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Records of who redeemed which ticket
export const redemptions = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ticketId: integer("ticket_id").notNull(),
  identifier: text("identifier").notNull(), // customer's name / label typed at redemption
  pointsSpent: integer("points_spent").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
});

// Chat messages — one thread per customer user
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // the customer's userId (thread owner)
  senderType: text("sender_type").notNull(), // "customer" | "admin"
  content: text("content").notNull(),
  isReadByAdmin: boolean("is_read_by_admin").notNull().default(false),
  isReadByCustomer: boolean("is_read_by_customer").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, points: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertDiscountTicketSchema = createInsertSchema(discountTickets).omit({ id: true, createdAt: true });
export const insertRedemptionSchema = createInsertSchema(redemptions).omit({ id: true, redeemedAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type PaymentRequest = typeof paymentRequests.$inferSelect;

export type DiscountTicket = typeof discountTickets.$inferSelect;
export type InsertDiscountTicket = z.infer<typeof insertDiscountTicketSchema>;

export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
