import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const { inputs } = req.body;

  if (!Array.isArray(inputs) || inputs.length !== 3) {
    return res.status(400).json({ error: "bad request" });
  }

  const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

  if (sql) {
    sql`INSERT INTO prompt_copies (input_1, input_2, input_3) VALUES (${inputs[0]}, ${inputs[1]}, ${inputs[2]})`
      .catch((e) => console.error("prompt copy log failed:", e));
  }

  return res.status(200).json({ ok: true });
}
