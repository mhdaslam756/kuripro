---
name: KuriPro
description: A calm, exact chit-fund ledger for organizers working from a phone, with violet as its one confident accent.
colors:
  violet: "#7c3aed"
  violet-deep: "#6d28d9"
  violet-bright: "#8b5cf6"
  violet-tint: "#ede9fe"
  ink: "#0f172a"
  slate: "#64748b"
  mist: "#94a3b8"
  app-wash: "#f8f9fc"
  paper: "#ffffff"
  paper-raised: "#f1f4f9"
  hairline: "#e2e8f0"
  hairline-strong: "#cbd5e1"
  paid-green: "#16a34a"
  paid-green-strong: "#15803d"
  pending-amber: "#d97706"
  overdue-red: "#dc2626"
  info-blue: "#2563eb"
  night-wash: "#090614"
  night-paper: "#120d22"
  night-raised: "#1a1330"
  night-elevated: "#221a3e"
  night-hairline: "#2a2340"
  night-hairline-strong: "#3d335c"
typography:
  page-title:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  figure:
    fontFamily: "Outfit, Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    fontFeature: "tnum"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  sheet: "32px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.violet-deep}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 18px"
  button-confirm:
    backgroundColor: "{colors.paid-green-strong}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.overdue-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "20px"
  badge:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.slate}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
---

# Design System: KuriPro

## Overview

**Creative North Star: "The Pocket Ledger"**

KuriPro is an account book that fits in an organizer's pocket. It is used on a mid-range Android phone, often away from a desk, to collect instalments, settle auctions and pay winners, so every screen has to feel exact before it feels pretty. Numbers read first; chrome stays quiet; the one confident accent, violet, marks what can be acted on and where you are.

The system is calm, precise and reassuring. Surfaces are white paper on a faintly cool wash, separated by hairlines rather than heavy shadow. Money is set in tabular figures so columns line up and amounts never jump. Controls are tactile: generous radii, 44px touch targets, and a small press-down response so a tap always feels received. A richer violet gradient appears only on hero surfaces (the member balance card, the primary tab action) where the product wants to feel like a bank, not a spreadsheet.

Both a light and a dark theme are first-class; dark is a deep violet-black, not neutral grey, so the brand holds in both.

**Key Characteristics:**
- Violet is the single accent; green, amber and red are reserved for payment state.
- Hairline borders and white paper carry structure; shadow is a whisper (`shadow-xs`) at rest.
- Large rounded corners (16px cards and buttons, 10px fields) and bottom-sheet dialogs on phones.
- 44px minimum touch targets; 16px input text on phones to stop mobile zoom.
- Tabular numerals for every amount; INR with lakh grouping.
- Press feedback (scale to 0.96–0.97) on tappable surfaces.

## Colors

A quiet cool-neutral base with one violet voice, and a separate, strictly functional set of status colors.

