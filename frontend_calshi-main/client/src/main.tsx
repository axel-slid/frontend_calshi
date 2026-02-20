import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId) {
  // This will show in Vercel production console too
  console.error("❌ VITE_GOOGLE_CLIENT_ID is missing at runtime (Vercel env var not set or not redeployed).");
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={clientId || "MISSING_CLIENT_ID"}>
    <App />
  </GoogleOAuthProvider>,
);