## Packages
react-qr-code | To generate the visual QR codes for products
date-fns | For formatting transaction dates beautifully
framer-motion | For premium page entry and interaction animations
lucide-react | Already in stack, but noting usage for iconography

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-sans)"],
}
Assuming prices are in cents and need division by 100 for display.
Assuming simple localStorage + Context for user session management given the /api/users/login behavior.
