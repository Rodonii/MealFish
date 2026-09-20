import { db } from "./db";
import {
  users,
  products,
  transactions,
  settings,
  paymentRequests,
  discountTickets,
  redemptions,
  chatMessages,
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Transaction,
  type InsertTransaction,
  type PaymentRequest,
  type DiscountTicket,
  type InsertDiscountTicket,
  type Redemption,
  type ChatMessage,
} from "@shared/schema";
import { eq, and, desc, ilike } from "drizzle-orm";

export interface PendingPaymentSummary {
  request: PaymentRequest;
  username: string;
  productName: string;
}

export interface PurchaseSummary {
  totalPurchases: number;
  products: Array<{
    productId: number;
    productName: string;
    purchaseCount: number;
  }>;
}

export interface ResolvePaymentResult {
  request: PaymentRequest;
  newPointsTotal: number | null;
}

export interface RedemptionSummary {
  redemption: Redemption;
  username: string;
  ticketName: string;
  ticketCode: string;
}

export interface MyRedemptionItem {
  redemption: Redemption;
  ticket: DiscountTicket;
}

export interface RedeemResult {
  redemption: Redemption;
  ticket: DiscountTicket;
  newPointsTotal: number;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { isAdmin?: boolean }): Promise<User>;
  updateUserPoints(id: number, points: number): Promise<User>;
  setUserAdmin(id: number, isAdmin: boolean): Promise<User>;

  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, fields: Partial<InsertProduct>): Promise<Product | undefined>;

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;

  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  createPaymentRequest(input: {
    userId: number;
    productId: number;
    amount: number;
    pointsToEarn: number;
    selectedAddOns?: string;
    redemptionId?: number;
    notes?: string;
  }): Promise<PaymentRequest>;
  getPaymentRequest(id: number): Promise<PaymentRequest | undefined>;
  getPendingPaymentRequest(userId: number): Promise<PaymentRequest | undefined>;
  updatePaymentRequestProof(id: number, proofImageUrl: string): Promise<PaymentRequest | undefined>;
  listPendingPaymentRequests(): Promise<PendingPaymentSummary[]>;
  getPurchaseSummary(): Promise<PurchaseSummary>;
  resolvePaymentRequest(id: number, action: "confirm" | "reject"): Promise<ResolvePaymentResult>;

  // Discount tickets
  listDiscountTickets(activeOnly?: boolean): Promise<DiscountTicket[]>;
  getDiscountTicket(id: number): Promise<DiscountTicket | undefined>;
  createDiscountTicket(ticket: InsertDiscountTicket): Promise<DiscountTicket>;
  updateDiscountTicket(id: number, fields: Partial<InsertDiscountTicket>): Promise<DiscountTicket | undefined>;
  deleteDiscountTicket(id: number): Promise<boolean>;

  // Redemptions
  redeemTicket(userId: number, ticketId: number, identifier: string): Promise<RedeemResult>;
  listAllRedemptions(): Promise<RedemptionSummary[]>;
  listUserRedemptions(userId: number): Promise<MyRedemptionItem[]>;
  listAllUserRedemptions(userId: number): Promise<MyRedemptionItem[]>;
  getRedemption(id: number): Promise<Redemption | undefined>;
  markRedemptionUsed(id: number): Promise<Redemption | undefined>;
  applyRedemptionDiscount(total: number, redemptionId: number): Promise<{ discountedTotal: number; ticketName: string; ticketCode: string } | null>;
  getPaymentRequestWithRedemption(id: number): Promise<(PaymentRequest & { redemption?: Redemption }) | undefined>;

  // Chat
  getChatMessages(userId: number): Promise<ChatMessage[]>;
  sendChatMessage(userId: number, senderType: "customer" | "admin", content: string): Promise<ChatMessage>;
  markChatReadByAdmin(userId: number): Promise<void>;
  markChatReadByCustomer(userId: number): Promise<void>;
  listChatThreads(): Promise<{ userId: number; username: string; lastMessage: ChatMessage; unreadByAdmin: number }[]>;
  getAdminUnreadCount(): Promise<number>;
}

function generateReferenceCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(ilike(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { isAdmin?: boolean }): Promise<User> {
    const normalized = { ...insertUser, username: insertUser.username.toLowerCase() };
    const [user] = await db.insert(users).values(normalized).returning();
    return user;
  }

  async setUserAdmin(id: number, isAdmin: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPoints(id: number, points: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ points })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, fields: Partial<InsertProduct>): Promise<Product | undefined> {
    if (Object.keys(fields).length === 0) {
      return await this.getProduct(id);
    }
    const [updated] = await db
      .update(products)
      .set(fields)
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(transactions.createdAt);
  }

  async getSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(settings).where(eq(settings.key, key));
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  async createPaymentRequest(input: {
    userId: number;
    productId: number;
    amount: number;
    pointsToEarn: number;
    selectedAddOns?: string;
    redemptionId?: number;
    notes?: string;
  }): Promise<PaymentRequest> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const referenceCode = generateReferenceCode();
      try {
        const [row] = await db
          .insert(paymentRequests)
          .values({
            userId: input.userId,
            productId: input.productId,
            amount: input.amount,
            pointsToEarn: input.pointsToEarn,
            selectedAddOns: input.selectedAddOns ?? "[]",
            redemptionId: input.redemptionId,
            notes: input.notes ?? "",
            referenceCode,
            status: "pending",
          })
          .returning();
        return row;
      } catch (err: any) {
        if (attempt === 4) throw err;
      }
    }
    throw new Error("Could not generate a unique reference code");
  }

  async getPaymentRequest(id: number): Promise<PaymentRequest | undefined> {
    const [row] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
    return row;
  }

  async getPendingPaymentRequest(userId: number): Promise<PaymentRequest | undefined> {
    const [row] = await db
      .select()
      .from(paymentRequests)
      .where(and(eq(paymentRequests.userId, userId), eq(paymentRequests.status, "pending")))
      .orderBy(desc(paymentRequests.createdAt))
      .limit(1);
    return row;
  }

  async updatePaymentRequestProof(id: number, proofImageUrl: string): Promise<PaymentRequest | undefined> {
    const [row] = await db
      .update(paymentRequests)
      .set({ proofImageUrl })
      .where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending")))
      .returning();
    return row;
  }

  async listPendingPaymentRequests(): Promise<PendingPaymentSummary[]> {
    const rows = await db
      .select({
        request: paymentRequests,
        username: users.username,
        productName: products.name,
      })
      .from(paymentRequests)
      .leftJoin(users, eq(users.id, paymentRequests.userId))
      .leftJoin(products, eq(products.id, paymentRequests.productId))
      .where(eq(paymentRequests.status, "pending"))
      .orderBy(desc(paymentRequests.createdAt));

    return rows.map((r) => ({
      request: r.request,
      username: r.username ?? "(unknown)",
      productName: r.productName ?? "(deleted product)",
    }));
  }

  async getPurchaseSummary(): Promise<PurchaseSummary> {
    const rows = await db
      .select({
        productId: transactions.productId,
        productName: products.name,
      })
      .from(transactions)
      .leftJoin(products, eq(products.id, transactions.productId));

    const counts = new Map<number, { productName: string; purchaseCount: number }>();
    for (const row of rows) {
      const current = counts.get(row.productId);
      if (current) {
        current.purchaseCount += 1;
      } else {
        counts.set(row.productId, {
          productName: row.productName ?? "(deleted product)",
          purchaseCount: 1,
        });
      }
    }

    return {
      totalPurchases: rows.length,
      products: Array.from(counts.entries())
        .map(([productId, value]) => ({ productId, ...value }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount || a.productName.localeCompare(b.productName)),
    };
  }

  async resolvePaymentRequest(
    id: number,
    action: "confirm" | "reject",
  ): Promise<ResolvePaymentResult> {
    const existing = await this.getPaymentRequest(id);
    if (!existing) throw new Error("Payment request not found");
    if (existing.status !== "pending") throw new Error(`Payment is already ${existing.status}`);

    if (action === "reject") {
      const [updated] = await db
        .update(paymentRequests)
        .set({ status: "rejected" })
        .where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending")))
        .returning();
      if (!updated) throw new Error("Payment request was already resolved");
      return { request: updated, newPointsTotal: null };
    }

    const user = await this.getUser(existing.userId);
    if (!user) throw new Error("Customer no longer exists");

    const transaction = await this.createTransaction({
      userId: existing.userId,
      productId: existing.productId,
      amount: existing.amount,
      pointsEarned: existing.pointsToEarn,
      selectedAddOns: existing.selectedAddOns ?? "[]",
      notes: existing.notes ?? "",
    });

    const updatedUser = await this.updateUserPoints(
      user.id,
      user.points + existing.pointsToEarn,
    );

    const [updatedRequest] = await db
      .update(paymentRequests)
      .set({ status: "confirmed", transactionId: transaction.id })
      .where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending")))
      .returning();

    if (!updatedRequest) {
      const refetched = await this.getPaymentRequest(id);
      return { request: refetched!, newPointsTotal: updatedUser.points };
    }

    return { request: updatedRequest, newPointsTotal: updatedUser.points };
  }

  // ── Discount tickets ──────────────────────────────────────────────────────

  async listDiscountTickets(activeOnly = false): Promise<DiscountTicket[]> {
    const rows = await db
      .select()
      .from(discountTickets)
      .orderBy(desc(discountTickets.createdAt));
    return activeOnly ? rows.filter((t) => t.isActive) : rows;
  }

  async getDiscountTicket(id: number): Promise<DiscountTicket | undefined> {
    const [row] = await db.select().from(discountTickets).where(eq(discountTickets.id, id));
    return row;
  }

  async createDiscountTicket(ticket: InsertDiscountTicket): Promise<DiscountTicket> {
    const [row] = await db.insert(discountTickets).values(ticket).returning();
    return row;
  }

  async updateDiscountTicket(
    id: number,
    fields: Partial<InsertDiscountTicket>,
  ): Promise<DiscountTicket | undefined> {
    if (Object.keys(fields).length === 0) return await this.getDiscountTicket(id);
    const [updated] = await db
      .update(discountTickets)
      .set(fields)
      .where(eq(discountTickets.id, id))
      .returning();
    return updated;
  }

  async deleteDiscountTicket(id: number): Promise<boolean> {
    const result = await db.delete(discountTickets).where(eq(discountTickets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ── Redemptions ───────────────────────────────────────────────────────────

  async redeemTicket(userId: number, ticketId: number, identifier: string): Promise<RedeemResult> {
    const ticket = await this.getDiscountTicket(ticketId);
    if (!ticket) throw new Error("Ticket not found");
    if (!ticket.isActive) throw new Error("This ticket is no longer active");

    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    if (user.points < ticket.pointsCost) {
      throw new Error(
        `Insufficient points. You need ${ticket.pointsCost} pts but have ${user.points} pts.`,
      );
    }

    const [redemption] = await db
      .insert(redemptions)
      .values({
        userId,
        ticketId,
        identifier: identifier.trim(),
        pointsSpent: ticket.pointsCost,
      })
      .returning();

    const updatedUser = await this.updateUserPoints(userId, user.points - ticket.pointsCost);

    return { redemption, ticket, newPointsTotal: updatedUser.points };
  }

  async listAllRedemptions(): Promise<RedemptionSummary[]> {
    const rows = await db
      .select({
        redemption: redemptions,
        username: users.username,
        ticketName: discountTickets.name,
        ticketCode: discountTickets.code,
      })
      .from(redemptions)
      .leftJoin(users, eq(users.id, redemptions.userId))
      .leftJoin(discountTickets, eq(discountTickets.id, redemptions.ticketId))
      .orderBy(desc(redemptions.redeemedAt));

    return rows.map((r) => ({
      redemption: r.redemption,
      username: r.username ?? "(unknown)",
      ticketName: r.ticketName ?? "(deleted ticket)",
      ticketCode: r.ticketCode ?? "",
    }));
  }

  async listUserRedemptions(userId: number): Promise<MyRedemptionItem[]> {
    const rows = await db
      .select({
        redemption: redemptions,
        ticket: discountTickets,
      })
      .from(redemptions)
      .leftJoin(discountTickets, eq(discountTickets.id, redemptions.ticketId))
      .where(and(eq(redemptions.userId, userId), eq(redemptions.isUsed, false)))
      .orderBy(desc(redemptions.redeemedAt));

    return rows
      .filter((r) => r.ticket != null)
      .map((r) => ({ redemption: r.redemption, ticket: r.ticket! }));
  }

  async listAllUserRedemptions(userId: number): Promise<MyRedemptionItem[]> {
    const rows = await db
      .select({
        redemption: redemptions,
        ticket: discountTickets,
      })
      .from(redemptions)
      .leftJoin(discountTickets, eq(discountTickets.id, redemptions.ticketId))
      .where(eq(redemptions.userId, userId))
      .orderBy(desc(redemptions.redeemedAt));

    return rows
      .filter((r) => r.ticket != null)
      .map((r) => ({ redemption: r.redemption, ticket: r.ticket! }));
  }

  async getRedemption(id: number): Promise<Redemption | undefined> {
    const [row] = await db.select().from(redemptions).where(eq(redemptions.id, id));
    return row;
  }

  async markRedemptionUsed(id: number): Promise<Redemption | undefined> {
    const [updated] = await db
      .update(redemptions)
      .set({ isUsed: true })
      .where(eq(redemptions.id, id))
      .returning();
    return updated;
  }

  async applyRedemptionDiscount(total: number, redemptionId: number): Promise<{ discountedTotal: number; ticketName: string; ticketCode: string } | null> {
    const redemption = await this.getRedemption(redemptionId);
    if (!redemption || redemption.isUsed) return null;
    const ticket = await this.getDiscountTicket(redemption.ticketId);
    if (!ticket || !ticket.isActive) return null;

    let discounted = total;
    if (ticket.discountType === "percent") {
      discounted = Math.max(0, Math.floor(total * (100 - ticket.discountValue) / 100));
    } else {
      discounted = Math.max(0, total - ticket.discountValue);
    }
    return { discountedTotal: discounted, ticketName: ticket.name, ticketCode: ticket.code };
  }

  async getPaymentRequestWithRedemption(id: number): Promise<(PaymentRequest & { redemption?: Redemption }) | undefined> {
    const [row] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id));
    if (!row || !row.redemptionId) return row;
    const redemption = await this.getRedemption(row.redemptionId);
    return { ...row, redemption: redemption ?? undefined };
  }

  async getChatMessages(userId: number): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(chatMessages.createdAt);
  }

  async sendChatMessage(userId: number, senderType: "customer" | "admin", content: string): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values({
      userId,
      senderType,
      content,
      isReadByAdmin: senderType === "admin",
      isReadByCustomer: senderType === "customer",
    }).returning();
    return msg;
  }

  async markChatReadByAdmin(userId: number): Promise<void> {
    await db.update(chatMessages)
      .set({ isReadByAdmin: true })
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.isReadByAdmin, false)));
  }

  async markChatReadByCustomer(userId: number): Promise<void> {
    await db.update(chatMessages)
      .set({ isReadByCustomer: true })
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.isReadByCustomer, false)));
  }

  async listChatThreads(): Promise<{ userId: number; username: string; lastMessage: ChatMessage; unreadByAdmin: number }[]> {
    const allMessages = await db.select().from(chatMessages).orderBy(chatMessages.createdAt);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u.username]));

    const threadMap = new Map<number, { messages: ChatMessage[]; unread: number }>();
    for (const msg of allMessages) {
      if (!threadMap.has(msg.userId)) threadMap.set(msg.userId, { messages: [], unread: 0 });
      const t = threadMap.get(msg.userId)!;
      t.messages.push(msg);
      if (!msg.isReadByAdmin && msg.senderType === "customer") t.unread++;
    }

    const result: { userId: number; username: string; lastMessage: ChatMessage; unreadByAdmin: number }[] = [];
    for (const [uid, t] of Array.from(threadMap.entries())) {
      if (t.messages.length === 0) continue;
      result.push({
        userId: uid,
        username: userMap.get(uid) ?? `User #${uid}`,
        lastMessage: t.messages[t.messages.length - 1],
        unreadByAdmin: t.unread,
      });
    }
    // Sort by last message desc
    result.sort((a, b) => new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime());
    return result;
  }

  async getAdminUnreadCount(): Promise<number> {
    const rows = await db.select().from(chatMessages)
      .where(and(eq(chatMessages.senderType, "customer"), eq(chatMessages.isReadByAdmin, false)));
    return rows.length;
  }
}

export const storage = new DatabaseStorage();
