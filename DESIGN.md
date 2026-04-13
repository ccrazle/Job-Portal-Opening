# One Group Developers — DESIGN.md Master Overlay

> **What this file is:** The single source of truth for One Group branding. This document is consumed by three systems:
> 1. **Developers** read Part 1 for brand guidelines
> 2. **AI converters** read Part 2 for deterministic token mapping during Stitch conversion
> 3. **Build systems** read Part 3 for CSS variable definitions
>
> This is a **master overlay** — it applies on top of any base theme (shadcn, Samsung One UI, or future themes). The brand accent, canvas, typography, and logo are non-negotiable constants that override theme-specific accents.

---

## Part 1: Brand Guide

### Visual Theme & Atmosphere

One Group's interface is a warm editorial design — unhurried, intellectual, and quietly authoritative. The experience is built on a warm cream canvas (`#f5f3ed`) that feels like quality paper rather than a digital surface. The signature brand color is a deep, corporate red (`#762224`) used sparingly for primary CTAs and brand moments. Every gray in the system carries a warm yellow-brown undertone — there are no cool blue-grays anywhere.

Typography uses the Anthropic type family: Serif for headlines (weight 500, editorial gravitas), Sans for UI and body text, Mono for code. This serif/sans split creates a literary hierarchy that says "thoughtful tool" rather than "generic dashboard."

**Key Characteristics:**
- Warm cream canvas (`#f5f3ed`) — not pure white, not cold gray
- One Group Red (`#762224`) — deep, corporate, used only for primary CTAs
- Bright Crimson accent (`#c45a5c`) — lighter red for links on dark, hover states
- Exclusively warm-toned neutrals — every gray has a yellow-brown undertone
- Ring-based shadow system (`0px 0px 0px 1px`) — border-like depth without visible borders
- Editorial serif/sans typography hierarchy

### Logo Usage

- Light surfaces: "ONE GROUP" in One Group Red `#762224`
- Dark surfaces: "ONE GROUP" in `#fffcf8`
- Logo files: SVG preferred, stored in `/public/images/`

### Color Palette

#### Brand Colors (Overrides)

| Token Role | Name | Hex | Usage |
|------------|------|-----|-------|
| Brand Accent | One Group Red | `#762224` | Primary CTAs, brand moments |
| Accent Light | Bright Crimson | `#c45a5c` | Links on dark, hover, secondary emphasis |
| Page Canvas | Warm Cream | `#f5f3ed` | Primary light background |
| Card Surface | Pure White | `#ffffff` | Cards, elevated containers |
| Dark Surface | Charcoal | `#323234` | Dark-theme containers, nav |
| Deep Dark | Cool Deep Black | `#121214` | Dark-theme page background |
| Error | Bright Alert Red | `#d4453a` | Error states — NOT brand red |

#### Neutral Colors (Kept)

| Token Role | Name | Hex |
|------------|------|-----|
| Secondary Button BG | Warm Sand | `#e8e6dc` |
| Button Text | Charcoal Warm | `#4d4c48` |
| Primary Text | Near Black | `#141413` |
| Secondary Text | Olive Gray | `#5e5d59` |
| Tertiary Text | Stone Gray | `#87867f` |
| Dark Mode Text | Warm Silver | `#b0aea5` |
| Dark Text Links | Dark Warm | `#3d3d3a` |
| Borders (light) | Border Cream | `#f0eee6` |
| Borders (prominent) | Border Warm | `#e8e6dc` |
| Borders (dark) | Border Dark | `#323234` |
| Ring Shadow | Ring Warm | `#d1cfc5` |
| Focus Ring | Focus Blue | `#3898ec` |

### Typography

**Font families:**
- Headlines: Anthropic Serif (weight 500, fallback: Georgia)
- Body / UI: Anthropic Sans (weight 400-500, fallback: Inter)
- Code: Anthropic Mono (weight 400, fallback: JetBrains Mono)

**Font files:** `/public/fonts/anthropic/` (6 WOFF2 files)

> **LICENSING WARNING:** Anthropic fonts are for INTERNAL USE ONLY. For public-facing products, external docs, client portals, or any UI visible to non-employees, use fallback fonts (Georgia, Inter, JetBrains Mono). See ONE-GROUP-STYLE.md for full warning.

