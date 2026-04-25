# FishTil — QR-code product purchase site

A small storefront where customers scan an owner-uploaded e-wallet QR (GCash / Maya / QR Ph) to pay for a product. The store owner ("admin") confirms each payment from a Payments inbox; the customer's loyalty points are credited automatically the moment the owner confirms.

## Stack
- Frontend: React + Vite, wouter, TanStack Query v5, shadcn UI, framer-motion
- Backend: Express + multer (image uploads)
- Database: PostgreSQL via drizzle-orm
- Auth: simple username/password stored in localStorage (`scanshop_user`); `x-user-id` header on protected requests
- Admin: any user logging in as `admin` is auto-promoted to `isAdmin = true`

## Pages (client/src/pages)
- `login.tsx` — username + password, swaps in uploaded logo
- `products.tsx` — catalog grid
- `product-detail.tsx` — product info + payment flow (see below)
- `new-product.tsx` — admin only; create product with image upload
- `branding.tsx` — admin only; upload store logo + e-wallet payment QR
- `payments.tsx` — admin only; pending-payments inbox with Confirm / Reject
- `history.tsx` — customer's transaction history

## Payment flow
1. Customer opens a product → taps **Show payment QR**.
2. Frontend POSTs `/api/payments` (productId) → server creates a `payment_requests` row with status=pending, locked-in amount, and a 6-char unique `referenceCode`.
3. UI shows the owner's e-wallet QR + the amount + the reference code. It polls `GET /api/payments/status/:id` every 2.5s.
4. Owner sees the request in `/payments`, taps **I received the payment** → server atomically creates the transaction, credits the customer's points, and flips the request to `status=confirmed`.
5. The customer's polling sees `confirmed`, updates points, toasts success, and redirects to `/history`.
6. If the owner taps **Reject**, the customer sees "Payment not received" and can retry.
7. If no payment QR has been uploaded by the admin, the product page falls back to the old "Simulate Scan & Purchase" demo button.

## Schema (`shared/schema.ts`)
- `users` — id, username (unique), password, points, isAdmin
- `products` — id, name, description, price (cents), imageUrl, ingredients (JSON string), nutrition (JSON string)
- `transactions` — id, userId, productId, amount, pointsEarned, createdAt
- `settings` — key/value (`logoUrl`, `paymentQrUrl`)
- `payment_requests` — id, userId, productId, amount, pointsToEarn, referenceCode (unique), status (`pending|confirmed|rejected`), transactionId (set on confirm), createdAt

## Important behaviors
- Points formula: `Math.floor(price_in_cents / 100) * 5` (5 points per 100 currency units).
- All admin-only endpoints check `req.header('x-user-id')` against `users.isAdmin`.
- `apiRequest` in `client/src/lib/queryClient.ts` auto-attaches the header from localStorage.
- Uploaded files live in `uploads/` and are served from `/uploads`.
- Theme toggle is in the header / mobile bottom-nav; cards use `bg-card` so text is visible in both themes. The QR container is intentionally `bg-white dark:bg-white` so QR codes stay scannable.

## Dev
- Single workflow `Start application` runs `npm run dev` (Express + Vite on port 5000).
- Schema changes: `npm run db:push -- --force`.
- Never edit `package.json`, `vite.config.ts`, or `server/vite.ts`.
