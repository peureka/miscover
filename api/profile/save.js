// api/profile/save.js
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

  const { inputs, decode, world, brief } = req.body;

  if (!Array.isArray(inputs) || inputs.length !== 3 || !decode) {
    return res.status(400).json({ error: "bad request" });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    await sql`UPDATE saved_decodes SET is_active = FALSE WHERE user_id = ${userId} AND is_active = TRUE`;

    await sql`INSERT INTO saved_decodes (user_id, input_1, input_2, input_3, decode_text, world_items, brief_text, is_active) VALUES (${userId}, ${inputs[0]}, ${inputs[1]}, ${inputs[2]}, ${decode}, ${world || []}, ${brief || ''}, TRUE)`;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("profile save error:", e);
    return res.status(500).json({ error: "save failed" });
  }
}
