# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Use **British/Indian English** throughout — in UI copy, emails, PDF content, code comments, and variable names where English words appear. Prefer spellings like "flavour", "colour", "centre", "catalogue", "organise", etc.

## Project overview

**M G Prakash Catering** — a customer-facing catering order platform where clients browse a dish catalog and place catering orders for events. No admin dashboard or authentication in scope for this iteration.

**Tech stack:** Next.js (App Router), Supabase (PostgreSQL), Resend (email), React-PDF, Tailwind CSS, Fuse.js, Vercel (deployment target).

## Development

```bash
npm run dev          # Local dev server at localhost:3000 — hot-reloads on save
npm run build        # Production build (run before deploying to catch errors)
npm run lint         # ESLint
npx tsc --noEmit     # Type-check without building
```

## Deployment

Deployed to Vercel via git push — Vercel builds and deploys automatically on push to `main`.

Seed the `dishes` table using the `json5` npm package to parse `food_db.json5` — do not rename it to `.json`. It is intentionally JSON5 so the business owner can hand-edit it with comments and trailing commas.

## Architecture

### Data model

```
orders → meals → meal_dishes ← dishes
```

- **orders**: client contact info, event name/type, status (`"submitted"`)
- **meals**: one or more per order; date, time, location, guest counts
- **meal_dishes**: junction table — links meals to selected dishes (no quantities)
- **dishes**: seeded from `food_db.json5`; slugged `id` (e.g. `"masala-dosa"`)

All JSONB fields on dishes: `flavour_profile`, `ingredients`, `tags`, `occasion_fit`.

### Order flow

Multi-step form: contact info → event details → add meals → per-meal dish selection → order review → submit.

On submit: write to Supabase → trigger two Resend emails (client confirmation with PDF + business notification) → redirect to `/order/[id]`.

### Dish catalog

- Fuse.js fuzzy search across name, description, ingredients, tags
- Filters: course, cuisine, diet, spice level, occasion fit (AND logic)
- Card grid: 3 cols desktop / 2 tablet / 1 mobile; 6 cards + "Load more"
- Expandable detail view (modal or side panel)

### PDF (React-PDF)

Generated server-side on order submission, attached to client confirmation email. Includes: business header, client info, event details, per-meal sections with dish lists, branded footer.

### Emails (Resend)

1. **Client** — confirmation with `/order/[id]` link and PDF attachment
2. **Business** (`vijaykumar.sb.99@gmail.com`) — full order summary in HTML

## Design system

- **Base**: warm off-white `#FAFAF8`
- **Accent**: single CSS custom property `--color-accent` mapped to a Tailwind token; placeholder value `#C8860A` (deep amber)
- **Typography**: Inter or Plus Jakarta Sans (body); Playfair Display optionally for hero headings only
- **Motion**: subtle only — fade/reveal on scroll, no flashy animations
- No dark mode

## Environment variables needed

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

## Business details (footer, emails, PDF)

- **Name**: M G Prakash Catering
- **Address**: 611, 10th Cross Rd, Indiranagar Rajajinagar, Bengaluru, Karnataka 560079
- **Phone**: +91 98801 93165
- **Email**: vijaykumar.sb.99@gmail.com
- **Established**: 2000

## Out of scope (do not build yet)

User auth, order editing, admin dashboard, per-dish quantities, allergen tracking, service style fields, popularity/featured flags.

## Deferred (build later)

- **Google Maps Places autocomplete** on meal location field — use plain text input for now
- **Logo** — use text placeholder "M G Prakash Catering" in PDF header and site nav; real logo to be imported from Figma later
