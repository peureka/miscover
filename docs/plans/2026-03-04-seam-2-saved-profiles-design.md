# Seam 2: Saved Profiles — Design Document

**Goal:** Mira comes back and her decodes are there. One active profile, history of past decodes. Magic link auth. Zero friction before first decode.

**Architecture:** Minimal auth — Resend magic links + Neon Postgres + HMAC-signed httpOnly cookie. No auth library. Three new tables, five new API endpoints. Profile view as a new page state in the single React component.

**Tech Stack:** React 19, Vite, Vercel serverless, Neon PostgreSQL, Resend (new), crypto (Node built-in)

---

## The Principle

Seam 2 adds persistence without adding friction. The Seam 0 experience (three inputs → decode → screenshot) is untouched. The Seam 1 feature (copy as prompt) is untouched. Mira only encounters auth when she actively wants to save something.

---

## Page States

The page has 4 states: **input**, **result**, **email** (inline within result), **profile**.

```
First visit (anonymous):
  input → result → [save this] → email → [magic link] → profile

Return visit (authenticated):
  profile → [new decode] → input → result (auto-saves) → profile
```

### Mira's first-time flow

1. Types three things → decode (existing Seam 0)
2. Clicks `save this` → email input appears inline, decode still visible
3. Types email, presses enter → "check your email."
4. Opens email, clicks link → returns to miscover.com, logged in
5. Her decode is saved. She sees profile view.

### Mira's return flow

1. Lands on miscover.com → cookie detected → profile view
2. Sees active decode + past decodes
3. Clicks `new decode` → input state → decode → auto-saves → profile view with new decode active

---

