import type { AuthPrincipal } from "./lib/auth-foundation.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
    }
  }
}

export {};
