// api/auth/verify.js
import { neon } from "@neondatabase/serverless";
import { setSessionCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const { token } = req.query;
  if (!token) {
    return sendError(res, "invalid link.");
  }

  const sql = neon(process.env.DATABASE_URL);
  const baseUrl = process.env.BASE_URL || "https://miscover.com";
  const secret = process.env.AUTH_SECRET;

  try {
    // look up token
    const rows = await sql`SELECT * FROM magic_links WHERE token = ${token}`;
    const link = rows[0];

    if (!link) {
      return sendError(res, "invalid link.");
    }

    if (link.used) {
      return sendError(res, "this link was already used.");
    }

    if (new Date(link.expires_at) < new Date()) {
      return sendError(res, "this link expired. try again.");
    }

    // mark used
    await sql`UPDATE magic_links SET used = TRUE WHERE id = ${link.id}`;

    // get user
    const users = await sql`SELECT id FROM users WHERE email = ${link.email}`;
    const userId = users[0]?.id;

    if (!userId) {
      return sendError(res, "something broke. try again.");
    }

    // save pending decode if present
    if (link.decode_data) {
      const d = typeof link.decode_data === 'string' ? JSON.parse(link.decode_data) : link.decode_data;

      // deactivate current active
      await sql`UPDATE saved_decodes SET is_active = FALSE WHERE user_id = ${userId} AND is_active = TRUE`;

      // save new decode as active
      await sql`INSERT INTO saved_decodes (user_id, input_1, input_2, input_3, decode_text, world_items, brief_text, is_active) VALUES (${userId}, ${d.inputs[0]}, ${d.inputs[1]}, ${d.inputs[2]}, ${d.decode}, ${d.world}, ${d.brief}, TRUE)`;
    }

    // set session cookie
    setSessionCookie(res, userId, secret);

    // redirect to home
    res.writeHead(302, { Location: baseUrl });
    return res.end();
  } catch (e) {
    console.error("auth verify error:", e);
    return sendError(res, "something broke. try again.");
  }
}

function sendError(res, message) {
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(
    '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>miscover</title>' +
    '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' rx=\'6\' fill=\'%231a1918\'/%3E%3Ctext x=\'16\' y=\'23\' text-anchor=\'middle\' font-family=\'Georgia,serif\' font-size=\'22\' fill=\'%23d4cfc8\'%3Em%3C/text%3E%3C/svg%3E" />' +
    "<style>@import url('https://fonts.googleapis.com/css2?family=Spectral:wght@300;400&display=swap');body{margin:0;min-height:100vh;background:#1a1918;display:flex;align-items:center;justify-content:center}</style>" +
    '</head>' +
    '<body>' +
    "<p style=\"color:#8a847b;font-family:'Spectral',Georgia,serif;font-size:13px;font-weight:300;letter-spacing:0.08em\">" +
    escapeHtml(message) +
    '</p>' +
    '</body>' +
    '</html>'
  );
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
