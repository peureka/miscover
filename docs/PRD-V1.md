# miscover — Product Requirements Document (V1)

*Last updated: 2026-03-03*
*Status: Live at miscover.com*

---

## What miscover is

A taste decoder. Three inputs, one output. One page. One purpose.

A user types three things they like — a film, a brand, a material, a city, anything — and receives a three-part decode: a single sentence that names what connects them, eight cultural recommendations they haven't found yet, and a two-sentence brief they can paste into any AI tool and get outputs that feel like them.

miscover is not a quiz. Not a recommendation engine. Not a mood board tool. It is the thing that tells you what you already know about yourself but haven't said out loud yet.

**Positioning:** Co-Star for people who don't believe in astrology. Identity-as-entertainment, powered by taste instead of birth charts.

---

## The core loop

```
Type three things → Read the decode → Screenshot → Share → "What are your three?"
```

Everything serves this loop. If a feature doesn't serve the loop, it doesn't exist.

---

## What's live (V1)

### Architecture

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 19 (single component) | One file, one page, no routing |
| Build | Vite 6 | < 100KB bundle gzipped |
| Styling | Inline styles + `<style>` block | No CSS framework. Courier Prime only. |
| API proxy | Vercel serverless function | `/api/decode` — hides API key server-side |
| Model | Claude Sonnet 4 (`claude-sonnet-4-20250514`) | 1 sentence decode, 8 world items, 2 sentence brief |
| Database | Neon Postgres (serverless) | Caches identical inputs, logs every decode |
| Hosting | Vercel | Auto-deploys from GitHub on push to main |
| Domain | miscover.com | DNS via Squarespace, pointed to Vercel |

### Frontend

**Two states: input and result.**

**Input state:**
- Three text fields, vertically stacked, centered
- Bottom-border only styling: `1.5px solid #333`, focus state `#ccc`
- Placeholder text: "first thing" / "second thing" / "third thing"
- Keyboard navigation: Enter/Tab advances fields, Enter on field 3 submits
- Autofocus on field 1 at page load
- GO button: enabled when all three fields non-empty (trimmed)
- No input validation beyond empty check. Any text, any language, any length.

**Result state:**
- Decode: 1 sentence, Courier Prime 16px, #ccc, centered
- Separator: 40px wide, 1px, #333
- World: 8 items, Courier Prime 14px, #777, one per line
- Separator
- Brief: 2 sentences, Courier Prime 13px, #777, clickable to copy (silent)
- Watermark: "miscover.com" in #333, 11px — closes the viral loop
- AGAIN button: resets to input state, clears fields, refocuses field 1
- Fade-up animation: 0.8s ease

**Loading state:**
- Three dots, pulsing, staggered by 0.2s
- Replaces input state entirely

**Error states:**
- API failure: "nothing came back. try again."
- Timeout (>10s): "took too long. try again."
- Rate limited: "slow down. try again later."
- All errors shown in decode position, same font, same tone. No technical language.

### Visual identity

- **Background:** #111. No gradient, no texture.
- **Primary text:** #ccc
- **Secondary text:** #777
- **Tertiary/borders:** #333
- **Font:** Courier Prime. One font. One weight. Monospace only.
- **Motion:** Fade-up on result (0.8s ease). Pulsing dots on load. Nothing else.
- **Dark mode:** The only mode. miscover exists at night.
- **Density:** Mostly empty. The emptiness is the design.

The site should look like something a developer built for themselves at 3am and reluctantly made public.

### The Reader (system prompt)

The Reader is the voice of miscover. Not enthusiastic. Not mean. Flat, certain, precise. States observations the way a doctor reads test results.

**The Reader has taste.** Decades in record shops, independent cinemas, design bookshops, gallery back rooms. Knows the difference between a gateway reference and a deep cut. Never recommends the thing someone would find on their own — recommends the thing that makes them realize their taste has a name they didn't know yet.

**Output structure:**

| Section | Spec |
|---|---|
| THE DECODE | Exactly 1 sentence. Lowercase. No exclamation marks. Starts with the connection, not the inputs. Never names all three inputs back. Second person present tense. Sharp and dense — every word earns its place. |
| YOUR WORLD | Exactly 8 items. Format: "Domain — Name". At least 6 different domain groups. No explanations. Every rec should be something the user hasn't encountered but will immediately recognize as theirs. Deep, not broad. Specific, not canonical. |
| YOUR BRIEF | Exactly 2 sentences. Lowercase. Dense specific imagery ("brushed steel, not chrome"). Functional enough to paste into Midjourney, ChatGPT, or a design brief. |

