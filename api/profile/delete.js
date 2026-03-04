// api/profile/delete.js
import { neon } from "@neondatabase/serverless";
import { getUserIdFromCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const secret = process.env.AUTH_SECRET;
  const userId = getUserIdFromCookie(req.headers.cookie, secret);

  if (!userId) {
    return res.status(401).json({ error: "not authenticated" });
  }

  const { decodeId } = req.body;

  if (!decodeId) {
    return res.status(400).json({ error: "bad request" });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    const rows = await sql`SELECT id FROM saved_decodes WHERE id = ${decodeId} AND user_id = ${userId}`;
    if (rows.length === 0) {
      return res.status(404).json({ error: "not found" });
    }

    await sql`DELETE FROM saved_decodes WHERE id = ${decodeId} AND user_id = ${userId}`;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("profile delete error:", e);
    return res.status(500).json({ error: "delete failed" });
  }
}
