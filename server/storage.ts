import { db } from "./db";
import {
  users,
  products,
  transactions,
  settings,
  paymentRequests,
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Transaction,
  type InsertTransaction,
  type PaymentRequest,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface PendingPaymentSummary {
  request: PaymentRequest;
  username: string;
  productName: string;
}

export interface ResolvePaymentResult {
  request: PaymentRequest;
  newPointsTotal: number | null;
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

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<Transaction[]>;

  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;

  createPaymentRequest(input: {
    userId: number;
    productId: number;
    amount: number;
    pointsToEarn: number;
  }): Promise<PaymentRequest>;
  getPaymentRequest(id: number): Promise<PaymentRequest | undefined>;
  listPendingPaymentRequests(): Promise<PendingPaymentSummary[]>;
  resolvePaymentRequest(id: number, action: "confirm" | "reject"): Promise<ResolvePaymentResult>;
}

function generateReferenceCode(): string {
  // Avoid ambiguous characters (0/O, 1/I/L)
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
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser & { isAdmin?: boolean }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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
      .orderBy(transactions.createdAt); // We might need to add asc/desc but default is fine
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
  }): Promise<PaymentRequest> {
    // Try a few times to avoid the (extremely unlikely) reference-code collision
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

  async resolvePaymentRequest(
    id: number,
    action: "confirm" | "reject",
  ): Promise<ResolvePaymentResult> {
    const existing = await this.getPaymentRequest(id);
    if (!existing) {
      throw new Error("Payment request not found");
    }
    if (existing.status !== "pending") {
      throw new Error(`Payment is already ${existing.status}`);
    }

    if (action === "reject") {
      const [updated] = await db
        .update(paymentRequests)
        .set({ status: "rejected" })
        .where(and(eq(paymentRequests.id, id), eq(paymentRequests.status, "pending")))
        .returning();
      if (!updated) throw new Error("Payment request was already resolved");
      return { request: updated, newPointsTotal: null };
    }

    // confirm: create transaction, credit points, link them
    const user = await this.getUser(existing.userId);
    if (!user) throw new Error("Customer no longer exists");

    const transaction = await this.createTransaction({
      userId: existing.userId,
      productId: existing.productId,
      amount: existing.amount,
      pointsEarned: existing.pointsToEarn,
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
      // Race: another admin already resolved it. Roll back nothing destructive
      // but report state. The transaction we created is still valid.
      const refetched = await this.getPaymentRequest(id);
      return { request: refetched!, newPointsTotal: updatedUser.points };
    }

    return { request: updatedRequest, newPointsTotal: updatedUser.points };
  }
}

export const storage = new DatabaseStorage();
