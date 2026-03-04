// api/auth/send.js
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { randomUUID } from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const { email, decode } = req.body;

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "invalid email" });
  }

  const trimmedEmail = email.trim().toLowerCase();

  const sql = neon(process.env.DATABASE_URL);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = process.env.BASE_URL || "https://miscover.com";

  try {
    await sql`INSERT INTO users (email) VALUES (${trimmedEmail}) ON CONFLICT (email) DO NOTHING`;

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const decodeData = decode ? JSON.stringify(decode) : null;

    await sql`INSERT INTO magic_links (email, token, expires_at, decode_data) VALUES (${trimmedEmail}, ${token}, ${expiresAt.toISOString()}, ${decodeData})`;

    const link = `${baseUrl}/api/auth/verify?token=${token}`;

    await resend.emails.send({
      from: "miscover <m@miscover.com>",
      to: trimmedEmail,
      subject: "your link",
      text: `${link}\n\n— miscover.com`,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("auth send error:", e);
    return res.status(500).json({ error: "send failed" });
  }
}
