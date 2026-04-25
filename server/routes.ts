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
      const isAdminUsername = input.username.toLowerCase() === "admin";
      let user = await storage.getUserByUsername(input.username);

      if (!user) {
        user = await storage.createUser({
          username: input.username,
          password: input.password, // In a real app, hash this!
          isAdmin: isAdminUsername,
        } as any);
      } else {
        if (user.password !== input.password) {
          return res.status(401).json({ message: "Invalid password" });
        }
        // Promote the special "admin" username if it isn't admin yet
        if (isAdminUsername && !user.isAdmin) {
          user = await storage.setUserAdmin(user.id, true);
        }
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

      // Calculate points (e.g., 5 points per 100 units of currency)
      const pointsEarned = Math.floor(product.price / 100) * 5;

      const transaction = await storage.createTransaction({
        userId: user.id,
        productId: product.id,
        amount: product.price,
        pointsEarned,
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
