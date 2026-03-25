/**
 * CedarX Express API server.
 *
 * Mounts all route handlers and global middleware.
 * The server is created here but started in index.ts so it's testable
 * independently of the poller loop.
 */

import "express-async-errors";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { CORS_ORIGINS } from "./config";
import { assetsRouter }  from "./routes/assets";
import { listingsRouter } from "./routes/listings";
import { statsRouter }    from "./routes/stats";
import { seaportRouter }  from "./routes/seaport";
import { openApiSpec }   from "./openapi";

export function createServer() {
    const app = express();

    // ── Middleware ────────────────────────────────────────────────────────────

    app.use(cors({ origin: CORS_ORIGINS, methods: ["GET", "POST"], credentials: false }));
    app.use(express.json());

    // Request logging (lightweight — no external dependency)
    app.use((req: Request, _res: Response, next: NextFunction) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });

    // ── Health check ──────────────────────────────────────────────────────────

    app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

    // ── API routes ────────────────────────────────────────────────────────────

    app.use("/api/assets",   assetsRouter);
    app.use("/api/listings", listingsRouter);
    app.use("/api/stats",    statsRouter);
    app.use("/api/seaport",  seaportRouter);
    // Note: /api/protocols is mounted under statsRouter at /api/stats/protocols
    // to keep the route handler count minimal. The frontend calls
    // GET /api/stats/protocols — no URL change needed.

    // ── OpenAPI / Swagger UI ──────────────────────────────────────────────────

    // Serve the raw OpenAPI JSON spec
    app.get("/api/docs/openapi.json", (_req, res) => {
        res.json(openApiSpec);
    });

    // Serve Swagger UI via CDN — no npm package required
    app.get("/api/docs", (_req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CedarX API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/api/docs/openapi.json",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
      deepLinking: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`);
    });

    // ── 404 ──────────────────────────────────────────────────────────────────

    app.use((_req, res) => res.status(404).json({ error: "Not found" }));

    // ── Error handler ─────────────────────────────────────────────────────────
    // express-async-errors patches async route handlers so thrown errors land here.

    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        console.error("Unhandled error:", err);
        const message = err instanceof Error ? err.message : "Internal server error";
        res.status(500).json({ error: message });
    });

    return app;
}
