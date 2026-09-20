import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { products } from "@shared/schema";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeBase = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      cb(null, `${Date.now()}-${safeBase}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed initial products if none exist
  await seedProducts();

  // Helper: only allow admins through
  const requireAdmin = async (req: any, res: any, next: any) => {
    const userIdHeader = req.header("x-user-id");
    const userId = userIdHeader ? Number(userIdHeader) : NaN;
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Login required" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Login required" });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ message: "Only admins can do that" });
    }
    next();
  };

  // Users
  app.post(api.users.login.path, async (req, res) => {
    try {
      const input = api.users.login.input.parse(req.body);
      const normalizedUsername = input.username.toLowerCase();
      const isAdminUsername = normalizedUsername === "admin";
      let user = await storage.getUserByUsername(normalizedUsername);

      if (!user) {
        return res.status(401).json({ message: "User not found. Please sign up first." });
      }
      if (user.password !== input.password) {
        return res.status(401).json({ message: "Invalid password" });
      }
      // Promote the special "admin" username if it isn't admin yet
      if (isAdminUsername && !user.isAdmin) {
        user = await storage.setUserAdmin(user.id, true);
      }

      res.status(200).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.users.register.path, async (req, res) => {
    try {
      const input = api.users.register.input.parse(req.body);
      const normalizedUsername = input.username.toLowerCase();
      const existing = await storage.getUserByUsername(normalizedUsername);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
      const user = await storage.createUser({
        username: input.username,
        password: input.password,
        isAdmin: normalizedUsername === "admin",
      } as any);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  });

  // Serve uploaded images
  app.use("/uploads", express.static(uploadsDir));

  // Image upload (multipart) - admin only
  app.post(api.products.upload.path, requireAdmin, upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const allProducts = await storage.getProducts();
    res.json(allProducts);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  });

  app.post(api.products.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.products.update.path, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "Invalid product id" });
      }
      const input = api.products.update.input.parse(req.body);
      const updated = await storage.updateProduct(id, input);
      if (!updated) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Settings (branding & payment)
  app.get(api.settings.get.path, async (_req, res) => {
    const [logoUrl, paymentQrUrl, facebookUrl, instagramUrl, tiktokUrl, aboutText] = await Promise.all([
      storage.getSetting("logoUrl"),
      storage.getSetting("paymentQrUrl"),
      storage.getSetting("facebookUrl"),
      storage.getSetting("instagramUrl"),
      storage.getSetting("tiktokUrl"),
      storage.getSetting("aboutText"),
    ]);
    res.json({ logoUrl, paymentQrUrl, facebookUrl, instagramUrl, tiktokUrl, aboutText });
  });

  app.post(api.settings.setLogo.path, requireAdmin, async (req, res) => {
    try {
      const input = api.settings.setLogo.input.parse(req.body);
      await storage.setSetting("logoUrl", input.logoUrl);
      res.json({ logoUrl: input.logoUrl });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.settings.setPaymentQr.path, requireAdmin, async (req, res) => {
    try {
      const input = api.settings.setPaymentQr.input.parse(req.body);
      await storage.setSetting("paymentQrUrl", input.paymentQrUrl);
      res.json({ paymentQrUrl: input.paymentQrUrl });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.settings.setSocial.path, requireAdmin, async (req, res) => {
    try {
      const input = api.settings.setSocial.input.parse(req.body);
      if (input.facebookUrl !== undefined) await storage.setSetting("facebookUrl", input.facebookUrl);
      if (input.instagramUrl !== undefined) await storage.setSetting("instagramUrl", input.instagramUrl);
      if (input.tiktokUrl !== undefined) await storage.setSetting("tiktokUrl", input.tiktokUrl);
      if (input.aboutText !== undefined) await storage.setSetting("aboutText", input.aboutText);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Transactions
  app.post(api.transactions.purchase.path, async (req, res) => {
    try {
      const input = api.transactions.purchase.input.parse(req.body);
      
      const user = await storage.getUser(input.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const product = await storage.getProduct(input.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Calculate points: 0.50 points per peso (i.e. 100 PHP × 0.50 = 50 pts)
      const pointsEarned = Math.floor((product.price / 100) * 0.50);

      const transaction = await storage.createTransaction({
        userId: user.id,
        productId: product.id,
        amount: product.price,
        pointsEarned,
        notes: "",
      });

      const updatedUser = await storage.updateUserPoints(user.id, user.points + pointsEarned);

      res.status(201).json({
        success: true,
        transaction,
        newPointsTotal: updatedUser.points,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.transactions.listUserTransactions.path, async (req, res) => {
    const transactions = await storage.getUserTransactions(Number(req.params.id));
    res.json(transactions);
  });

  // Helper: identify the logged-in customer from the x-user-id header
  const requireUser = async (req: any, res: any, next: any) => {
    const userIdHeader = req.header("x-user-id");
    const userId = userIdHeader ? Number(userIdHeader) : NaN;
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Login required" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Login required" });
    }
    req.currentUser = user;
    next();
  };

  // ---- Payment requests (admin-confirmed e-wallet flow) ----

  // List pending requests (admin only). MUST be registered before "/:id" routes.
  app.get(api.payments.listPending.path, requireAdmin, async (_req, res) => {
    const pending = await storage.listPendingPaymentRequests();
    res.json(pending);
  });

  // Customer restores the one payment they already started after a refresh/navigation.
  app.get(api.payments.minePending.path, requireUser, async (req: any, res) => {
    const request = await storage.getPendingPaymentRequest(req.currentUser.id);
    if (!request) {
      return res.json(null);
    }

    const product = await storage.getProduct(request.productId);
    res.json({ request, product: product ?? null });
  });

  // Purchase totals are private admin reporting data.
  app.get(api.payments.summary.path, requireAdmin, async (_req, res) => {
    const summary = await storage.getPurchaseSummary();
    res.json(summary);
  });

  // Customer creates a new pending payment request
  app.post(api.payments.create.path, requireUser, async (req: any, res) => {
    try {
      const input = api.payments.create.input.parse(req.body);
      const existingPending = await storage.getPendingPaymentRequest(req.currentUser.id);
      if (existingPending) {
        return res.status(409).json({
          message: "You already have a pending purchase. Finish it before starting another.",
          requestId: existingPending.id,
        });
      }

      const product = await storage.getProduct(input.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Parse the product's add-on catalog and validate any selected ones
      // against it. Each selected add-on must match a catalog entry by
      // name + price (we don't trust the client to set its own price).
      let catalog: Array<{ name: string; price: number }> = [];
      try {
        const parsed = JSON.parse(product.addOns || "[]");
        if (Array.isArray(parsed)) {
          catalog = parsed
            .filter((a: any) => a && typeof a.name === "string" && typeof a.price === "number")
            .map((a: any) => ({ name: a.name, price: Math.max(0, Math.floor(a.price)) }));
        }
      } catch {
        catalog = [];
      }

      const validatedAddOns: Array<{ name: string; price: number }> = [];
      for (const selected of input.addOns ?? []) {
        const match = catalog.find(
          (c) => c.name === selected.name && c.price === selected.price,
        );
        if (!match) {
          return res.status(400).json({
            message: `Add-on "${selected.name}" is not available for this product.`,
          });
        }
        validatedAddOns.push({ name: match.name, price: match.price });
      }

      let addOnTotal = validatedAddOns.reduce((sum, a) => sum + a.price, 0);
      let total = product.price + addOnTotal;

      // Apply ticket discount if redemptionId provided
      let redemptionId: number | undefined;
      if (input.redemptionId) {
        const redemption = await storage.getRedemption(input.redemptionId);
        if (!redemption || redemption.userId !== req.currentUser.id || redemption.isUsed) {
          return res.status(400).json({ message: "Invalid or already-used ticket" });
        }
        const ticket = await storage.getDiscountTicket(redemption.ticketId);
        if (!ticket || !ticket.isActive) {
          return res.status(400).json({ message: "Ticket is no longer active" });
        }
        const discount = await storage.applyRedemptionDiscount(total, input.redemptionId);
        if (!discount) {
          return res.status(400).json({ message: "Could not apply ticket discount" });
        }
        total = discount.discountedTotal;
        redemptionId = input.redemptionId;
      }

      const pointsToEarn = Math.floor((total / 100) * 0.50);

      const request = await storage.createPaymentRequest({
        userId: req.currentUser.id,
        productId: product.id,
        amount: total,
        pointsToEarn,
        selectedAddOns: JSON.stringify(validatedAddOns),
        redemptionId,
        notes: input.notes ?? "",
      });
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  // Customer uploads payment proof screenshot
  app.post("/api/payments/:id/proof", requireUser, upload.single("proof"), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const id = Number(req.params.id);
    const existing = await storage.getPaymentRequest(id);
    if (!existing) {
      return res.status(404).json({ message: "Payment request not found" });
    }
    if (existing.userId !== req.currentUser.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    if (existing.status !== "pending") {
      return res.status(400).json({ message: "Payment is already resolved" });
    }
    const proofImageUrl = `/uploads/${req.file.filename}`;
    const updated = await storage.updatePaymentRequestProof(id, proofImageUrl);
    res.json({ proofImageUrl: updated?.proofImageUrl });
  });

  // Customer (or admin) polls payment status
  app.get(api.payments.status.path, requireUser, async (req: any, res) => {
    const id = Number(req.params.id);
    const request = await storage.getPaymentRequest(id);
    if (!request) {
      return res.status(404).json({ message: "Payment request not found" });
    }
    if (request.userId !== req.currentUser.id && !req.currentUser.isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }
    let newPointsTotal: number | null = null;
    if (request.status === "confirmed") {
      const owner = await storage.getUser(request.userId);
      newPointsTotal = owner?.points ?? null;
    }
    res.json({ request, newPointsTotal });
  });

  app.post(api.payments.confirm.path, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await storage.resolvePaymentRequest(id, "confirm");
      // If a ticket was applied, mark it as consumed
      if (result.request.redemptionId) {
        await storage.markRedemptionUsed(result.request.redemptionId);
      }
      res.json(result.request);
    } catch (err: any) {
      const message = err?.message || "Could not confirm payment";
      const status = message.includes("not found") ? 404 : 400;
      res.status(status).json({ message });
    }
  });

  app.post(api.payments.reject.path, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await storage.resolvePaymentRequest(id, "reject");
      res.json(result.request);
    } catch (err: any) {
      const message = err?.message || "Could not reject payment";
      const status = message.includes("not found") ? 404 : 400;
      res.status(status).json({ message });
    }
  });

  // ── Discount Tickets ──────────────────────────────────────────────────────

  // GET /api/tickets — active tickets for customers; all for admin
  app.get(api.tickets.list.path, requireUser, async (req: any, res) => {
    const activeOnly = !req.currentUser.isAdmin;
    const tickets = await storage.listDiscountTickets(activeOnly);
    res.json(tickets);
  });

  // POST /api/tickets — admin creates a ticket
  app.post(api.tickets.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.tickets.create.input.parse(req.body);
      const ticket = await storage.createDiscountTicket({
        ...input,
        description: input.description ?? "",
        isActive: input.isActive ?? true,
      });
      res.status(201).json(ticket);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      const msg = (err as any)?.message || "Could not create ticket";
      const status = msg.includes("unique") || msg.includes("duplicate") ? 400 : 500;
      res.status(status).json({ message: msg.includes("unique") ? "That code is already in use. Choose a different one." : msg });
    }
  });

  // PATCH /api/tickets/:id — admin updates a ticket
  app.patch(api.tickets.update.path, requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ticket id" });
      const input = api.tickets.update.input.parse(req.body);
      const updated = await storage.updateDiscountTicket(id, input as any);
      if (!updated) return res.status(404).json({ message: "Ticket not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      const msg = (err as any)?.message || "Could not update ticket";
      res.status(msg.includes("unique") ? 400 : 500).json({
        message: msg.includes("unique") ? "That code is already in use. Choose a different one." : msg,
      });
    }
  });

  // DELETE /api/tickets/:id — admin deletes a ticket
  app.delete(api.tickets.delete.path, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ticket id" });
    const ok = await storage.deleteDiscountTicket(id);
    if (!ok) return res.status(404).json({ message: "Ticket not found" });
    res.json({ success: true });
  });

  // GET /api/tickets/redemptions — admin sees all redemptions
  // NOTE: this must be registered BEFORE /api/tickets/:id/redeem to avoid path conflicts
  app.get(api.tickets.listRedemptions.path, requireAdmin, async (_req, res) => {
    const list = await storage.listAllRedemptions();
    res.json(list);
  });

  // GET /api/tickets/available — customer sees own unused redemptions (for applying at payment)
  app.get(api.tickets.available.path, requireUser, async (req: any, res) => {
    const list = await storage.listUserRedemptions(req.currentUser.id);
    res.json(list);
  });

  // GET /api/tickets/my-redemptions — customer sees own redemptions (all, including used)
  app.get(api.tickets.myRedemptions.path, requireUser, async (req: any, res) => {
    const list = await storage.listAllUserRedemptions(req.currentUser.id);
    res.json(list);
  });

  // POST /api/tickets/:id/redeem — customer redeems a ticket
  app.post(api.tickets.redeem.path, requireUser, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid ticket id" });
      const input = api.tickets.redeem.input.parse(req.body);
      const result = await storage.redeemTicket(req.currentUser.id, id, input.identifier);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      const msg = (err as any)?.message || "Could not redeem ticket";
      const status = msg.includes("not found") ? 404 : 400;
      res.status(status).json({ message: msg });
    }
  });

  // ---- Chat ----
  // Customer: get own messages (marks as read by customer)
  app.get("/api/chat/messages", async (req, res) => {
    const userId = parseInt(req.header("x-user-id") || "0");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const messages = await storage.getChatMessages(userId);
    await storage.markChatReadByCustomer(userId);
    res.json(messages);
  });

  // Customer: send a message
  app.post("/api/chat/messages", async (req, res) => {
    const userId = parseInt(req.header("x-user-id") || "0");
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Content required" });
    }
    const msg = await storage.sendChatMessage(userId, "customer", content.trim());
    res.json(msg);
  });

  // Admin: list all threads
  app.get("/api/chat/threads", requireAdmin, async (_req, res) => {
    const threads = await storage.listChatThreads();
    res.json(threads);
  });

  // Admin: get thread messages for a user (marks as read by admin)
  app.get("/api/chat/threads/:userId", requireAdmin, async (req, res) => {
    const uid = parseInt(req.params.userId);
    if (!uid) return res.status(400).json({ message: "Invalid userId" });
    const messages = await storage.getChatMessages(uid);
    await storage.markChatReadByAdmin(uid);
    res.json(messages);
  });

  // Admin: reply to a user thread
  app.post("/api/chat/threads/:userId/reply", requireAdmin, async (req, res) => {
    const uid = parseInt(req.params.userId);
    if (!uid) return res.status(400).json({ message: "Invalid userId" });
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Content required" });
    }
    const msg = await storage.sendChatMessage(uid, "admin", content.trim());
    res.json(msg);
  });

  // Admin: get unread count
  app.get("/api/chat/unread", requireAdmin, async (_req, res) => {
    const count = await storage.getAdminUnreadCount();
    res.json({ count });
  });

  return httpServer;
}

async function seedProducts() {
  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    const initialProducts = [
      {
        name: "Premium Coffee Beans",
        description: "A 1lb bag of our signature dark roast.",
        price: 1599,
        imageUrl: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=500&h=500&fit=crop",
        ingredients: JSON.stringify(["100% Arabica Coffee Beans", "Roasted to perfection"]),
        nutrition: JSON.stringify({ calories: 0, protein: "0g", carbs: "0g", fat: "0g", caffeine: "95mg per cup" }),
      },
      {
        name: "Ceramic Mug",
        description: "A beautiful, handmade 12oz ceramic coffee mug.",
        price: 2400,
        imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&h=500&fit=crop",
        ingredients: JSON.stringify(["Ceramic", "Food-safe glaze", "Microwave safe"]),
        nutrition: JSON.stringify({ material: "Premium Ceramic", capacity: "12oz", weight: "380g" }),
      },
      {
        name: "Canvas Tote Bag",
        description: "Durable canvas tote bag for your everyday needs.",
        price: 1850,
        imageUrl: "https://images.unsplash.com/photo-1597484662317-c8e1bdc604be?w=500&h=500&fit=crop",
        ingredients: JSON.stringify(["100% Canvas Cotton", "Reinforced handles", "Machine washable"]),
        nutrition: JSON.stringify({ material: "Canvas", capacity: "40L", weight: "250g", dimensions: "40x35x20cm" }),
      }
    ];

    await db.insert(products).values(initialProducts);
  }
}