**Hierarchy:**

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| Display / Hero | Anthropic Serif | 64px (4rem) | 500 | 1.10 |
| Section Heading | Anthropic Serif | 52px (3.25rem) | 500 | 1.20 |
| Sub-heading Large | Anthropic Serif | 36px (~2.3rem) | 500 | 1.30 |
| Sub-heading | Anthropic Serif | 32px (2rem) | 500 | 1.10 |
| Sub-heading Small | Anthropic Serif | 25px (~1.6rem) | 500 | 1.20 |
| Feature Title | Anthropic Serif | 20.8px (1.3rem) | 500 | 1.20 |
| Body Serif | Anthropic Serif | 17px (1.06rem) | 400 | 1.60 |
| Body Large | Anthropic Sans | 20px (1.25rem) | 400 | 1.60 |
| Body / Nav | Anthropic Sans | 17px (1.06rem) | 400-500 | 1.00-1.60 |
| Body Standard | Anthropic Sans | 16px (1rem) | 400-500 | 1.25-1.60 |
| Body Small | Anthropic Sans | 15px (0.94rem) | 400-500 | 1.00-1.60 |
| Caption | Anthropic Sans | 14px (0.88rem) | 400 | 1.43 |
| Label | Anthropic Sans | 12px (0.75rem) | 400-500 | 1.25-1.60 |
| Overline | Anthropic Sans | 10px (0.63rem) | 400 | 1.60 |
| Code | Anthropic Mono | 15px (0.94rem) | 400 | 1.60 |

### Component Styling

**Buttons:**

| Variant | Background | Text | Radius | Shadow |
|---------|-----------|------|--------|--------|
| Primary CTA | `#762224` | `#fffcf8` | 8-12px | ring `0px 0px 0px 1px #762224` |
| Secondary | `#e8e6dc` | `#4d4c48` | 8px | ring `0px 0px 0px 1px #d1cfc5` |
| Dark | `#323234` | `#fffcf8` | 8px | ring `0px 0px 0px 1px #323234` |
| White Surface | `#ffffff` | `#141413` | 12px | none |
| Dark Primary | `#121214` | `#b0aea5` | 12px | border `1px solid #323234` |

**Cards & Containers:**
- Light surface: `#ffffff` with `1px solid #f0eee6` border, 8px radius (standard), 16px (featured)
- Dark surface: `#323234` with `1px solid #323234` border
- Whisper shadow for elevated: `rgba(0,0,0,0.05) 0px 4px 24px`

**Inputs & Forms:**
- Background: `#ffffff` (brightest element in the system)
- Border: `1px solid #f0eee6`
- Focus: `#3898ec` border + `0 0 0 2px rgba(56,152,236,0.2)` ring
- Radius: 12px

**Navigation:**
- Logo: "ONE GROUP" in One Group Red `#762224` (light) or `#fffcf8` (dark)
- Links: `#141413` primary, `#5e5d59` secondary (light); `#b0aea5` (dark)
- Accent links: `#c45a5c` Bright Crimson
- CTA button: One Group Red primary button

**Error States:**
- Color: Bright Alert Red `#d4453a`
- Background: `#fef2f2` (light), inline with dark card (dark)
- Distinct from brand red `#762224` — brighter and more orange

### Layout & Spacing

- Base unit: 8px
- Scale: 3px, 4px, 6px, 8px, 10px, 12px, 16px, 20px, 24px, 30px
- Button padding: asymmetric (0px 12px 0px 8px) or balanced (8px 16px)
- Card internal padding: 24-32px
- Section vertical spacing: 80-120px between major sections
- Max container: ~1200px centered

### Border Radius Scale

- Sharp (4px): Minimal inline elements
- Subtly rounded (6-7.5px): Small buttons, secondary interactive elements
- Comfortably rounded (8-8.5px): Standard buttons, cards, containers
- Generously rounded (12px): Primary buttons, input fields, nav elements
- Very rounded (16px): Featured containers, video players
- Highly rounded (24px): Tag-like elements
- Maximum rounded (32px): Hero containers, embedded media

### Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, no border | Canvas background, inline text |
| Contained (Level 1) | `1px solid #f0eee6` (light) or `1px solid #323234` (dark) | Standard cards, sections |
| Ring (Level 2) | `0px 0px 0px 1px` ring shadows using warm grays | Interactive cards, buttons, hover states |
| Whisper (Level 3) | `rgba(0,0,0,0.05) 0px 4px 24px` | Elevated feature cards, product screenshots |
| Inset (Level 4) | `inset 0px 0px 0px 1px` at 15% opacity | Active/pressed button states |