### Primary
- **Ledger Violet** (#7c3aed): the accent. Links, active tab, focus ring, selection, brand text. In dark mode it lifts to **Bright Violet** (#8b5cf6) so it stays visible.
- **Deep Violet** (#6d28d9): the primary button and hero gradient start; carries white text at 7.1:1.
- **Bright Violet** (#8b5cf6): gradient end and dark-mode accent.
- **Violet Tint** (#ede9fe): elevated fills and selected-row washes in light mode.

### Neutral
- **Ink** (#0f172a): primary text, 17.9:1 on paper.
- **Slate** (#64748b): secondary text, icons; 4.8:1 on paper.
- **Mist** (#94a3b8): disabled text and placeholders only; below AA, so never for information.
- **App Wash** (#f8f9fc): the page background, with a soft violet glow at the very top.
- **Paper** (#ffffff) and **Raised Paper** (#f1f4f9): cards and fields, and table headers and quiet wells.
- **Hairline** (#e2e8f0) and **Strong Hairline** (#cbd5e1): borders and dividers.
- Dark theme: **Night Wash** (#090614), **Night Paper** (#120d22), **Night Raised** (#1a1330), **Night Elevated** (#221a3e), borders **#2a2340** / **#3d335c**, text white and a cool grey.

### Status (functional only)
- **Paid Green** (#16a34a, dark #22c55e), **Pending Amber** (#d97706, dark #f59e0b), **Overdue Red** (#dc2626, dark #ef4444), **Info Blue** (#2563eb, dark #3b82f6). Each pairs with a 12% tint fill and a 28% tint border for badges and alerts.
- **Strong Paid Green** (#15803d light, #22c55e dark; token `good-strong`): the AA-safe green for small text and for solid confirm buttons with white text (about 5:1). Use it instead of Paid Green wherever green is text or a button fill.

### Named Rules
**The One Voice Rule.** Violet is the only decorative color. Green, amber and red mean payment state and nothing else; they are never used to decorate.
**The Number-First Rule.** On any money screen the amount is the largest, highest-contrast element, in tabular figures.

## Typography

**Display Font:** Outfit (with Inter and the system UI font as fallback)
**Body Font:** Inter (with the system UI font as fallback)

**Character:** A friendly geometric display face over a neutral workhorse sans. Note that the project declares Outfit and Inter but does not load either, so today the app renders in the device's system font (including Malayalam, which relies on the system Malayalam font). Loading real fonts, with Malayalam coverage, is an open decision.

### Hierarchy
- **Page title** (600–700, 1.5rem → 1.875rem from `sm`, tight tracking): one per screen.
- **Title** (600, 1.125rem): card titles and dialog titles.
- **Figure** (600, 1.125rem, tabular): stats such as prize, discount and commission.
- **Body** (400, 0.875rem, 1.5): default text; inputs become 1rem on phones.
- **Label** (600, 0.75rem, +0.04em, often uppercase): stat captions and section labels.
- **Tab caption** (600–700, 0.625rem): bottom tab labels. This is below a comfortable reading size and is a known gap.

### Named Rules
**The Tabular Rule.** Every amount, count and date column uses tabular numerals so figures align and don't shift on update.
**The 16px Field Rule.** Form fields are 16px on phones so the browser never zooms on focus.

## Layout

Mobile first. Content is a single column with 16px page gutters and 16–20px card padding, widening to a multi-column grid from the `sm` and `lg` breakpoints. A fixed bottom tab bar (with a safe-area inset) carries navigation below `lg`; a sidebar takes over above it. The common unit of spacing is 4/8/12/16/20/24px; sections are separated by whitespace and hairlines, not boxes within boxes. Tables sit in a horizontally scrolling container with a 540px minimum width on phones, and are paired with a card list on small screens for the main rosters.

## Elevation & Depth

Flat by default. Cards rest on a hairline and a barely-there `shadow-xs`; depth comes from tonal layering (paper on wash, raised paper for wells) in light mode and from stepping up the violet-black ramp in dark mode. Heavier shadow (`shadow-2xl`) is reserved for dialogs and sheets, over a `bg-black/50` blurred overlay. The bottom tab bar is the one translucent, blurred element.

### Shadow Vocabulary
- **Whisper** (`shadow-xs`): cards, inputs, outline buttons at rest (the dominant treatment).
- **Lift** (`shadow-sm`/`shadow-md`): table containers, raised actions.
- **Float** (`shadow-lg`, accent-tinted for the primary tab pill): the one prominent action.
- **Sheet** (`shadow-2xl`): dialogs and sheets only.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Stronger shadow belongs to overlays, not to ordinary cards.

## Shapes

Generously rounded, never sharp. Cards and buttons use 16px; fields use 10px; small buttons 12px; badges are full pills; dialogs are a 32px-topped bottom sheet on phones (with a grab handle) and a 16px centered panel from `sm`. The result is a soft, friendly silhouette that stays orderly because radii come from one scale.

## Components

### Buttons
- **Shape:** 16px radius (12px for the small size); 36 / 44 / 48px heights.
- **Primary:** a diagonal violet gradient (#6d28d9 to #8b5cf6) with white text, a faint violet shadow and a 1px translucent violet border.
- **Confirm:** a solid Strong Paid Green (#15803d) with white text, used once per screen for the action that records money paid (Confirm Payout, Confirm Payment).
- **Outline / Secondary:** paper fill, hairline border, ink text; hover darkens the border toward violet. Secondary uses the raised-paper fill.
- **Destructive:** solid red (#ef4444) with white text; used for irreversible actions and kept out of the primary position.
- **Hover / Focus / Press:** a 2px violet focus ring with offset; pressing scales to 0.97; disabled drops to 40% opacity.

### Cards / Containers
- **Corner Style:** 16px. **Background:** paper. **Border:** hairline at 80%. **Shadow:** Whisper.
- **Padding:** 16px on phones, 20px from `sm`. Titles use the Title style in the display face.

### Inputs / Fields
- **Style:** 44px tall, 10px radius, paper fill, hairline border, ink text, Mist placeholder.
- **Focus:** violet border with a 2px violet ring at 50%.
- **Error / Disabled:** red helper text under the field; disabled drops to 50% opacity.

### Badges
- Full pills with a tinted fill and tinted border: neutral, success, warning, danger, info and brand. Used for payment and membership state.

### Navigation
- **Phone:** a fixed, blurred bottom tab bar. The active tab gets a violet-tinted pill and a small pip; one primary action is a raised violet gradient pill. A "More" tab opens the rest.
- **Desktop:** a sidebar with 10px-cornered links and a segmented theme toggle. Tables use the same 10px corner.

### Dialogs
- A bottom sheet on phones (grab handle, 32px top radius, safe-area padding), a centered panel from `sm`; the close control is a 32px round button.

### Money panels (signature)
- Stat grids of a small uppercase label over a tabular figure, set inside a tinted callout, for example the green "winner" block on the auction settlement card. Its single green Confirm button reads "Confirm Payout – amount"; secondary actions (Minutes PDF, Winner PDF) are small outline buttons, and risky ones (Re-pick winner) sit in a "More actions" menu.

## Do's and Don'ts

### Do:
- **Do** use violet only as the accent, and reserve green/amber/red for payment state.
- **Do** show amounts as INR with lakh grouping in tabular figures, largest on the screen.
- **Do** keep every tappable target at least 44px and give it press feedback.
- **Do** make the next correct action the single prominent one, and tuck risky actions (re-pick, replace) into a quieter menu with a confirmation.
- **Do** use Strong Paid Green for green text and for solid green buttons.
- **Do** keep inputs at 16px on phones and surfaces flat with hairline borders.

### Don't:
- **Don't** convey state with color alone; pair it with a label or icon.
- **Don't** use Mist (#94a3b8), plain Paid Green or Pending Amber as small text on white or on their own tint; they fall below AA.
- **Don't** put heavy shadows on ordinary cards or add more than one gradient hero per screen.
- **Don't** shrink tab captions or secondary text below 12px for new work.
- **Don't** hard-code colors: use the CSS variables so light and dark both work (the Confirm button's fixed #15803d is the one deliberate exception).

### Known accessibility gaps (measured)
- Slate on Raised Paper is 4.3:1 (just under 4.5:1).
- Pending Amber is 3.2:1 on white and 2.8:1 on its tint; it fails AA for small text in the light theme. Paid Green as small text is fixed on the settlement card only; elsewhere the plain Paid Green (3.3:1 on white, 2.9:1 on its tint) is still in use.
- The primary button's gradient end (#8b5cf6) under white text is 4.2:1.
- Dark theme: Bright Violet on Night Paper is 4.5:1 (borderline) and the dark disabled text is 3.9:1.
- Bottom tab captions are 10px.
