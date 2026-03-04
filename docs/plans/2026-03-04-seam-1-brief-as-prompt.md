# Seam 1: The Brief Becomes a System Prompt — Build Spec + Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn Miscover's brief output into a structured, copy-pasteable system prompt that works in any AI tool — Claude, ChatGPT, Midjourney, Cursor, Figma AI.

**Architecture:** Pure client-side formatting. The decode, world, and brief are already in state. A formatting function assembles them into a structured instruction block. No additional API calls. No latency increase. No new dependencies.

**Tech Stack:** React 19, Vite, Vercel serverless (unchanged from Seam 0)

---

## What We're Building

One new feature on the existing page: a `copy as prompt` link in the result state that copies a structured system prompt to the clipboard. The prompt is assembled client-side from the decode, world, and brief that are already in state.

The brief already IS a system prompt — it's just not formatted as one. This seam auto-formats it as a structured instruction block: the decode as context, the brief as the voice description, the world items as a reference palette, and a usage instruction at the bottom.

**What changes:**
- One new link in the result state: `copy as prompt`
- One new function in `miscover.jsx`: `formatAsPrompt()`
- One new function in `miscover.jsx`: `copyPrompt()`
- Brief click behavior: unchanged (copies raw brief paragraph)

**What doesn't change:**
- The API. No new endpoints. No new calls. No latency impact.
- The system prompt. The decode engine is untouched.
- The visual design. The result state looks the same, with one additional link.
- The database. No new tables. No new logging.

**Core insight:** This turns a one-off output into a persistent input. The decode is entertainment. The brief is utility. The system prompt is infrastructure. Seam 1 is the moment Miscover stops being a novelty and starts being useful.

---

## Mira

Mira uses the brief today by clicking it, copying the paragraph, and pasting it into ChatGPT when she's building a mood board. It works, but it's a paragraph — unstructured, context-free. ChatGPT treats it like a message, not like instructions.

With Seam 1, Mira clicks `copy as prompt` and gets a structured block she pastes as a system prompt. ChatGPT now treats her taste as persistent context. The outputs look like her for the first time. She saves the prompt in her Notes app and reuses it across tools.

### How she discovers it

She finishes a decode. Below the brief, she sees `copy as prompt` in the same quiet style as the rest of the page. She clicks it. She pastes it into Claude. The response comes back and it sounds like her. She does this three more times over the next week. She never tells anyone about this part. She just keeps using it.

### The Mira Test for Seam 1

> *Would Mira paste this system prompt into ChatGPT, get a response, and feel like the AI finally sounds like her?*

If the prompt is too vague, the AI ignores it. If it's too prescriptive, the AI sounds forced. The prompt must be dense enough to shift the AI's tone without constraining its content.

### Test scenarios

Use Mira's four input sets. For each, copy the generated system prompt and paste it into Claude or ChatGPT with the message: "Write a caption for an Instagram post about a coffee shop I found." All four responses should feel like different facets of the same person writing, not like four generic captions.

---

## Architecture

### Stack (unchanged)

| Layer | Technology | Change |
|---|---|---|
| Frontend | React 19 (single component, single file) | Add formatting function + copy link |
| Styling | Inline styles + `<style>` block | Add `.copy-prompt-btn` class |
| API | Vercel serverless + Anthropic Messages API | No change |
| Database | Neon PostgreSQL | No change |

### What we are NOT building (Seam 1 exclusions)