## Database Schema

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE magic_links (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  decode_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE saved_decodes (
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
```

### Design decisions

- **`magic_links.decode_data`** — JSONB column stashes the pending decode (inputs, decode, world, brief) before sending the email. After verify, we save it. Mira doesn't re-enter anything.
- **`is_active`** — One active profile per user. Enforced at application level.
- **`world_items` as `TEXT[]`** — Postgres array. Simpler than a join table for 8 strings.
- **No sessions table** — Cookie value is `user_id.HMAC(user_id, SERVER_SECRET)`. Stateless. No DB lookup on every request. Expires in 30 days.

---

## API Endpoints

| Endpoint | Method | What it does |
|---|---|---|
| `/api/auth/send` | POST | Takes email + pending decode data. Creates user if new. Stores magic link token + pending decode. Sends email via Resend. |
| `/api/auth/verify` | GET | Takes token from URL. Validates, saves pending decode, sets cookie, redirects to `/`. |
| `/api/profile` | GET | Takes cookie. Returns user's saved decodes (active first, then by created_at desc). |
| `/api/profile/save` | POST | Takes cookie + decode data. Saves to saved_decodes. Sets as active. Deactivates previous. |
| `/api/profile/activate` | POST | Takes cookie + decode id. Sets it as active, deactivates previous. |

### Magic link flow in detail

```
1. Mira clicks "save this"
2. Email input appears inline
3. She types email, presses enter
4. Client POST /api/auth/send
   Body: { email, decode: { inputs, decode, world, brief } }
5. Server:
   - INSERT INTO users (email) ... ON CONFLICT DO NOTHING
   - Generate token (crypto.randomUUID)
   - INSERT INTO magic_links (email, token, expires_at, decode_data)
     expires_at = NOW() + 15 minutes
   - Send email via Resend
6. Client shows "check your email."
7. Mira clicks link: GET /api/auth/verify?token=abc123
8. Server:
   - Look up token, check not expired, not used
   - Mark token used
   - Get user by email
   - Save pending decode to saved_decodes (is_active = true)
   - Set cookie: user_id.hmac, httpOnly, secure, sameSite=strict, 30 days
   - Redirect to /
9. Client loads, detects cookie, GET /api/profile → profile view
```

### The email

```
From: miscover <m@miscover.com>
Subject: your link

miscover.com/api/auth/verify?token=abc123

— miscover.com
```

Plain text. One line. The link. The attribution. No branding. No HTML template.

### Auto-save on subsequent decodes

Once authenticated, result state skips `save this`. After decode completes, client auto-POSTs to `/api/profile/save`. New decode becomes active. Previous active moves to history.

---

## UI: Result State Changes

For unauthenticated users, the result state adds one element:

```
[decode]
[world]
[brief]
copy as prompt
save this              ← NEW
miscover
```

`save this` has the same visual weight as `copy as prompt`.

### The inline save flow

```
State 1 (default):       save this
State 2 (email input):   [___your email___]
State 3 (sent):          check your email.
```

No modals. No redirects. No new pages. The decode stays visible throughout.

### Specs

| Element | Spec |
|---|---|
| `save this` | Same as `.copy-prompt-btn`: Spectral 13px, weight 300, `#4a4540`, hover `#8a847b` |
| Email input | Same as `.input-field`: Spectral 18px, weight 300, `#d4cfc8`, bottom border `#2a2725`, focus `#d4cfc8`, centered, max-width 280px |
| Email placeholder | `your email`, `#4a4540`, italic |
| `check your email.` | Spectral 13px, weight 300, `#4a4540`. Static. Lowercase. Period. |
| Error: invalid email | `enter an email.` Same position, same style. Click returns to input. |
| Error: send failure | `something broke. try again.` Same style. Click returns to input. |

---

## UI: Profile View

New page state for authenticated users. Replaces input state on return visits.

```
wong kar-wai / aesop / concrete

you want texture that breathes — surfaces
that hold light without trying, stories told
through what's left unsaid, and the particular
loneliness of beautiful spaces.

copy as prompt

————————

tirzah / onsen / dieter rams
dean blunt / convenience stores / helmut lang
bristol / 35mm / miso soup

————————

new decode
```

### Design decisions

- **Active decode shows inputs line + full decode text + `copy as prompt`** — not the world, not the brief. Dense, screenshotable. The full structured prompt is still copied via `copy as prompt`.
- **Past decodes show only input lines** — one per row. Tapping one makes it active (swaps).
- **No expand/collapse on past decodes** — tap to activate, then you see the full decode.
- **`new decode`** at the bottom, same energy as `miscover` button.
- **No logout, no settings, no delete, no account management** — zero UI chrome.
- **The profile view is screenshotable** — active decode + past input lines is its own identity artifact.

### Specs

| Element | Spec |
|---|---|
| Active inputs line | `#4a4540`, Spectral 14px, weight 300, centered |
| Active decode text | `#d4cfc8`, Spectral 18px, weight 400, centered |
| `copy as prompt` | Same as Seam 1: `#4a4540`, Spectral 13px, weight 300 |
| Separator | 40px wide, 1px, `#3a3530` |
| Past decode lines | `#4a4540`, Spectral 14px, weight 300, centered, cursor pointer |
| Past decode hover | Color → `#8a847b` |
| Past decode tap | Swap to active. Fade transition 0.4s. |
| `new decode` | Same style as `miscover` button: `#4a4540`, Spectral 14px, weight 400, underline `#2a2725` |
| No new fonts | Reuses existing styles |
| No new colors | Uses existing palette |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Verify on different device | Token valid. Decode saved from stashed data. Profile view on new device. |
| Two magic links requested | Both work until expired. No conflict — same email. |
| 50 saved decodes | All shown. Scrollable. No pagination. No limit yet. |
| Cookie expires (30 days) | Input state. `save this` after decode. Re-auth via magic link. All data preserved. |
| Magic link expired (15 min) | `this link expired. try again.` with resend link. |
| Magic link used twice | `this link was already used.` |
| Profile load fails | Falls back to input state. Graceful degradation. |
| Auto-save fails | Silent. Decode visible and copyable. Missing from history on next visit. |
| Same inputs, different users | Each has own saved_decodes row. Decode text differs. No conflict. |

---

## Acceptance Criteria (Mira Test)

### Page states

- **AC-1:** Mira's first visit is identical to Seam 0. No save prompt until after a decode.
- **AC-2:** `save this` appears in result state for unauthenticated users, below `copy as prompt`.
- **AC-3:** Clicking `save this` reveals an inline email input — no modal, no redirect, no new page.
- **AC-4:** After entering email, text changes to `check your email.` Same position, same font.
- **AC-5:** Magic link click lands her back on miscover.com with her decode saved and visible.
- **AC-6:** On return visits (cookie present), she sees profile view immediately — no input state.
- **AC-7:** Profile view shows active decode and past decodes. Active decode is prominent.
- **AC-8:** `new decode` link in profile triggers input state. New decode auto-saves on completion.
- **AC-9:** She can tap any past decode to make it active (swap).
- **AC-10:** `copy as prompt` in profile view copies the active profile's structured prompt.

### Database

- **AC-11:** Mira's decode is preserved exactly — same decode text, same 8 world items, same brief. Nothing lost in save.
- **AC-12:** Her pending decode survives the magic link flow. She doesn't re-enter three things after verifying email.
- **AC-13:** She has exactly one active profile at a time. Swapping sets the old one inactive.
- **AC-14:** Her session persists for 30 days. She doesn't re-authenticate every visit.
- **AC-15:** Clearing cookies logs her out. Next magic link re-authenticates. No data lost.

### API

- **AC-16:** Magic link email arrives within 10 seconds. Plain text. Just the link.
- **AC-17:** Magic link expires after 15 minutes. Expired link shows `this link expired. try again.`
- **AC-18:** Magic link is single-use. Second click shows `this link was already used.`
- **AC-19:** If Mira enters an existing email, she gets a new magic link. No "account already exists" error.
- **AC-20:** After verifying, her pending decode is saved automatically. She doesn't re-enter anything.
- **AC-21:** Subsequent decodes auto-save. No `save this` prompt for authenticated users.
- **AC-22:** The new decode becomes active automatically. Previous active moves to history.
- **AC-23:** `/api/profile` returns decodes ordered: active first, then by created_at descending.
- **AC-24:** All endpoints fail gracefully. API errors show flat Reader-voice messages, never technical language.

### Profile view

- **AC-25:** Profile view loads instantly on return visit — cookie detected, profile fetched, no flash of input state.
- **AC-26:** Active decode shows inputs line + full decode text + `copy as prompt`. Same visual treatment as result state.
- **AC-27:** Past decodes show only input lines, one per row. Tappable.
- **AC-28:** Tapping a past decode swaps it to active. Previous active moves to history. Smooth transition.
- **AC-29:** `copy as prompt` on profile view copies the active profile's structured prompt (same format as Seam 1).
- **AC-30:** `new decode` takes her to input state. After decode, auto-saves and returns to profile view with new decode as active.
- **AC-31:** Profile view on mobile (375px) fits active decode + at least 3 past decode lines without scrolling.
- **AC-32:** The profile view screenshot — active decode + past input lines on dark background — is postable. Passes the Mira test.
- **AC-33:** No logout button, no settings, no delete, no account management. Zero UI chrome beyond the decodes.

### Save flow

- **AC-34:** `save this` appears below `copy as prompt` for unauthenticated users only.
- **AC-35:** Clicking `save this` replaces it with an email input inline. No modal, no redirect. Decode stays visible.
- **AC-36:** Email input autofocuses. Placeholder reads `your email`.
- **AC-37:** Enter on valid email sends the magic link. Input replaced by `check your email.`
- **AC-38:** Enter on empty or invalid email shows `enter an email.` — clicking it returns to email input.
- **AC-39:** If Resend fails, shows `something broke. try again.` — clicking returns to email input.
- **AC-40:** The decode, world, brief, and `copy as prompt` are all still visible and functional during the entire save flow. Nothing is blocked.
- **AC-41:** Authenticated users never see `save this`. Their decodes auto-save.

### Edge cases

- **AC-42:** Expired magic link shows `this link expired. try again.` with a link to resend.
- **AC-43:** Used magic link shows `this link was already used.`
- **AC-44:** Profile load failure gracefully falls back to input state. No broken UI.
- **AC-45:** Decode auto-save failure is silent. The decode is still visible and copyable.
- **AC-46:** Cookie expiry returns her to input state. Re-auth preserves all saved decodes.

---

## What We're NOT Building (Seam 2 exclusions)

- No OAuth / social login (magic link only)
- No password system
- No email verification beyond magic link
- No profile editing (rename, reorder, delete)
- No public profile pages
- No sharing saved profiles
- No profile export/import
- No analytics dashboard for users
- No "daily three" mechanic
- No direct AI integration (Seam 3)
- No account settings or preferences
- No email notifications beyond magic links

When any of these are needed, they get their own spec.
