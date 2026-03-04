# Miscover V2: Warm Editorial Redesign

**Date:** 2026-03-04
**Status:** Approved

## Problem

The current design (Courier Prime on #111) reads as developer minimalism — clinical, cold, indistinguishable from a terminal. Screenshots don't land in social feeds. The design feels disconnected from the voice (warm, personal, declarative) and from Mira's taste (literary, considered, sensory). People see a dev tool, not something built by someone with taste.

## Direction: Warm Editorial

Shift from "developer minimalism" (absence as default) to "curatorial restraint" (every element chosen with feeling). Think independent magazine, not terminal. The design should feel like someone who reads W.G. Sebald and organizes Are.na by feeling built this at 3am — not someone who lives in a terminal.

## Color Palette

| Role | Current | V2 | Rationale |
|------|---------|-----|-----------|
| Ground | `#111111` | `#1a1918` | Warm dark. Wong Kar-wai lives here. |
| Primary text | `#cccccc` | `#d4cfc8` | Warm cream. Like text on unbleached paper. |
| Secondary text | `#777777` | `#8a847b` | Warm mid. Domain labels in World section. |
| Muted/placeholder | `#555555` | `#4a4540` | Warm mute. Input placeholders. |
| Borders | `#333333` | `#2a2725` | Warm border. Input underlines. |
| Separator | — | `#3a3530` | Thin rules between sections. |

No accent color. Warmth comes from ground temperature and type, not from color.

## Typography

Single font family: **Spectral** (Google Fonts, variable, free. Designed by Production Type, Paris.)

| Element | Weight/Style | Size | Line-height |
|---------|-------------|------|-------------|
| Decode | Regular 400 | 18px | ~1.6 |
| World domains | Light 300 | 14px | ~1.5 |
| World values | Regular 400 | 14px | ~1.5 |
| Brief | Italic 400 | 16px | ~1.6 |
| Inputs | Light 300 | 18px | — |
| Placeholders | Light Italic 300 | 18px | — |
| Button | Regular 400, letter-spacing 0.15em | 14px | — |
| Watermark | Light 300 | 12px | — |

Weight and style create hierarchy, not size jumps. One font, one voice, multiple registers.

## Layout

### Input State

- Three input fields, centered, bottom-border only (no box), border color `#2a2725`
- Placeholders in Light Italic: *first thing*, *second thing*, *third thing*
- Button: plain text "decode" with letter-spacing 0.15em, no background. Subtle bottom border on hover.
- Max generous whitespace. The emptiness is intentional.

### Result State

- Inputs displayed as: `wong kar-wai · aesop · concrete` (dot-separated, Spectral Light)
- Thin rule separator (1px solid `#3a3530`)
- Decode text in Spectral Regular, 18px
- Thin rule
- World section: domain labels left-aligned in Light 300 secondary color, values in Regular primary color
- Thin rule
- Brief in Spectral Italic — register shift signals "this is the takeaway"
- Watermark: `miscover.com` bottom-right, Light 12px, secondary color

### Spacing

More generous vertical rhythm than V1. Let the text breathe. The space is the design.

## Animation

- Keep fade-up (0.8s ease) on result appear
- Keep pulsing dots loader — render in `#d4cfc8`
- No additional animation. Stillness is the point.

## Screenshot Optimization

The result card is the only marketing asset:

- Warm dark + cream text pops in both light and dark social feeds
- Spectral serif is instantly recognizable vs. every monospace screenshot on the internet
- Italic brief at bottom gives visual closure
- Thin rules create structure without weight
- `miscover.com` watermark stays subtle but present

## What Doesn't Change

- Dark-only. No light mode.
- No logo, no nav, no footer, no share buttons.
- Single page, single function.
- Lowercase output.
- URL as brand.
- The Reader voice (system prompt) — unchanged.
- The Mira Test applies to everything.

## What This Fixes

| Problem | Solution |
|---------|----------|
| Screenshots don't land | Serif on warm dark is distinctive — no one else looks like this |
| Feels too cold | Warm ground + warm text + literary type = emotional warmth without decoration |
| Looks like a dev tool | Spectral serif immediately signals editorial/literary, not terminal |
| Not memorable | "The one with the serif on dark" — instantly recognizable |

## The Mira Test

1. **Would she screenshot this?** Yes — it looks like an Are.na block she'd save to "things that feel correct"
2. **Would she use this word?** N/A (design, not copy)
3. **Would she tolerate this much UI?** Yes — even less chrome than before
4. **Would she come back?** Yes — it feels like her taste reflected back in a considered container
5. **Would she send with no context?** Yes — the serif + warm dark is the context
6. **Would she paste the brief?** Unchanged — still functional
