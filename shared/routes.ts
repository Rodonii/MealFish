import { z } from 'zod';
import { users, products, transactions, paymentRequests, discountTickets, redemptions } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  users: {
    login: {
      method: 'POST' as const,
      path: '/api/users/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: z.object({ message: z.string() }),
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/users/register' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        409: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.number().int().positive(),
        imageUrl: z.string().min(1),
        ingredients: z.string().optional().default(""),
        nutrition: z.string().optional().default(""),
        addOns: z.string().optional().default("[]"),
      }),
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id' as const,
      input: z.object({
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        price: z.number().int().positive().optional(),
        imageUrl: z.string().min(1).optional(),
        ingredients: z.string().optional(),
        nutrition: z.string().optional(),
        addOns: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/products/upload' as const,
      responses: {
        200: z.object({ url: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings' as const,
      responses: {
        200: z.object({
          logoUrl: z.string().nullable(),
          paymentQrUrl: z.string().nullable(),
        }),
      },
    },
    setLogo: {
      method: 'POST' as const,
      path: '/api/settings/logo' as const,
      input: z.object({ logoUrl: z.string().min(1) }),
      responses: {
        200: z.object({ logoUrl: z.string() }),
        400: errorSchemas.validation,
      },
    },
    setPaymentQr: {
      method: 'POST' as const,
      path: '/api/settings/payment-qr' as const,
      input: z.object({ paymentQrUrl: z.string().min(1) }),
      responses: {
        200: z.object({ paymentQrUrl: z.string() }),
        400: errorSchemas.validation,
      },
    },
    setSocial: {
      method: 'POST' as const,
      path: '/api/settings/social' as const,
      input: z.object({
        facebookUrl: z.string().optional(),
        instagramUrl: z.string().optional(),
        tiktokUrl: z.string().optional(),
        aboutText: z.string().optional(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
  },
  transactions: {
    purchase: {
      method: 'POST' as const,
      path: '/api/transactions/purchase' as const,
      input: z.object({
        userId: z.number(),
        productId: z.number(),
      }),
      responses: {
        201: z.object({
          success: z.boolean(),
          transaction: z.custom<typeof transactions.$inferSelect>(),
          newPointsTotal: z.number(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    listUserTransactions: {
      method: 'GET' as const,
      path: '/api/users/:id/transactions' as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    }
  },
  payments: {
    create: {
      method: 'POST' as const,
      path: '/api/payments' as const,
      input: z.object({
        productId: z.number().int().positive(),
        addOns: z
          .array(z.object({ name: z.string().min(1), price: z.number().int().nonnegative() }))
          .optional()
          .default([]),
        redemptionId: z.number().int().positive().optional(),
        notes: z.string().max(200).optional().default(""),
      }),
      responses: {
        201: z.custom<typeof paymentRequests.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    minePending: {
      method: 'GET' as const,
      path: '/api/payments/mine/pending' as const,
      responses: {
        200: z.object({
          request: z.custom<typeof paymentRequests.$inferSelect>(),
          product: z.custom<typeof products.$inferSelect>().nullable(),
        }).nullable(),
      },
    },
    status: {
      method: 'GET' as const,
      path: '/api/payments/status/:id' as const,
      responses: {
        200: z.object({
          request: z.custom<typeof paymentRequests.$inferSelect>(),
          newPointsTotal: z.number().nullable(),
        }),
        404: errorSchemas.notFound,
      },
    },
    listPending: {
      method: 'GET' as const,
      path: '/api/payments/pending' as const,
      responses: {
        200: z.array(z.object({
          request: z.custom<typeof paymentRequests.$inferSelect>(),
          username: z.string(),
          productName: z.string(),
        })),
      },
    },
    confirm: {
      method: 'POST' as const,
      path: '/api/payments/:id/confirm' as const,
      responses: {
        200: z.custom<typeof paymentRequests.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    reject: {
      method: 'POST' as const,
      path: '/api/payments/:id/reject' as const,
      responses: {
        200: z.custom<typeof paymentRequests.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  tickets: {
    list: {
      method: 'GET' as const,
      path: '/api/tickets' as const,
      responses: {
        200: z.array(z.custom<typeof discountTickets.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tickets' as const,
      input: z.object({
        name: z.string().min(1),
        description: z.string().optional().default(""),
        code: z.string().min(1).max(24).regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, - and _"),
        pointsCost: z.number().int().positive(),
        discountType: z.enum(["percent", "flat"]),
        discountValue: z.number().int().positive(),
        isActive: z.boolean().optional().default(true),
      }),
      responses: {
        201: z.custom<typeof discountTickets.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tickets/:id' as const,
      input: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        code: z.string().min(1).max(24).regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, - and _").optional(),
        pointsCost: z.number().int().positive().optional(),
        discountType: z.enum(["percent", "flat"]).optional(),
        discountValue: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof discountTickets.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tickets/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    redeem: {
      method: 'POST' as const,
      path: '/api/tickets/:id/redeem' as const,
      input: z.object({
        identifier: z.string().min(1, "Please enter your name or identifier"),
      }),
      responses: {
        200: z.object({
          redemption: z.custom<typeof redemptions.$inferSelect>(),
          ticket: z.custom<typeof discountTickets.$inferSelect>(),
          newPointsTotal: z.number(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    listRedemptions: {
      method: 'GET' as const,
      path: '/api/tickets/redemptions' as const,
      responses: {
        200: z.array(z.object({
          redemption: z.custom<typeof redemptions.$inferSelect>(),
          username: z.string(),
          ticketName: z.string(),
          ticketCode: z.string(),
        })),
      },
    },
    myRedemptions: {
      method: 'GET' as const,
      path: '/api/tickets/my-redemptions' as const,
      responses: {
        200: z.array(z.object({
          redemption: z.custom<typeof redemptions.$inferSelect>(),
          ticket: z.custom<typeof discountTickets.$inferSelect>(),
        })),
      },
    },
    available: {
      method: 'GET' as const,
      path: '/api/tickets/available' as const,
      responses: {
        200: z.array(z.object({
          redemption: z.custom<typeof redemptions.$inferSelect>(),
          ticket: z.custom<typeof discountTickets.$inferSelect>(),
        })),
      },
    },
  },
  chat: {
    getMessages: {
      method: 'GET' as const,
      path: '/api/chat/messages' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.number(),
          senderType: z.string(),
          content: z.string(),
          isReadByAdmin: z.boolean(),
          isReadByCustomer: z.boolean(),
          createdAt: z.string().nullable(),
        })),
      },
    },
    sendMessage: {
      method: 'POST' as const,
      path: '/api/chat/messages' as const,
      input: z.object({ content: z.string().min(1) }),
      responses: {
        200: z.object({ id: z.number() }),
        400: z.object({ message: z.string() }),
      },
    },
    getThreads: {
      method: 'GET' as const,
      path: '/api/chat/threads' as const,
      responses: {
        200: z.array(z.object({
          userId: z.number(),
          username: z.string(),
          lastMessage: z.object({ content: z.string(), senderType: z.string(), createdAt: z.string().nullable() }),
          unreadByAdmin: z.number(),
        })),
      },
    },
    getThreadMessages: {
      method: 'GET' as const,
      path: '/api/chat/threads/:userId' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.number(),
          senderType: z.string(),
          content: z.string(),
          isReadByAdmin: z.boolean(),
          isReadByCustomer: z.boolean(),
          createdAt: z.string().nullable(),
        })),
      },
    },
    adminReply: {
      method: 'POST' as const,
      path: '/api/chat/threads/:userId/reply' as const,
      input: z.object({ content: z.string().min(1) }),
      responses: {
        200: z.object({ id: z.number() }),
        400: z.object({ message: z.string() }),
      },
    },
    getUnreadCount: {
      method: 'GET' as const,
      path: '/api/chat/unread' as const,
      responses: {
        200: z.object({ count: z.number() }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
