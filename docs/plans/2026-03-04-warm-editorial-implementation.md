# Warm Editorial Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace developer-minimal aesthetic (Courier Prime on cold #111) with warm editorial (Spectral serif on warm #1a1918)

**Architecture:** Pure CSS/styling change across two files. No logic changes. Font swap from Courier Prime to Spectral via Google Fonts. Color palette shift from cold grays to warm tones. All styling is inline in `miscover.jsx` with a `<style>` block.

**Tech Stack:** React (inline styles + CSS-in-JS style block), Google Fonts (Spectral)

---

### Task 1: Update index.html — ground color, theme-color, favicon

**Files:**
- Modify: `index.html`

**Step 1: Update background and theme colors**

In `index.html`, make these changes:

1. Line 30 — Change theme-color meta:
```html
<!-- FROM -->
<meta name="theme-color" content="#111111" />
<!-- TO -->
<meta name="theme-color" content="#1a1918" />
```

2. Line 39 — Change body background in inline style:
```html
<!-- FROM -->
<style>html,body{margin:0;padding:0;background:#111;overflow-x:hidden;width:100%}#root{width:100%}</style>
<!-- TO -->
<style>html,body{margin:0;padding:0;background:#1a1918;overflow-x:hidden;width:100%}#root{width:100%}</style>
```

3. Lines 36-37 — Update favicon SVG data URIs. Change `fill='%23111'` to `fill='%231a1918'` and `fill='%23ccc'` to `fill='%23d4cfc8'` and font-family from `Courier New,monospace` to `serif` in both favicon and apple-touch-icon.

**Step 2: Verify locally**

Run: `npm run dev`
Expected: Browser shows warm dark background, favicon updated. No layout changes yet.

**Step 3: Commit**

```bash
git add index.html
git commit -m "update ground color and favicon to warm dark #1a1918"
```

---

### Task 2: Swap font import from Courier Prime to Spectral

**Files:**
- Modify: `miscover.jsx`

**Step 1: Replace Google Fonts import**

Line 110 — Change the `@import` URL inside the `<style>` block:

```css
/* FROM */
@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');

/* TO */
@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;1,300;1,400&display=swap');
```

**Step 2: Verify font loads**

Run: `npm run dev`
Open DevTools Network tab, filter by "fonts.googleapis" — confirm Spectral loads.

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "swap font import from Courier Prime to Spectral"
```

---

### Task 3: Update all color values

**Files:**
- Modify: `miscover.jsx`

**Step 1: Replace all color references**

Apply these replacements throughout `miscover.jsx` (both inline styles and the `<style>` block):

| Find | Replace | Role |
|------|---------|------|
| `background: "#111"` | `background: "#1a1918"` | Container ground (line 97) |
| `#ccc` (text color) | `#d4cfc8` | Primary text |
| `#777` | `#8a847b` | Secondary text |
| `#555` | `#4a4540` | Muted text |
| `#444` | `#4a4540` | Placeholder text |
| `#333` (borders/separators) | `#2a2725` | Borders |
| `#999` | `#8a847b` | Loading dots |
| `background: #ccc` (button) | `background: transparent` | Go button (see Task 5) |

Full list of changes by line:

- Line 97: `background: "#111"` → `background: "#1a1918"`
- Line 120: `border-bottom: 1.5px solid #333` → `border-bottom: 1px solid #2a2725`
- Line 124: `color: #ccc` → `color: #d4cfc8`
- Line 131: `border-bottom-color: #ccc` → `border-bottom-color: #d4cfc8`
- Line 134: `color: #444` → `color: #4a4540`
- Line 141: `background: #ccc` → (handle in Task 5)
- Line 142: `color: #111` → (handle in Task 5)
- Line 151: `background: #333` → (handle in Task 5)
- Line 177: `color: #ccc` → `color: #d4cfc8`
- Line 185: `color: #777` → `color: #8a847b`
- Line 195: `color: #777` → `color: #8a847b`
- Line 202: `color: #777` → `color: #8a847b`
- Line 208: `color: #555` → `color: #4a4540`
- Line 209: `border: 1px solid #333` → `border: 1px solid #2a2725`
- Line 216: `color: #777; border-color: #555` → `color: #8a847b; border-color: #3a3530`
- Line 221: `color: #555` → `color: #4a4540`
- Line 229: `color: #333` → `color: #3a3530`
- Line 249: `background: #333` → `background: #3a3530`
- Line 256: `color: #444` → `color: #4a4540`
- Line 307: `color: "#999"` → `color: "#8a847b"`

