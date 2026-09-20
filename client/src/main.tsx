import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(globalThis as any).__APP_API_BASE__ = import.meta.env.VITE_API_URL || "";

createRoot(document.getElementById("root")!).render(<App />);