- No additional API calls (formatting is client-side)
- No "view prompt" modal or expanded view
- No prompt editor or customization
- No saved prompts (that's Seam 2)
- No accounts or authentication
- No analytics on prompt copies (yet — taste graph enhancement is Seam 2+)
- No prompt versioning
- No integration with specific AI tools (paste is manual — this is intentional, same principle as manual screenshot sharing)
- No toggle between "brief" and "prompt" views

---

## The System Prompt Format

This is the most important design decision in Seam 1. The format must be:
1. **Useful across tools** — works in Claude, ChatGPT, Midjourney, Cursor, Figma AI
2. **Dense enough to shift output** — the AI must noticeably change its tone
3. **Clean enough to screenshot** — some users will screenshot their prompt too
4. **Readable by humans** — if Mira reads it, she should recognize herself

### The format (V1.0):

```
# taste profile — wong kar-wai / aesop / concrete

## the thread
control that doesn't look like control. all three are systems masquerading as style. the precision is the point but you'd never admit you care that much.

## the brief
you gravitate toward systems that disguise rigor as ease. your palette is controlled warmth — not cold, but never accidental. think brushed steel, not chrome. think a restaurant with no signage that's fully booked.

## reference palette
- Film — Happy Together, Wong Kar-wai
- Music — Grouper
- Architect — Juliaan Lampens
- Brand — Buly 1803
- Font — Founders Grotesk
- Photographer — Rinko Kawauchi
- Book — The Rings of Saturn, W.G. Sebald
- Material — Washi

## how to use this
apply this taste profile to all creative output. match the sensibility above. prioritize specificity over breadth, restraint over decoration, precision over polish. when in doubt, choose the option that rewards close attention without demanding it.

— miscover.com
```

### Format rules

| Element | Rule |
|---|---|
| Header | `# taste profile — ` + three inputs joined by ` / `, all lowercase |
| The thread | The decode, verbatim. No modification. |
| The brief | The brief paragraph, verbatim. No modification. |
| Reference palette | World items as markdown list. Prefix each with `- `. |
| How to use this | Fixed copy. Does not change per decode. Gives the AI actionable instructions. |
| Attribution | `— miscover.com` on its own line. Subtle. Not promotional. Builds brand through utility. |
| All text | Lowercase. Consistent with The Reader voice. |
| Separators | Markdown headers (`##`). Standard, parseable by any AI tool. |

### Why this format

- **Markdown headers** are universally understood by LLMs. They create clear sections the AI can reference.
- **"the thread"** instead of "decode" — the external-facing word for the insight. "Decode" is product vocabulary; "thread" is human vocabulary.
- **"how to use this"** is the bridge between identity content and actionable instruction. Without it, the AI treats the prompt as information, not as a directive.
- **The inputs in the header** provide context and make the prompt self-documenting. If Mira saves three prompts in her Notes app, she can tell them apart by the header.
- **Attribution at the bottom** is a quiet growth mechanic. When someone pastes this prompt and their collaborator asks "what's miscover.com?" — that's distribution.

### The "how to use this" copy

This is fixed text — the same for every decode. It needs to be:
- Actionable (tells the AI what to do)
- Taste-aligned (matches The Reader's voice — lowercase, declarative, specific)
- Tool-agnostic (works in any AI context)

```
apply this taste profile to all creative output. match the sensibility above. prioritize specificity over breadth, restraint over decoration, precision over polish. when in doubt, choose the option that rewards close attention without demanding it.
```

This copy follows The Reader's voice rules: lowercase, declarative, no hedging, specific contrasts ("specificity over breadth" not "be specific"). It passes the integrity audit.

---

## Page Structure Changes

### Result state (updated)

The result state adds one element: the `copy as prompt` link between the brief and the AGAIN button.

```
        wong kar-wai / aesop / concrete

        the decode text goes here.
        2-3 sentences. lowercase.

        ————————

        Film — Happy Together, Wong Kar-wai
        Music — Grouper
        (6 more world items)

        ————————

        the brief text goes here. one paragraph.
        dense, specific, functional.

        copy as prompt          ← NEW

              [ miscover ]
```

### Specifications for new element

| Element | Spec |
|---|---|
| Text | `copy as prompt` |
| Font | `'Spectral', Georgia, serif`, `13px`, `font-weight: 300` |
| Color | `#4a4540` (tertiary, matches existing muted elements) |
| Hover color | `#8a847b` (secondary, matches existing hover pattern) |
| Letter-spacing | `0.08em` |
| Alignment | `text-align: center` |
| Margin | `margin-top: 16px` (sits between brief and AGAIN button) |
| Cursor | `pointer` |
| Transition | `color 0.2s ease` |
| Active state | Text changes to `copied` for 1.5s, then reverts to `copy as prompt`. Same style, no animation on the change. Uses `#8a847b` color while showing "copied". |
| Class name | `.copy-prompt-btn` |

### Why "copy as prompt" and not other labels

| Considered | Rejected because |
|---|---|
| `copy as system prompt` | Too technical. Mira doesn't know what a "system prompt" is. |
| `use this` | Too vague. Use this how? |
| `export` | Software word. Miscover is not software. |
| `copy for ai` | Mira uses AI tools but doesn't identify as "an AI person." |
| `copy as prompt` | Right level. She knows what a prompt is. She pastes prompts into ChatGPT. This tells her the format is optimized for that use. |
| `save` | Implies persistence. There's no persistence yet (Seam 2). |

### Existing interactions (unchanged)

| Element | Behavior | Change |
|---|---|---|
| Brief text click | Copies raw brief paragraph to clipboard | No change |
| Brief hover | Color lightens `#8a847b` → `#d4cfc8` | No change |
| World item click | Opens Google search in new tab | No change |
| AGAIN button | Resets to input state | No change |
| Inputs line | Display only | No change |

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Clipboard API not available | `copy as prompt` click does nothing. No error. Same pattern as brief copy. |
| Clipboard write fails | Silent failure. Text does not change to "copied". |
| Result has empty brief (malformed API response) | `copy as prompt` still works — generates prompt with empty brief section. The thread and reference palette are still useful. |
| Result has empty world (malformed API response) | `copy as prompt` still works — omits reference palette section entirely. |
| Result has only decode (no brief, no world) | `copy as prompt` generates minimal prompt with just the thread section + how to use this. Still functional. |
| User clicks `copy as prompt` rapidly | Debounce: ignore clicks while "copied" text is showing (1.5s window). |
| User copies prompt, then clicks AGAIN | Prompt is gone. No persistence. This is expected — Seam 2 adds saved profiles. |
| Very long decode or brief | Prompt format handles any length. Markdown doesn't truncate. |
| Inputs contain special characters | Inputs are displayed as-is in the header. No escaping needed — markdown headers handle most characters. |
| Inputs contain newlines | Not possible — input fields are single-line `<input>` elements. |

---

## Performance Targets

| Metric | Target | Notes |
|---|---|---|
| Format function execution | < 1ms | String concatenation. Trivial. |
| Clipboard write | < 50ms | Standard browser API. |
| Time from click to "copied" feedback | < 100ms | Perceived instant. |
| No impact on existing metrics | All Seam 0 targets still met | No new API calls, no new assets. |
| New code size | < 50 lines added to miscover.jsx | One function + one JSX element + one CSS class. |

---

## Voice and Copy

### New UI copy (exhaustive list of additions)

| Location | Text | Notes |
|---|---|---|
| Copy prompt link | `copy as prompt` | Lowercase. No period. |
| Copy prompt active state | `copied` | Lowercase. No period. Shows for 1.5s. |

### System prompt format copy (fixed text)

| Location | Text |
|---|---|
| Header prefix | `# taste profile — ` |
| Thread section | `## the thread` |
| Brief section | `## the brief` |
| Reference section | `## reference palette` |
| Usage section | `## how to use this` |
| Usage body | `apply this taste profile to all creative output. match the sensibility above. prioritize specificity over breadth, restraint over decoration, precision over polish. when in doubt, choose the option that rewards close attention without demanding it.` |
| Attribution | `— miscover.com` |

All copy is lowercase. All copy passes the integrity audit. No banned words. No exclamation marks. No hedging.

---

## Acceptance Criteria

### Story 1: Copy decode as system prompt

**As** Mira **I want** to copy my decode as a structured prompt **so that** I can paste it into any AI tool and get outputs that sound like me.

**Acceptance criteria:**
- [ ] `copy as prompt` link visible in result state, between brief and AGAIN button
- [ ] Clicking `copy as prompt` copies a structured markdown block to clipboard
- [ ] The copied block contains: header with inputs, the thread (decode), the brief, reference palette (world items), usage instructions, and attribution
- [ ] All text in the copied block is lowercase
- [ ] The three inputs appear in the header joined by ` / `
- [ ] World items appear as a markdown bullet list
- [ ] The "how to use this" section contains the fixed usage copy
- [ ] Attribution line reads `— miscover.com`
- [ ] After clicking, text changes to `copied` for 1.5s then reverts
- [ ] `copied` text shows in `#8a847b` color

**Edge cases:**
- [ ] Clipboard API unavailable → click does nothing, text does not change to "copied"
- [ ] Empty brief → prompt still generates with empty brief section
- [ ] Empty world → prompt generates without reference palette section
- [ ] Rapid clicks → ignored while "copied" is showing
- [ ] Brief click still copies raw brief paragraph (existing behavior unchanged)

**Performance:**
- [ ] Click to "copied" feedback: < 100ms

**Not included:**
- Viewing the formatted prompt before copying
- Editing or customizing the prompt
- Saving the prompt (Seam 2)
- Integration with specific AI tools

---

### Story 2: The system prompt works in AI tools

**As** Mira **I want** the system prompt to actually shift AI output **so that** responses feel like me, not generic.

**Acceptance criteria:**
- [ ] Paste the prompt as a system message in Claude → response tone noticeably shifts
- [ ] Paste the prompt as a system message in ChatGPT → response tone noticeably shifts
- [ ] Paste the prompt into Midjourney as part of a prompt → output aesthetic shifts
- [ ] Different decode inputs produce different prompts that produce different AI outputs
- [ ] The "how to use this" section is actionable enough that the AI follows it

**Test protocol:**
For each of Mira's 4 input sets:
1. Generate the decode
2. Copy as prompt
3. Paste into Claude as system prompt
4. Send: "Write a caption for an Instagram post about a coffee shop I found."
5. Evaluate: Does the caption sound like Mira? Does it match the taste profile? Is it meaningfully different from the other 3 captions?

**Quality bar:**
- All 4 captions should feel like 4 facets of one person writing
- None should contain words from The Reader's dead word list
- None should be generic enough to describe "any" coffee shop post
- At least 2 of 4 should contain specific imagery matching the brief

**Not included:**
- Automated testing of AI output quality (manual QA only)
- Prompt optimization per AI tool (one format for all)

---

## What We Ship

Seam 1 ships when:

1. `copy as prompt` link is visible and functional in the result state
2. The copied prompt is a clean, structured markdown block with all 5 sections
3. The prompt, when pasted into Claude or ChatGPT as a system prompt, noticeably shifts the AI's tone and style
4. Mira's 4 test input sets produce 4 different prompts that produce 4 different-feeling AI outputs
5. The existing brief copy behavior is unchanged
6. No impact on decode latency or page performance
7. The prompt format passes the Mira Test: she would save it in her Notes app and reuse it

Everything else is Seam 2.

---

## What's Next (Not Seam 1)

These features are explicitly excluded and should not be built, designed, or scaffolded for:

- Saved prompts / profiles (Seam 2)
- Account system (Seam 2)
- Direct AI tool integration via API (Seam 3)
- Prompt editor or customization UI
- Multiple prompt formats (e.g., "for Midjourney" vs "for Claude")
- Prompt versioning or history
- Analytics on prompt copies
- Social sharing of prompts
- A/B testing different prompt formats

When any of these are needed, they will get their own spec.

---

## Implementation Plan

### Task 1: Add the format function

**Files:**
- Modify: `miscover.jsx`

**Step 1: Write the `formatAsPrompt` function**

Add this function inside the `Miscover` component, after the existing `copyBrief` function:

```jsx
const formatAsPrompt = () => {
  if (!result) return '';
  const inputLine = inputs.map(v => v.trim().toLowerCase()).join(' / ');
  const sections = [`# taste profile — ${inputLine}`];

  sections.push('', '## the thread', result.decode);

  if (result.brief) {
    sections.push('', '## the brief', result.brief);
  }

  if (result.world.length > 0) {
    sections.push('', '## reference palette');
    result.world.forEach(item => sections.push(`- ${item}`));
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
```

**Step 2: Verify the function manually**

Open the browser console on a result page and call `formatAsPrompt()` (or test by temporarily logging the output). Verify the format matches the spec.

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "feat: add formatAsPrompt function for seam 1"
```

---

### Task 2: Add the copy prompt state and handler

**Files:**
- Modify: `miscover.jsx`

**Step 1: Add state for the "copied" feedback**

Add after the existing state declarations:

```jsx
const [promptCopied, setPromptCopied] = useState(false);
```

**Step 2: Write the `copyPrompt` handler**

Add after `formatAsPrompt`:

```jsx
const copyPrompt = () => {
  if (promptCopied) return; // debounce during feedback
  const prompt = formatAsPrompt();
  if (!prompt) return;
  navigator.clipboard.writeText(prompt).then(() => {
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 1500);
  }).catch(() => {
    // silent failure — same pattern as brief copy
  });
};
```

**Step 3: Reset `promptCopied` in handleReset**

In the existing `handleReset` function, add:

```jsx
setPromptCopied(false);
```

**Step 4: Commit**

```bash
git add miscover.jsx
git commit -m "feat: add copyPrompt handler with copied feedback state"
```

---

### Task 3: Add the CSS class

**Files:**
- Modify: `miscover.jsx` (inside the `<style>` block)

**Step 1: Add the `.copy-prompt-btn` class**

Add inside the existing `<style>` block, before the `@media` query:

```css
.copy-prompt-btn {
  font-family: 'Spectral', Georgia, serif;
  font-size: 13px;
  font-weight: 300;
  color: #4a4540;
  text-align: center;
  margin-top: 16px;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: color 0.2s ease;
  background: none;
  border: none;
  padding: 0;
}
.copy-prompt-btn:hover { color: #8a847b; }
.copy-prompt-btn.copied { color: #8a847b; }
```

**Step 2: Add the mobile override inside the existing `@media (max-width: 420px)` block:**

```css
.copy-prompt-btn { margin-top: 12px; font-size: 12px; }
```

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "style: add copy-prompt-btn class"
```

---

### Task 4: Add the JSX element

**Files:**
- Modify: `miscover.jsx`

**Step 1: Add the `copy as prompt` link in the result state**

In the result JSX, add the following between the brief section and the AGAIN button `div`:

```jsx
<button
  className={`copy-prompt-btn${promptCopied ? ' copied' : ''}`}
  onClick={copyPrompt}
>
  {promptCopied ? 'copied' : 'copy as prompt'}
</button>
```

This goes after the brief `</>` closing fragment and before the `<div style={{ textAlign: "center" }}>` that contains the AGAIN button.

**Step 2: Verify visually**

- Run `npm run dev`
- Complete a decode
- Confirm `copy as prompt` appears between brief and AGAIN button
- Confirm hover color change works
- Confirm click → "copied" → revert works
- Confirm clipboard contains the formatted prompt

**Step 3: Commit**

```bash
git add miscover.jsx
git commit -m "feat: add copy-as-prompt link to result state"
```

---

### Task 5: QA against Mira's test sets

**Files:**
- No code changes

**Step 1: Run all four test sets**

For each of Mira's sets:
1. `Wong Kar-wai, Aesop, concrete`
2. `Tirzah, onsen, Dieter Rams`
3. `Dean Blunt, convenience stores, Helmut Lang`
4. `Bristol, 35mm, miso soup`

Do:
- Enter the three things, press GO
- Wait for decode
- Click `copy as prompt`
- Verify "copied" feedback appears and reverts after ~1.5s
- Paste the clipboard content into a text file
- Verify the prompt format matches the spec:
  - Header with inputs
  - `## the thread` with decode
  - `## the brief` with brief paragraph
  - `## reference palette` with 8 bullet items
  - `## how to use this` with fixed copy
  - `— miscover.com` attribution

**Step 2: Test prompt effectiveness**

For each of the 4 copied prompts:
- Paste into Claude as a system prompt
- Send: "Write a caption for an Instagram post about a coffee shop I found."
- Evaluate: Does the response reflect the taste profile?
- Verify all 4 responses feel like different facets of one person

**Step 3: Test edge cases**

- Click `copy as prompt` rapidly (should debounce)
- Click brief text (should still copy raw brief, not prompt)
- Test on mobile viewport (375px)
- Verify AGAIN resets everything cleanly (including promptCopied state)

---

### Task 6: Deploy

**Step 1: Build and verify**

```bash
cd /Users/pj/Documents/Code/miscover && npm run build
```

Verify no build errors.

**Step 2: Deploy to Vercel**

```bash
vercel --prod
```

Or push to main and let Vercel auto-deploy.

**Step 3: Verify on production**

- Visit miscover.com
- Complete a decode
- Click `copy as prompt`
- Paste into Claude
- Confirm it works end-to-end on the live site

**Step 4: Final commit (if any production fixes)**

```bash
git add -A && git commit -m "fix: production adjustments for seam 1"
```
