# Seam 2: Saved Profiles — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add magic link auth and saved profiles so Mira can come back and her decodes are there — one active profile, history of past decodes.

**Architecture:** Minimal auth with Resend magic links, HMAC-signed httpOnly cookies (stateless sessions), Neon Postgres for persistence. Three new tables, five new API endpoints, one shared auth utility module. Profile view as a new phase in the existing single-component React app.

**Tech Stack:** React 19, Vite, Vercel serverless, Neon PostgreSQL, Resend (new dep), Node crypto (built-in)

**Design doc:** `docs/plans/2026-03-04-seam-2-saved-profiles-design.md` — 46 ACs mapped to Mira. Read this first.

**Environment variables required (add to Vercel):**
- `AUTH_SECRET` — random 64-char hex string for HMAC signing (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `RESEND_API_KEY` — from resend.com dashboard
- `BASE_URL` — `https://miscover.com`

---

### Task 1: Install dependencies and add test framework

**Files:**
- Modify: `package.json`

**Step 1: Install resend and vitest**

```bash
cd /Users/pj/Documents/Code/miscover
npm install resend
npm install -D vitest
```

**Step 2: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add resend and vitest for seam 2"
```

---

### Task 2: Create database tables

**Files:**
- Create: `api/lib/migrations/001-seam-2-auth.sql`

**Step 1: Write the migration SQL**

```sql
-- Seam 2: Users, magic links, saved decodes

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magic_links (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  decode_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_decodes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  input_1 TEXT NOT NULL,
  input_2 TEXT NOT NULL,
  input_3 TEXT NOT NULL,
  decode_text TEXT NOT NULL,
  world_items TEXT[] NOT NULL,
  brief_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_decodes_user_id ON saved_decodes(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
```

**Step 2: Run migration against Neon**

The implementer should ask the user to run this SQL in the Neon console, or run it via the Neon CLI if available.

**Step 3: Commit**

```bash
git add api/lib/migrations/
git commit -m "db: add users, magic_links, saved_decodes tables for seam 2"
```

---

### Task 3: Auth utility module (with TDD)

**Files:**
- Create: `api/lib/auth.js`
- Create: `api/lib/auth.test.js`

**Step 1: Write the failing tests**

```js
// api/lib/auth.test.js
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, getUserIdFromCookie, parseCookies } from './auth.js';

describe('signToken', () => {
  it('returns a string in format userId.signature', () => {
    const token = signToken(42, 'test-secret');
    expect(token).toMatch(/^42\..+$/);
  });

  it('produces different signatures for different secrets', () => {
    const t1 = signToken(42, 'secret-a');
    const t2 = signToken(42, 'secret-b');
    expect(t1).not.toBe(t2);
  });
});

describe('verifyToken', () => {
  it('returns userId for valid token', () => {
    const token = signToken(42, 'test-secret');
    const userId = verifyToken(token, 'test-secret');
    expect(userId).toBe(42);
  });

  it('returns null for tampered token', () => {
    const token = signToken(42, 'test-secret');
    const tampered = token.replace(/.$/, 'x');
    expect(verifyToken(tampered, 'test-secret')).toBeNull();
  });

  it('returns null for wrong secret', () => {
    const token = signToken(42, 'secret-a');
    expect(verifyToken(token, 'secret-b')).toBeNull();
  });

  it('returns null for malformed token', () => {
    expect(verifyToken('garbage', 'test-secret')).toBeNull();
    expect(verifyToken('', 'test-secret')).toBeNull();
    expect(verifyToken(null, 'test-secret')).toBeNull();
  });
});

describe('parseCookies', () => {
  it('parses cookie header string', () => {
    const cookies = parseCookies('session=abc123; other=value');
    expect(cookies.session).toBe('abc123');
    expect(cookies.other).toBe('value');
  });

  it('returns empty object for empty string', () => {
    expect(parseCookies('')).toEqual({});
    expect(parseCookies(undefined)).toEqual({});
  });
});

describe('getUserIdFromCookie', () => {
  it('extracts userId from valid session cookie', () => {
    const token = signToken(42, 'test-secret');
    const cookieHeader = `session=${token}; other=value`;
    const userId = getUserIdFromCookie(cookieHeader, 'test-secret');
    expect(userId).toBe(42);
  });

  it('returns null for missing session cookie', () => {
    expect(getUserIdFromCookie('other=value', 'test-secret')).toBeNull();
  });

  it('returns null for invalid session cookie', () => {
    expect(getUserIdFromCookie('session=garbage', 'test-secret')).toBeNull();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/pj/Documents/Code/miscover && npx vitest run api/lib/auth.test.js
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

```js
// api/lib/auth.js
import { createHmac } from 'crypto';

export function signToken(userId, secret) {
  const sig = createHmac('sha256', secret).update(String(userId)).digest('hex');
  return `${userId}.${sig}`;
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const userId = parseInt(token.slice(0, dot), 10);
  if (isNaN(userId)) return null;
  const expected = signToken(userId, secret);
  if (token !== expected) return null;
  return userId;
}

export function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );
}

export function getUserIdFromCookie(cookieHeader, secret) {
  const cookies = parseCookies(cookieHeader);
  if (!cookies.session) return null;
  return verifyToken(cookies.session, secret);
}

export function setSessionCookie(res, userId, secret) {
  const token = signToken(userId, secret);
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);
}
```

**Step 4: Run tests to verify they pass**

```bash
cd /Users/pj/Documents/Code/miscover && npx vitest run api/lib/auth.test.js
```

Expected: All 9 tests pass.

**Step 5: Commit**

```bash
git add api/lib/auth.js api/lib/auth.test.js
git commit -m "feat: auth utility module with HMAC signing — TDD"
```

---

### Task 4: POST `/api/auth/send` — send magic link

**Files:**
- Create: `api/auth/send.js`

**Step 1: Write the endpoint**

```js
// api/auth/send.js
import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import { randomUUID } from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const { email, decode } = req.body;

  // basic email validation
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "invalid email" });
  }

  const trimmedEmail = email.trim().toLowerCase();

  const sql = neon(process.env.DATABASE_URL);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = process.env.BASE_URL || "https://miscover.com";

  try {
    // create user if new
    await sql`INSERT INTO users (email) VALUES (${trimmedEmail}) ON CONFLICT (email) DO NOTHING`;

    // generate magic link
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const decodeData = decode ? JSON.stringify(decode) : null;

    await sql`INSERT INTO magic_links (email, token, expires_at, decode_data) VALUES (${trimmedEmail}, ${token}, ${expiresAt.toISOString()}, ${decodeData})`;

    // send email
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
```

**Step 2: Verify manually**

Deploy or test locally with `vercel dev`. Send a test request:

```bash
curl -X POST https://miscover.com/api/auth/send \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","decode":{"inputs":["a","b","c"],"decode":"test","world":[],"brief":"test"}}'
```

Verify: email received with magic link.

**Step 3: Commit**

```bash
git add api/auth/send.js
git commit -m "feat: POST /api/auth/send — magic link email via Resend"
```

---

### Task 5: GET `/api/auth/verify` — verify token, set cookie, redirect

**Files:**
- Create: `api/auth/verify.js`

**Step 1: Write the endpoint**

```js
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
```

**Step 2: Test the full magic link flow manually**

1. POST to `/api/auth/send` with a real email
2. Open the email, click the link
3. Verify: redirect to `/`, `session` cookie is set in browser
4. Click the link again — "this link was already used."
5. Wait 15+ mins (or manually expire in DB) — "this link expired. try again."

**Step 3: Commit**

```bash
git add api/auth/verify.js
git commit -m "feat: GET /api/auth/verify — validate magic link, set cookie, redirect"
```

---

### Task 6: GET `/api/profile` — return saved decodes

**Files:**
- Create: `api/profile/index.js`

**Step 1: Write the endpoint**

```js
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
```

**Step 2: Commit**

```bash
git add api/profile/index.js
git commit -m "feat: GET /api/profile — return saved decodes for authenticated user"
```

---

### Task 7: POST `/api/profile/save` — save decode, set as active

**Files:**
- Create: `api/profile/save.js`

**Step 1: Write the endpoint**

```js
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
    // deactivate current active
    await sql`UPDATE saved_decodes SET is_active = FALSE WHERE user_id = ${userId} AND is_active = TRUE`;

    // save new decode as active
    await sql`INSERT INTO saved_decodes (user_id, input_1, input_2, input_3, decode_text, world_items, brief_text, is_active) VALUES (${userId}, ${inputs[0]}, ${inputs[1]}, ${inputs[2]}, ${decode}, ${world || []}, ${brief || ''}, TRUE)`;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("profile save error:", e);
    return res.status(500).json({ error: "save failed" });
  }
}
```

**Step 2: Commit**

```bash
git add api/profile/save.js
git commit -m "feat: POST /api/profile/save — save decode and set as active"
```

---

### Task 8: POST `/api/profile/activate` — swap active decode

**Files:**
- Create: `api/profile/activate.js`

**Step 1: Write the endpoint**

```js
// api/profile/activate.js
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
    // verify this decode belongs to the user
    const rows = await sql`SELECT id FROM saved_decodes WHERE id = ${decodeId} AND user_id = ${userId}`;
    if (rows.length === 0) {
      return res.status(404).json({ error: "not found" });
    }

    // deactivate current active
    await sql`UPDATE saved_decodes SET is_active = FALSE WHERE user_id = ${userId} AND is_active = TRUE`;

    // activate selected
    await sql`UPDATE saved_decodes SET is_active = TRUE WHERE id = ${decodeId} AND user_id = ${userId}`;

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("profile activate error:", e);
    return res.status(500).json({ error: "activate failed" });
  }
}
```

**Step 2: Commit**

```bash
git add api/profile/activate.js
git commit -m "feat: POST /api/profile/activate — swap active decode"
```

---

### Task 9: Client — auth state and session check on mount

**Files:**
- Modify: `miscover.jsx`

**Step 1: Add auth state and profile fetch**

Add new state variables after existing ones:

```jsx
const [user, setUser] = useState(null);
const [savedDecodes, setSavedDecodes] = useState([]);
const [profileLoading, setProfileLoading] = useState(true);
```

Replace the existing `useEffect` (the autofocus one at line 12-14) with:

```jsx
useEffect(() => {
  fetch("/api/profile")
    .then((r) => {
      if (r.ok) return r.json();
      throw new Error("not authenticated");
    })
    .then((data) => {
      setUser({ authenticated: true });
      setSavedDecodes(data.decodes || []);
      setPhase("profile");
    })
    .catch(() => {
      setUser(null);
      setPhase("input");
      setTimeout(() => inputRefs[0].current?.focus(), 100);
    })
    .finally(() => setProfileLoading(false));
}, []);
```

Add a loading gate at the top of the render — before all existing phase rendering, add:

```jsx
{profileLoading && (
  <div style={{ textAlign: "center" }}>
    <span style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: "18px", color: "#8a847b", letterSpacing: "0.2em" }}>
      <span className="loading-dot" style={{ animationDelay: "0s" }}>.</span>
      <span className="loading-dot" style={{ animationDelay: "0.2s" }}>.</span>
      <span className="loading-dot" style={{ animationDelay: "0.4s" }}>.</span>
    </span>
  </div>
)}
```

Wrap all existing phase rendering in `{!profileLoading && ( <> ... </> )}`.

**Step 2: Verify**

Run `npm run dev`. Page should briefly show loading dots, then fall through to input state (no cookie). Existing behavior preserved.

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "feat: client auth state — check session on mount, show profile if authenticated"
```

---

### Task 10: Client — save flow UI (inline email)

**Files:**
- Modify: `miscover.jsx`

**Step 1: Add save flow state**

Add after existing state:

```jsx
const [savePhase, setSavePhase] = useState("idle");
const [saveEmail, setSaveEmail] = useState("");
const [saveError, setSaveError] = useState("");
const emailRef = useRef(null);
```

**Step 2: Add the save handler**

```jsx
const handleSave = async () => {
  if (!saveEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saveEmail.trim())) {
    setSavePhase("error");
    setSaveError("enter an email.");
    return;
  }

  setSavePhase("sending");

  try {
    const response = await fetch("/api/auth/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: saveEmail.trim(),
        decode: {
          inputs: inputs.map((v) => v.trim()),
          decode: result.decode,
          world: result.world,
          brief: result.brief,
        },
      }),
    });

    if (response.ok) {
      setSavePhase("sent");
    } else {
      setSavePhase("error");
      setSaveError("something broke. try again.");
    }
  } catch {
    setSavePhase("error");
    setSaveError("something broke. try again.");
  }
};

const handleSaveKeyDown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleSave();
  }
};
```

**Step 3: Reset save state in handleReset**

Add to `handleReset`:

```jsx
setSavePhase("idle");
setSaveEmail("");
setSaveError("");
```

**Step 4: Add CSS for save flow**

Add inside the `<style>` block before the `@media` query:

```css
.save-btn {
  font-family: 'Spectral', Georgia, serif;
  font-size: 13px;
  font-weight: 300;
  color: #4a4540;
  text-align: center;
  margin-top: 8px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: color 0.2s ease;
  background: none;
  border: none;
  padding: 0;
}
.save-btn:hover { color: #8a847b; }

.save-status {
  font-family: 'Spectral', Georgia, serif;
  font-size: 13px;
  font-weight: 300;
  color: #4a4540;
  text-align: center;
  margin-top: 8px;
  letter-spacing: 0.08em;
}

.save-error { cursor: pointer; }
.save-error:hover { color: #8a847b; }
```

Add inside `@media (max-width: 420px)`:

```css
.save-btn { font-size: 12px; }
.save-status { font-size: 12px; }
```

**Step 5: Add JSX in result state**

After the `copy-prompt-btn` div and before the AGAIN button div, add:

```jsx
{!result.error && !user && (
  <div style={{ textAlign: "center" }}>
    {savePhase === "idle" && (
      <button className="save-btn" onClick={() => { setSavePhase("email"); setTimeout(() => emailRef.current?.focus(), 100); }}>
        save this
      </button>
    )}
    {savePhase === "email" && (
      <input
        ref={emailRef}
        className="input-field"
        type="email"
        placeholder="your email"
        value={saveEmail}
        onChange={(e) => setSaveEmail(e.target.value)}
        onKeyDown={handleSaveKeyDown}
        style={{ marginTop: "16px", maxWidth: "280px" }}
      />
    )}
    {savePhase === "sending" && (
      <p className="save-status">sending...</p>
    )}
    {savePhase === "sent" && (
      <p className="save-status">check your email.</p>
    )}
    {savePhase === "error" && (
      <p className="save-status save-error" onClick={() => { setSavePhase("email"); setTimeout(() => emailRef.current?.focus(), 100); }}>
        {saveError}
      </p>
    )}
  </div>
)}
```

**Step 6: Verify**

Run dev server. Decode something. Confirm `save this` appears, clicking shows email input, decode stays visible.

**Step 7: Commit**

```bash
git add miscover.jsx
git commit -m "feat: inline save flow — save this → email input → check your email"
```

---

### Task 11: Client — profile view

**Files:**
- Modify: `miscover.jsx`

**Step 1: Add profile helpers**

```jsx
const formatSavedAsPrompt = (decode) => {
  if (!decode) return '';
  const inputLine = [decode.input_1, decode.input_2, decode.input_3].map(v => v.toLowerCase()).join(' / ');
  const sections = [`# taste profile — ${inputLine}`];
  sections.push('', '## the thread', decode.decode_text);
  if (decode.brief_text) {
    sections.push('', '## the brief', decode.brief_text);
  }
  if (decode.world_items?.length > 0) {
    sections.push('', '## reference palette');
    decode.world_items.forEach(item => sections.push(`- ${item}`));
  }
  sections.push(
    '',
    '## how to use this',
    'apply this taste profile to all creative output. match the sensibility above. prioritize specificity over breadth, restraint over decoration, precision over polish. when in doubt, choose the option that rewards close attention without demanding it.',
    '',
    '— miscover.com'
  );
  return sections.join('\n');
};

const handleActivate = async (decodeId) => {
  setSavedDecodes((prev) =>
    prev.map((d) => ({ ...d, is_active: d.id === decodeId }))
  );
  fetch("/api/profile/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decodeId }),
  }).catch(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => setSavedDecodes(data.decodes || []))
      .catch(() => {});
  });
};

