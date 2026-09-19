import path from "node:path";
import type { Express, NextFunction, Request, Response } from "express";
import express from "express";

export type ProductionWebOptions = {
  webRoot?: string;
};

export function productionWebRoot(cwd = process.cwd()): string {
  return path.resolve(cwd, "artifacts/seo-engine/dist/public");
}

export function mountProductionWeb(
  app: Express,
  options: ProductionWebOptions = {},
): void {
  const webRoot = options.webRoot ?? productionWebRoot();
  const indexPath = path.join(webRoot, "index.html");

  app.use(express.static(webRoot, { index: false, fallthrough: true }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/api" || req.path.startsWith("/api/")) return next();
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    return res.sendFile(indexPath, (error) =>
      error ? next(error) : undefined,
    );
  });
}