**Domain groups (max 1 pick per group):**
- Cinema: Film, Director
- Music: Music, Album, Artist
- Literature: Book, Author
- Architecture: Architect, Building
- Fashion: Brand, Designer
- All others: their own group

**Banned words (in decode and UI):** fascinating, reveals, unveils, journey, unique, curated, resonates, speaks to, energy, aesthetic, vibe, "at the intersection of," "might," "could be"

**Banned recommendations (too obvious for this audience):** Lost in Translation, In the Mood for Love, Tadao Ando, Dieter Rams, Helvetica, Akkurat (and variants), COS, Muji, Kinfolk, Cereal Magazine, Narisawa, Comme des Garçons (any fragrance), Kyoto, Tokyo, Copenhagen, Kanazawa

### API and data

**Request flow:**
1. Client sends `{ inputs: [string, string, string] }` to `/api/decode`
2. Server validates inputs (three non-empty strings)
3. Rate limit check: 20 requests per IP per hour
4. Cache check: query Neon for identical inputs (case-insensitive). If found, return cached result (zero API cost)
5. If cache miss: call Claude Sonnet 4 with system prompt + three inputs
6. Log decode to Neon `decodes` table (fire-and-forget)
7. Return response to client

**Database schema:**
```sql
CREATE TABLE decodes (
  id SERIAL PRIMARY KEY,
  input_1 TEXT NOT NULL,
  input_2 TEXT NOT NULL,
  input_3 TEXT NOT NULL,
  raw_output TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Cost per decode:** ~$0.005 (half a cent). $5 budget = ~1,000 fresh decodes. Cached decodes cost nothing.

### SEO and social

- `<title>`: miscover
- Meta description: "three things. one decode."
- OG tags: title, description, site_name, 1200x630 PNG image
- Twitter card: summary_large_image
- Favicon: inline SVG, lowercase "m" on #111 with rounded corners
- Canonical URL: https://miscover.com

---

## Mira

Mira Sato is the user every decision is tested against. She is 27, lives in Dalston, works as a junior art director. She has a Letterboxd with 400 films logged, an Are.na channel called "things that feel correct" with 900 blocks, and a Notes app full of restaurants she'll never organize.

She knows what she likes. She cannot explain why.

### The Mira test

> *Would Mira screenshot this and post it to her Instagram Story with no caption — just the screenshot — and feel like it says something about her?*

If no, it is not ready.

### Test input sets (use for QA)

| Set | Input 1 | Input 2 | Input 3 |
|---|---|---|---|
| 1 | Wong Kar-wai | Aesop | concrete |
| 2 | Tirzah | onsen | Dieter Rams |
| 3 | Dean Blunt | convenience stores | Helmut Lang |
| 4 | Bristol | 35mm | miso soup |

**Validation:** All four sets must produce decodes that feel like four facets of the same person. If any two feel interchangeable, the system prompt needs tuning.

### Trust moment

The first sentence of the decode has ~3 seconds to earn or lose Mira. If it's generic, she closes the tab. If it's specific, she screenshots.

### Failure modes

She abandons if:
- The site explains itself
- There's a signup wall before the first decode
- Loading exceeds ~4 seconds
- The output "could describe anyone"
- The World section recommends something obvious
- Anything makes this feel like a product instead of a thing

---

## The viral mechanic

miscover spreads through one mechanism: the screenshot.

1. Someone uses miscover
2. The decode is specific enough to feel personal
3. They screenshot it
4. A friend sees it, types their own three things
5. "What are your three?" becomes a question people ask each other
6. The three inputs become identity shorthand — like zodiac signs but earned, not assigned

**What enables this:**
- The decode must be screenshot-worthy every time. One generic decode breaks the chain.
- No share buttons. Sharing is manual (screenshot). This makes it feel personal, not promotional.
- The watermark ("miscover.com") is the only branding on the result screen — the return address for the viral loop.
- Dark background + monospace text = immediately recognizable format. "A miscover" becomes a visual identity.

---

## The taste graph (the real asset)

Every decode generates a data point: three cultural references one person considers self-defining, plus the AI-generated through-line connecting them. At scale, this creates the most valuable dataset in consumer culture.

### What the data is

- **Taste triangles:** Every combination of three inputs, with decoded through-lines
- **Cultural adjacency:** What gets paired with what. Not algorithmic ("people who liked X also liked Y") but identity-driven ("people who define themselves by X also define themselves by Y")
- **Cluster formation:** Types of people defined by recurring through-lines. Not demographics. Not psychographics. Taste-graphics.

### Why it's valuable

Netflix knows what you watched. Spotify knows what you listened to. miscover knows what you *chose to define yourself by.* Consumption data tells you what someone did. Taste data tells you who someone thinks they are.

Valuable for: recommendation systems, brand positioning, content development, cultural forecasting.

### Current state

V1 logs every decode to Neon Postgres. The table captures inputs, raw output, and timestamp. No analysis layer yet. No feedback loop into the prompt. The data is accumulating but not yet being used.

### Trajectory

| Timeline | State | Value |
|---|---|---|
| Month 1 | Thousands of decodes | Interesting but sparse |
| Month 6 | Hundreds of thousands | Patterns emerge, clusters form |
| Month 12 | Millions | The taste graph becomes a map of cultural identity |

The front end is free. The taste graph is the asset. The graph gets more valuable with every decode.

---

## What V1 does NOT include

Explicitly excluded. Do not build, design, or scaffold for:

- User accounts, signup, or authentication
- Saved decode history
- Analytics or usage tracking
- Social share buttons or integrations
- Light mode
- Logo, nav, footer, or about page
- Cookie banner, GDPR modal, or consent gate
- The "Daily Three" mechanic
- Compare with friends / social features
- The brief as a premium/paid feature
- Push notifications
- SEO pages
- Public API
- Email capture
- Backend analysis of the taste graph

When any of these are needed, they will get their own spec.

---

## Performance targets

| Metric | Target |
|---|---|
| Time to interactive (3G) | < 1.5 seconds |
| Decode latency (GO → visible) | < 4 seconds median |
| Total page weight (excl. font) | < 100KB |
| Font load (4G) | < 500ms |
| Full experience (land → screenshot) | < 30 seconds |
| Cumulative Layout Shift | 0 |
| API timeout | 10 seconds |
| Rate limit | 20 decodes/IP/hour |

---

## UI copy (exhaustive)

| Location | Text |
|---|---|
| Placeholder 1 | `first thing` |
| Placeholder 2 | `second thing` |
| Placeholder 3 | `third thing` |
| Submit button | `GO` |
| Reset button | `AGAIN` |
| Loading | `...` (animated) |
| Error: API failure | `nothing came back. try again.` |
| Error: timeout | `took too long. try again.` |
| Error: rate limit | `slow down. try again later.` |
| Watermark | `miscover.com` |
| Page title | `miscover` |
| Meta description | `three things. one decode.` |

There is no other copy anywhere on the page.

---

## Decision framework

When unsure about a product, design, or engineering decision:

1. Would Mira screenshot this?
2. Does this add friction before the first decode?
3. Does this make the decode more specific or more generic?
4. Does this make the page more complex?
5. Does this contribute to the taste graph?
6. Does this make miscover feel like an app? (It should feel like a site.)
7. Could this exist at launch, or is it month 3?
8. Does this serve the screenshot?

When two options are equal, choose the simpler one.

---

## File structure

```
miscover/
  index.html            — HTML shell, meta tags, OG tags, favicon
  main.jsx              — React mount (3 lines)
  miscover.jsx          — Single component: input, loading, result states
  api/decode.js          — Serverless function: rate limit, cache, Claude API, logging
  vite.config.js        — Vite + React plugin
  package.json          — react, react-dom, @neondatabase/serverless, vite
  public/og.png         — OG image for social sharing (1200x630)
  docs/PRD-V1.md        — This document
```

---

## What we ship

miscover ships when:

1. Mira can type three things and read a decode that makes her pause
2. The decode is specific enough that different inputs produce meaningfully different outputs
3. The screenshot looks good posted to an Instagram Story with no caption
4. The World section contains at least 3 references per decode that the user hasn't encountered
5. The brief is functional enough to paste into another AI tool and get outputs that feel right
6. The whole experience takes under 30 seconds from landing to screenshot
7. The page works on mobile, in dark mode, on a slow connection
8. The taste graph is quietly accumulating from day one

Everything else is iteration.
