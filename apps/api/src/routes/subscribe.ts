import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getDb } from "../db/client";

export const subscribeRouter = Router();

const BodySchema = z.object({
  email:  z.string().email().max(254),
  source: z.string().max(50).optional().default("homepage"),
});

// ─── POST /api/subscribe ─────────────────────────────────────────────────────

subscribeRouter.post("/", async (req: Request, res: Response) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email address." });
  }

  const { email, source } = parsed.data;
  const db = getDb();

  const { error } = await db
    .from("email_subscribers")
    .upsert({ email, source }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    // Log but don't expose internal details
    console.error("Subscribe error:", error.message);
    return res.status(500).json({ error: "Subscription failed. Please try again." });
  }

  return res.json({ ok: true });
});