### Responsive Behavior

| Breakpoint | Width | Key Changes |
|-----------|-------|-------------|
| Small Mobile | <479px | Stacked, compact typography |
| Mobile | 479-640px | Single column, hamburger nav |
| Large Mobile | 640-767px | Slightly wider content area |
| Tablet | 768-991px | 2-column grids begin |
| Desktop | 992px+ | Full multi-column layout, 64px hero type |

### Do's and Don'ts

**Do:**
- Use Warm Cream `#f5f3ed` as the primary light background
- Use Anthropic Serif at weight 500 for all headlines
- Use One Group Red `#762224` only for primary CTAs and brand moments
- Keep all neutrals warm-toned — every gray should have a yellow-brown undertone
- Use ring shadows (`0px 0px 0px 1px`) for interactive element states
- Use Bright Alert Red `#d4453a` for errors — never brand red
- Maintain the editorial serif/sans hierarchy
- Use generous body line-height (1.60)
- Alternate between light and dark sections for chapter-like page rhythm
- Apply generous border-radius (12-32px) for a soft, approachable feel

**Don't:**
- Don't use brand red `#762224` for error states — use `#d4453a`
- Don't use cool blue-grays anywhere — palette is exclusively warm-toned
- Don't use bold (700+) weight on Anthropic Serif — weight 500 is the ceiling
- Don't introduce saturated colors beyond the defined palette
- Don't use sharp corners (<6px radius) on buttons or cards
- Don't use Anthropic fonts in public-facing products (licensing)
- Don't hardcode hex values in components — always use CSS variables
- Don't modify layout classes during Strict Skin Mode conversion
- Don't use pure white (`#ffffff`) as a page background — use `#f5f3ed`
- Don't reduce body line-height below 1.40

---

## Part 2: AI Conversion Token Map

> **For AI converters:** Read this section when converting Stitch/design tool exports. Every skin class gets a deterministic mapping. Layout classes pass through untouched.

### Skin Class Replacements

| Stitch / Source Class | One Group Token | CSS Variable | Resolved Value |
|----------------------|-----------------|-------------|----------------|
| `bg-blue-*`, `bg-indigo-*`, `bg-primary-*` | `bg-primary` | `--primary` | `#762224` |
| `bg-gray-50`, `bg-gray-100`, `bg-slate-50` | `bg-background` | `--background` | `#f5f3ed` |
| `bg-white` | `bg-card` | `--card` | `#ffffff` |
| `bg-gray-800`, `bg-gray-900`, `bg-slate-800` | `bg-card` (dark) | `--card` | `#323234` |
| `bg-gray-200`, `bg-slate-200` | `bg-secondary` | `--secondary` | `#e8e6dc` |
| `bg-gray-100`, `bg-slate-100` | `bg-muted` | `--muted` | `#f0eee6` |
| `bg-red-50`, `bg-red-100` | `bg-destructive/10` | `--destructive` | `#d4453a` |
| `text-gray-900`, `text-slate-900`, `text-black` | `text-foreground` | `--foreground` | `#141413` |
| `text-gray-600`, `text-slate-600` | `text-muted-foreground` | `--muted-foreground` | `#5e5d59` |
| `text-gray-400`, `text-slate-400` | `text-muted-foreground` | `--muted-foreground` | `#87867f` |
| `text-gray-500`, `text-slate-500` | `text-muted-foreground` | `--muted-foreground` | `#87867f` |
| `text-blue-*`, `text-primary-*` | `text-primary` | `--primary` | `#762224` |
| `text-red-*`, `text-error-*` | `text-destructive` | `--destructive` | `#d4453a` |
| `text-white` (on dark) | `text-foreground` | `--foreground` | `#fffcf8` |
| `border-gray-200`, `border-slate-200` | `border-border` | `--border` | `#f0eee6` |
| `border-gray-300`, `border-slate-300` | `border-border` | `--border` | `#f0eee6` |
| `ring-blue-*`, `ring-primary-*` | `ring-ring` | `--ring` | `#d1cfc5` |
| `divide-gray-200` | `divide-border` | `--border` | `#f0eee6` |
| `font-sans`, `font-body` | `font-sans` | `--font-body` | Anthropic Sans |
| `font-serif`, `font-display` | `font-heading` | `--font-heading` | Anthropic Serif |
| `font-mono` | `font-mono` | `--font-mono` | Anthropic Mono |
| `shadow-sm`, `shadow`, `shadow-md` | ring shadow | — | `0px 0px 0px 1px var(--ring)` |