**Step 2: Verify colors**

Run: `npm run dev`
Expected: All text, borders, and backgrounds use warm tones. No cold grays remain.

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "replace cold gray palette with warm editorial tones"
```

---

### Task 4: Update all font-family declarations to Spectral

**Files:**
- Modify: `miscover.jsx`

**Step 1: Replace font-family throughout**

Replace every instance of `'Courier Prime', 'Courier New', monospace` with `'Spectral', Georgia, serif` in both the `<style>` block and inline styles.

Locations:
- Line 102: container inline style `fontFamily`
- Line 122: `.input-field` font-family
- Line 144: `.go-btn` font-family
- Line 174: `.decode-text` font-family
- Line 183: `.world-item` font-family
- Line 192: `.brief-text` font-family
- Line 210: `.again-btn` font-family
- Line 219: `.inputs-line` font-family
- Line 228: `.watermark` font-family
- Line 254: `.copied-toast` font-family
- Line 305: loading dots inline `fontFamily`

**Step 2: Verify font renders**

Run: `npm run dev`
Expected: All text renders in Spectral. No monospace remnants.

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "replace Courier Prime with Spectral serif throughout"
```

---

### Task 5: Apply typography system — weights, sizes, styles

**Files:**
- Modify: `miscover.jsx`

**Step 1: Update decode text**

`.decode-text` class (line 173-180):
```css
.decode-text {
  font-family: 'Spectral', Georgia, serif;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.6;
  color: #d4cfc8;
  text-align: center;
  margin-bottom: 28px;
}
```

**Step 2: Update world items**

`.world-item` class (line 182-189):
```css
.world-item {
  font-family: 'Spectral', Georgia, serif;
  font-size: 14px;
  font-weight: 300;
  color: #8a847b;
  text-align: center;
  padding: 6px 0;
  letter-spacing: 0.03em;
}
```

**Step 3: Update brief text**

`.brief-text` class (line 191-202):
```css
.brief-text {
  font-family: 'Spectral', Georgia, serif;
  font-size: 16px;
  font-weight: 400;
  font-style: italic;
  line-height: 1.6;
  color: #8a847b;
  text-align: center;
  margin-top: 28px;
  cursor: pointer;
  transition: color 0.2s ease;
}
.brief-text:hover { color: #d4cfc8; }
```

**Step 4: Update input fields**

`.input-field` class (line 115-136):
```css
.input-field {
  width: 100%;
  max-width: 280px;
  padding: 12px 0;
  border: none;
  border-bottom: 1px solid #2a2725;
  background: transparent;
  font-family: 'Spectral', Georgia, serif;
  font-size: 18px;
  font-weight: 300;
  color: #d4cfc8;
  outline: none;
  transition: border-color 0.3s ease;
  text-align: center;
  letter-spacing: 0.02em;
}
.input-field:focus {
  border-bottom-color: #d4cfc8;
}
.input-field::placeholder {
  color: #4a4540;
  font-style: italic;
  font-weight: 300;
}
```

**Step 5: Restyle Go button to editorial**

Replace the solid filled button with an understated text button:

`.go-btn` class (line 138-151):
```css
.go-btn {
  margin-top: 36px;
  padding: 10px 48px;
  background: transparent;
  color: #d4cfc8;
  border: none;
  border-bottom: 1px solid #2a2725;
  font-family: 'Spectral', Georgia, serif;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: lowercase;
}
.go-btn:hover { border-bottom-color: #d4cfc8; }
.go-btn:disabled { color: #3a3530; border-bottom-color: transparent; cursor: default; }
```

