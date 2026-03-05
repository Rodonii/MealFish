import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { db } from "./db";
import { products } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed initial products if none exist
  await seedProducts();

  // Users
  app.post(api.users.login.path, async (req, res) => {
    try {
      const input = api.users.login.input.parse(req.body);
      let user = await storage.getUserByUsername(input.username);
      
      if (!user) {
        user = await storage.createUser({ username: input.username });
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

      // Calculate points (e.g., 1 point per $1 / 100 cents)
      const pointsEarned = Math.floor(product.price / 100);

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
        price: 1599, // $15.99
        imageUrl: "https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=500&h=500&fit=crop",
      },
      {
        name: "Ceramic Mug",
        description: "A beautiful, handmade 12oz ceramic coffee mug.",
        price: 2400, // $24.00
        imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&h=500&fit=crop",
      },
      {
        name: "Canvas Tote Bag",
        description: "Durable canvas tote bag for your everyday needs.",
        price: 1850, // $18.50
        imageUrl: "https://images.unsplash.com/photo-1597484662317-c8e1bdc604be?w=500&h=500&fit=crop",
      }
    ];

    await db.insert(products).values(initialProducts);
  }
}