const handleNewDecode = () => {
  setInputs(["", "", ""]);
  setResult(null);
  setPhase("input");
  setPromptCopied(false);
  setSavePhase("idle");
  setSaveEmail("");
  setSaveError("");
  setTimeout(() => inputRefs[0].current?.focus(), 100);
};

const copyActivePrompt = () => {
  const active = savedDecodes.find((d) => d.is_active);
  if (!active) return;
  const prompt = formatSavedAsPrompt(active);
  navigator.clipboard.writeText(prompt).then(() => {
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1500);
  }).catch(() => {});
};
```

**Step 2: Add CSS**

Add inside the `<style>` block before the `@media` query:

```css
.profile-container {
  max-width: 520px;
  width: 100%;
  padding: 0 4px;
  animation: fadeUp 0.8s ease forwards;
}

.past-decode {
  font-family: 'Spectral', Georgia, serif;
  font-size: 14px;
  font-weight: 300;
  color: #4a4540;
  text-align: center;
  padding: 8px 0;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: color 0.2s ease;
}
.past-decode:hover { color: #8a847b; }
```

Add inside `@media (max-width: 420px)`:

```css
.past-decode { font-size: 13px; padding: 6px 0; }
```

**Step 3: Add profile view JSX**

Add after the result phase block, inside the `{!profileLoading && ...}` wrapper:

```jsx
{phase === "profile" && (
  <div className="profile-container">
    {(() => {
      const active = savedDecodes.find((d) => d.is_active);
      const past = savedDecodes.filter((d) => !d.is_active);
      return (
        <>
          {active && (
            <>
              <p className="inputs-line">
                {active.input_1.toLowerCase()} / {active.input_2.toLowerCase()} / {active.input_3.toLowerCase()}
              </p>
              <p className="decode-text">{active.decode_text}</p>
              <div style={{ textAlign: "center" }}>
                <button
                  className={`copy-prompt-btn${promptCopied ? ' copied' : ''}`}
                  onClick={copyActivePrompt}
                >
                  {promptCopied ? 'copied' : 'copy as prompt'}
                </button>
              </div>
            </>
          )}

          {past.length > 0 && (
            <>
              <div className="separator" />
              {past.map((d) => (
                <p key={d.id} className="past-decode" onClick={() => handleActivate(d.id)}>
                  {d.input_1.toLowerCase()} / {d.input_2.toLowerCase()} / {d.input_3.toLowerCase()}
                </p>
              ))}
            </>
          )}

          <div className="separator" />
          <div style={{ textAlign: "center" }}>
            <button className="again-btn" onClick={handleNewDecode}>
              new decode
            </button>
          </div>
        </>
      );
    })()}
  </div>
)}
```

**Step 4: Commit**

```bash
git add miscover.jsx
git commit -m "feat: profile view — active decode, past decode list, swap, new decode"
```

---

### Task 12: Client — auto-save for authenticated users

**Files:**
- Modify: `miscover.jsx`

**Step 1: Add auto-save after successful decode**

In `handleSubmit`, inside the `if (text) {` block, after `setPhase("result")`, add:

```jsx
// auto-save if authenticated
if (user) {
  const parsedResult = {
    inputs: inputs.map((v) => v.trim()),
    decode: (sections[0] || "").trim(),
    world: (sections[1] || "").trim().split("\n").filter((l) => l.trim()),
    brief: (sections[2] || "").trim(),
  };

  fetch("/api/profile/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsedResult),
  })
    .then((r) => (r.ok ? fetch("/api/profile") : Promise.reject()))
    .then((r) => r.json())
    .then((data) => {
      setSavedDecodes(data.decodes || []);
      setPhase("profile");
    })
    .catch(() => {});
}
```

**Step 2: Verify**

Log in via magic link. Do a new decode. Confirm it auto-saves and transitions to profile view.

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "feat: auto-save decodes for authenticated users, return to profile view"
```

---

### Task 13: End-to-end QA with Playwright

**Files:**
- No code changes

**Step 1: Deploy**

```bash
vercel --prod
```

**Step 2: Test first-time flow (AC 1-5, 16, 34-40)**

1. Open miscover.com in incognito
2. Type: Wong Kar-wai, Aesop, concrete → miscover
3. Verify: decode + `copy as prompt` + `save this` visible
4. Click `save this` → email input inline, decode still visible
5. Enter email → "check your email."
6. Open email, click link → redirect to miscover.com
7. Verify: profile view with saved decode active

**Step 3: Test return flow (AC 6-10, 21-30)**

1. Close tab, reopen miscover.com
2. Verify: profile view loads immediately
3. Click `new decode` → input state
4. Decode: Tirzah, onsen, Dieter Rams
5. Verify: auto-saves, returns to profile, new decode active
6. Verify: Wong Kar-wai set in history
7. Click Wong Kar-wai line → swaps to active
8. `copy as prompt` → verify clipboard has structured prompt

**Step 4: Test edge cases (AC 17-19, 38-39, 42-46)**

- Invalid email → "enter an email."
- Expired magic link → "this link expired. try again."
- Used magic link → "this link was already used."
- AGAIN works during save flow
- Brief still copyable during save flow
- Profile load failure → falls back to input
- Mobile viewport (375px)

**Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: QA adjustments for seam 2"
```

---

## Task Dependency Map

```
Task 1 (deps + vitest)
  ↓
Task 2 (DB tables)       Task 3 (auth utils + TDD)
  ↓                        ↓
Task 4 (/auth/send)  ←────┘
  ↓
Task 5 (/auth/verify)
  ↓
Task 6 (/profile)    Task 7 (/profile/save)    Task 8 (/profile/activate)
  ↓                    ↓                          ↓
Task 9 (client: auth state) ←─────────────────────┘
  ↓
Task 10 (client: save flow)
  ↓
Task 11 (client: profile view)
  ↓
Task 12 (client: auto-save)
  ↓
Task 13 (E2E QA)
```

Tasks 2 and 3 can run in parallel. Tasks 6, 7, 8 can run in parallel. Everything else is sequential.
