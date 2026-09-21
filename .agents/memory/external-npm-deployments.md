---
name: External npm deployments
description: Dependency lockfiles generated in Replit can contain private registry URLs that external CI cannot resolve.
---

Lockfiles used outside Replit must resolve packages through a public npm registry; Replit-internal package-firewall URLs are not reachable from services such as Render.

**Why:** Replit's package setup can write internal tarball URLs into package-lock.json. A clean external install then fails with ENOTFOUND before the application build starts.

**How to apply:** Before an external deployment, search package-lock.json for replit.internal or package-firewall.replit.internal, replace those resolutions with public npm registry URLs, and verify with a clean npm ci.