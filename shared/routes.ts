import { z } from 'zod';
import { users, products, transactions, paymentRequests } from './schema';

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
      }),
      responses: {
        201: z.custom<typeof paymentRequests.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
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