### Layout Classes — Pass Through Untouched

These classes are NEVER modified during conversion (Strict Skin Mode):

`flex`, `grid`, `block`, `inline`, `inline-flex`, `inline-grid`, `hidden`, `p-*`, `px-*`, `py-*`, `pt-*`, `pr-*`, `pb-*`, `pl-*`, `m-*`, `mx-*`, `my-*`, `mt-*`, `mr-*`, `mb-*`, `ml-*`, `gap-*`, `gap-x-*`, `gap-y-*`, `space-x-*`, `space-y-*`, `w-*`, `h-*`, `min-w-*`, `min-h-*`, `max-w-*`, `max-h-*`, `size-*`, `top-*`, `bottom-*`, `left-*`, `right-*`, `inset-*`, `absolute`, `relative`, `fixed`, `sticky`, `static`, `z-*`, `overflow-*`, `col-span-*`, `row-span-*`, `grid-cols-*`, `grid-rows-*`, `order-*`, `justify-*`, `items-*`, `self-*`, `content-*`, `place-*`, `grow`, `shrink`, `basis-*`, `flex-row`, `flex-col`, `flex-wrap`, `flex-nowrap`, `aspect-*`, `container`, `columns-*`

### Master Overlay Application Order

```
1. Base theme tokens load (shadcn OR Samsung One UI)
2. Stitch conversion runs — AI reads this token map
3. Skin classes replaced with semantic tokens
4. Layout classes preserved verbatim
5. One Group CSS variables resolve at runtime
6. Result: branded, consistent, theme-switchable UI
```

---

## Part 3: CSS Variable Definitions

> **For build systems:** These are the exact CSS variable values for the One Group theme. Copy into `globals.css` under `:root[data-theme="one-group"]`.

### Light Mode

```css
:root[data-theme="one-group"] {
  --background: #f5f3ed;
  --foreground: #141413;
  --card: #ffffff;
  --card-foreground: #141413;
  --popover: #ffffff;
  --popover-foreground: #141413;
  --primary: #762224;
  --primary-foreground: #fffcf8; /* text-on-red, not canvas */
  --secondary: #e8e6dc;
  --secondary-foreground: #4d4c48;
  --muted: #f0eee6;
  --muted-foreground: #5e5d59;
  --accent: #c45a5c;
  --accent-foreground: #fffcf8; /* text-on-accent, not canvas */
  --destructive: #d4453a;
  --destructive-foreground: #ffffff;
  --border: #f0eee6;
  --input: #f0eee6;
  --ring: #d1cfc5;
  --chart-1: #762224;
  --chart-2: #c45a5c;
  --chart-3: #e8e6dc;
  --chart-4: #5e5d59;
  --chart-5: #323234;
  --radius: 0.5rem;
  --sidebar: #ffffff;
  --sidebar-foreground: #141413;
  --sidebar-primary: #762224;
  --sidebar-primary-foreground: #fffcf8;
  --sidebar-accent: #f0eee6;
  --sidebar-accent-foreground: #762224;
  --sidebar-border: #f0eee6;
  --sidebar-ring: #d1cfc5;
}
```

### Dark Mode

```css
:root[data-theme="one-group"].dark {
  --background: #121214;
  --foreground: #fffcf8;
  --card: #323234;
  --card-foreground: #fffcf8;
  --popover: #323234;
  --popover-foreground: #fffcf8;
  --primary: #762224;
  --primary-foreground: #fffcf8;
  --secondary: #323234;
  --secondary-foreground: #fffcf8;
  --muted: #323234;
  --muted-foreground: #b0aea5;
  --accent: #c45a5c;
  --accent-foreground: #fffcf8;
  --destructive: #d4453a;
  --destructive-foreground: #ffffff;
  --border: #323234;
  --input: #323234;
  --ring: #323234;
  --chart-1: #c45a5c;
  --chart-2: #762224;
  --chart-3: #b0aea5;
  --chart-4: #87867f;
  --chart-5: #5e5d59;
  --radius: 0.5rem;
  --sidebar: #323234;
  --sidebar-foreground: #fffcf8;
  --sidebar-primary: #762224;
  --sidebar-primary-foreground: #fffcf8;
  --sidebar-accent: #323234;
  --sidebar-accent-foreground: #c45a5c;
  --sidebar-border: #323234;
  --sidebar-ring: #323234;
}
```