**Step 6: Update button text**

In the JSX (line 296), change `GO` to `decode`:
```jsx
{/* FROM */}
GO
{/* TO */}
decode
```

**Step 7: Update inputs-line, watermark, again-btn, copied-toast**

`.inputs-line` (line 218-225):
```css
.inputs-line {
  font-family: 'Spectral', Georgia, serif;
  font-size: 14px;
  font-weight: 300;
  color: #4a4540;
  text-align: center;
  margin-bottom: 20px;
  letter-spacing: 0.03em;
}
```

`.watermark` (line 227-234):
```css
.watermark {
  font-family: 'Spectral', Georgia, serif;
  font-size: 12px;
  font-weight: 300;
  color: #3a3530;
  text-align: right;
  margin-top: 32px;
  letter-spacing: 0.08em;
}
```

`.again-btn` (line 204-216):
```css
.again-btn {
  margin-top: 32px;
  padding: 8px 32px;
  background: transparent;
  color: #4a4540;
  border: none;
  border-bottom: 1px solid #2a2725;
  font-family: 'Spectral', Georgia, serif;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: lowercase;
}
.again-btn:hover { color: #8a847b; border-bottom-color: #3a3530; }
```

`.copied-toast` (line 253-263):
```css
.copied-toast {
  font-family: 'Spectral', Georgia, serif;
  font-size: 13px;
  font-weight: 300;
  color: #4a4540;
  letter-spacing: 0.1em;
  animation: fadeOut 1.5s ease forwards;
}
```

**Step 8: Update button text in JSX**

Line 343 — change `AGAIN` to `again`:
```jsx
{/* FROM */}
AGAIN
{/* TO */}
again
```

**Step 9: Update responsive breakpoints**

`@media (max-width: 420px)` (line 236-244):
```css
@media (max-width: 420px) {
  .watermark { margin-top: 24px; }
  .inputs-line { font-size: 13px; margin-bottom: 16px; }
  .decode-text { font-size: 16px; margin-bottom: 20px; }
  .world-item { font-size: 13px; padding: 4px 0; }
  .brief-text { font-size: 14px; margin-top: 20px; }
  .separator { margin: 18px auto; }
  .again-btn { margin-top: 24px; }
}
```

**Step 10: Update separator**

`.separator` (line 246-251):
```css
.separator {
  width: 40px;
  height: 1px;
  background: #3a3530;
  margin: 24px auto;
}
```

**Step 11: Verify full typography**

Run: `npm run dev`
Expected: Decode in Regular 400, world domains in Light 300, brief in Italic, inputs in Light 300, placeholders in Light Italic. Button says "decode" lowercase. "AGAIN" is now "again".

**Step 12: Commit**

```bash
git add miscover.jsx
git commit -m "apply Spectral typography system — weights, sizes, italic brief"
```

---

### Task 6: Visual QA — verify with test inputs

**Files:** None (manual verification)

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Test all visual states**

1. **Empty state:** Three inputs with italic placeholders on warm dark ground
2. **Filled state:** Type "Wong Kar-wai", "Aesop", "concrete" — verify text renders in Spectral Light
3. **Loading state:** Submit and verify pulsing dots render in warm cream
4. **Result state:** Verify decode/world/brief typography, separators, watermark alignment
5. **Screenshot test:** Take a phone-width screenshot — does it look like something Mira would save to Are.na?

**Step 3: Check mobile responsive**

Open DevTools, toggle to 375px width. Verify text sizes adjust, nothing overflows.

**Step 4: Commit if any fixes needed**

```bash
git add miscover.jsx
git commit -m "visual QA fixes for warm editorial redesign"
```

---

### Task 7: Build and verify production bundle

**Step 1: Run build**

```bash
npm run build
```

Expected: Clean build, no errors.

**Step 2: Preview production build**

```bash
npm run preview
```

Verify all styling renders correctly in production mode (Vite may optimize differently).

**Step 3: Final commit**

```bash
git add -A
git commit -m "V2: warm editorial redesign — Spectral serif on warm dark"
```
