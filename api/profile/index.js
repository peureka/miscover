// api/profile/index.js
import { neon } from "@neondatabase/serverless";
import { getUserIdFromCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const secret = process.env.AUTH_SECRET;
  const userId = getUserIdFromCookie(req.headers.cookie, secret);

  if (!userId) {
    return res.status(401).json({ error: "not authenticated" });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const decodes = await sql`
      SELECT id, input_1, input_2, input_3, decode_text, world_items, brief_text, is_active, created_at
      FROM saved_decodes
      WHERE user_id = ${userId}
      ORDER BY is_active DESC, created_at DESC
    `;

    return res.status(200).json({ decodes });
  } catch (e) {
    console.error("profile fetch error:", e);
    return res.status(500).json({ error: "failed to load profile" });
  }
}
