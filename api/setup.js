import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "no DATABASE_URL" });
    }

    const sql = neon(process.env.DATABASE_URL);

    await sql`
      CREATE TABLE IF NOT EXISTS decodes (
        id SERIAL PRIMARY KEY,
        input_1 TEXT NOT NULL,
        input_2 TEXT NOT NULL,
        input_3 TEXT NOT NULL,
        raw_output TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
