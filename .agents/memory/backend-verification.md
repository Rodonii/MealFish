---
name: Backend verification
description: Workflow behavior to remember when validating server-side changes in this project.
---

Server-side route and storage changes require restarting the `Start application` workflow before API verification. Client files hot-reload, but the running Express process does not reliably pick up backend edits through client HMR.

**Why:** Verifying a new API route before restarting can hit the Vite fallback page instead of the updated Express handler and produce a misleading success status.

**How to apply:** After backend edits, restart `Start application`, then verify the API response and workflow logs before checking the UI.