# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Use **British/Indian English** throughout — in UI copy, emails, PDF content, code comments, and variable names where English words appear. Prefer spellings like "flavour", "colour", "centre", "catalogue", "organise", etc.

## Project overview

**M G Prakash Catering** — a customer-facing catering platform where clients browse a dish
catalogue and submit quote requests for events. No pricing, no payment, no admin dashboard.

Google sign-in **is** implemented but is entirely optional: it pre-fills the contact step and
lets a customer find past requests under `/account/orders`. Nothing on the site requires it,
and the quote form must keep working with Supabase unconfigured or unreachable.

**Tech stack:** Next.js (App Router), Supabase (PostgreSQL), Nodemailer + Gmail SMTP (email), React-PDF, Tailwind CSS, Fuse.js, Vercel (deployment target).

## Development

```bash
npm run dev              # Local dev server at localhost:3000
npm run build            # Production build (run before deploying)
npm run lint             # ESLint — must be clean, 0 errors
npm run typecheck        # tsc --noEmit
npm run validate:dishes  # Check food_db.json5 against lib/taxonomy.ts
npm run seed             # Validate, then upsert dishes into Supabase
npm run fetch:images     # Source dish photos from Wikimedia Commons (needs network + sharp)
```

## Deployment

Deployed to Vercel via git push — Vercel builds and deploys automatically on push to `main`.

Seed the `dishes` table using the `json5` npm package to parse `food_db.json5` — do not rename it to `.json`. It is intentionally JSON5 so the business owner can hand-edit it with comments and trailing commas.

## Architecture

### Data model

```
orders → meals → meal_dishes ← dishes
```

- **orders**: client contact info, event name/type, status (`"submitted"`), and `user_id`
  (null for guest requests, which is the common case)
- **meals**: one or more per order; date, time, location, guest counts
- **meal_dishes**: junction table — links meals to selected dishes (no quantities)
- **dishes**: 229 rows seeded from `food_db.json5`

All JSONB fields on dishes: `alt_names`, `flavour_profile`, `cooking_method`, `ingredients`,
`tags`, `occasion_fit`.

**Dish ids are permanent.** `meal_dishes.dish_id` is an FK onto `dishes.id` with
`ON DELETE RESTRICT`, so re-slugging a dish orphans or blocks every past order that
referenced it. Some ids are historical and slightly wrong (`dosa-1` is Masala Dosa,
`dal-makhni` is Dal Makhani) — leave them.

### Dish taxonomy

`lib/taxonomy.ts` is the single source of truth for every enumerated value.
`npm run validate:dishes` enforces it and runs automatically before `npm run seed`,
so a value outside the vocabulary can never reach the database. Two modelling notes:

- **Diet is not one enum.** `diet` is `vegetarian | non-vegetarian | egg`, with
  orthogonal `is_vegan` and `is_jain` booleans. A flat enum could not express that
  Chitranna is vegetarian *and* vegan *and* Jain at once.
- **`contains_onion_garlic` is separate from `is_jain`.** Satvik and temple-adjacent
  events exclude alliums without applying Jain rules on root vegetables. It cannot be
  derived from the other flags.
- **There is no spice level, deliberately.** Dishes used to carry a fixed
  `mild | medium | hot` classification, a filter chip and a field in the modal. It was
  removed: how hot a dish should be is a property of the customer, not of the dish, and
  the same sambar is mild at one wedding and hot at the next. The customer states it
  per dish as an order note instead — see **Per-dish notes** below. Do not reintroduce
  it as a catalogue field. (`dishes.spice_level` still exists in the database, unread,
  because dropping a column is irreversible.)

`COURSES` is menu-service order (used by the PDF and order summary). `BROWSE_ORDER` is
the catalogue's default sort — food first, drinks last.

### Order flow

Multi-step form: contact info → event details → add meals → per-meal dish selection → order review → submit.

On submit, `POST /api/orders`: validate the payload (`lib/validation.ts`) → write the order,
meals and dish links → render the PDF → send both emails → redirect to `/order/[id]`.

Everything after the write is best-effort and logged rather than thrown. React-PDF fetches
its font over the network at render time and Gmail SMTP can rate-limit; either failing must
not turn a saved order into a 500, because a customer who sees an error submits again.

### Dish catalogue

- Fuse.js weighted fuzzy search across name, alt_names, cuisine, tags, ingredients, description
- Chip filters: course, cuisine group, diet, occasion. **AND across groups, OR within
  a group** — the standard faceted-search behaviour
- Card grid: 3 cols desktop / 2 tablet / 1 mobile; 12 cards + "Load more"
- Modal detail view with focus trap, scrollbar-compensated body lock, and restore-focus-on-close

**Responsiveness is deliberate, do not undo it.** `useDeferredValue` on the search string keeps
the input at interactive priority while Fuse runs against a lagging copy; `useTransition` on the
chips lets a chip latch instantly while the re-filter stays interruptible, and `isPending` dims
the grid rather than blanking it. Only `transform` and `opacity` are ever animated.

### Images

Dish photographs are **self-hosted** under `public/dishes/` — never hotlinked. Run
`npm run fetch:images` (needs network and `npm i -D sharp`) to source them from the Wikimedia
Commons API, which returns the licence and author alongside the file so attribution is derived
rather than remembered. `image_licence` / `image_credit` / `image_source_url` are schema fields
because CC-BY and CC-BY-SA legally require a visible credit, which `DishModal` renders.

Dishes with no photograph fall back to `components/catalogue/DishImage.tsx` — a designed dark
tile with a thali mark, hue derived from an FNV-1a hash of the dish id so the grid reads as
varied and the markup stays byte-identical between server and client. This is a component, not
229 generated files.

`next.config.ts` `remotePatterns` is locked to two hosts. Do not add `'**'` back — it turns
`/_next/image` into an open proxy that anyone can bill to this account.

### PDF (React-PDF)

Generated server-side on order submission, attached to client confirmation email. Includes: business header, client info, event details, per-meal sections with dish lists, branded footer.

### Emails (Nodemailer + Gmail SMTP)

1. **Client** — confirmation with `/order/[id]` link and PDF attachment
2. **Business** (`vijaykumar.sb.99@gmail.com`) — full order summary in HTML

Both templates are hand-built HTML strings, so **every interpolation goes through `esc()`**.
The name, event title and venue are typed into a public form by anyone on the internet.

### Shared modules — check these before writing a helper

Four small modules exist specifically because the same logic had been copied into three or
four places and then drifted apart. Reach for them rather than reimplementing:

- **`lib/format.ts`** — `formatDate`, `formatTime`, `formatDateTime`, `orderRef`. Pinned to
  en-GB and Asia/Kolkata: the PDF and emails render on a Vercel function in UTC and every
  reader is in Bengaluru. Never format a date or a meal time inline.
- **`lib/business.ts`** — business details plus `BRAND`, the palette as hex literals.
  React-PDF has no cascade and email clients drop `var()`, so those two renderers cannot read
  `globals.css`. This is the *only* sanctioned place for a hard-coded brand hex; changing a
  token in `globals.css` means changing it here too.
- **`lib/orders.ts`** — `getOrderWithMeals(id)`, the order → meals → dishes fan-out shared by
  the confirmation page and the PDF route. Two copies of that join is two chances for the
  screen and the attachment to disagree about what was ordered.
- **`lib/validation.ts`** — server-side checks for the submitted order. `POST /api/orders`
  writes with the service-role key, which bypasses RLS entirely, so the route cannot trust
  the form to have validated anything.

### Row level security

Reads are public; **writes have no policy at all**, because every write goes through the
service-role client, which bypasses RLS. Do not add an insert policy to "make writes work" —
that grants insert to `anon`, the key shipped in the client bundle.

Public SELECT on `orders` is deliberate: `/order/[id]` is a capability URL, and the uuid is
the secret that makes the emailed link work without a login. Never surface order ids anywhere
they can be enumerated.

## Design system — "Sandalwood & Ink"

All tokens live in the `:root` block of `app/globals.css`. Nothing downstream hard-codes a hex.

- **Paper** `#F6F2EB`, **surface** `#FFFDF9`, **ink** `#1C1A17`
- **Dark ground** `#1A1512` — the hero, the CTA band and the footer invert to espresso so
  photography glows against it. Wrap those sections in `.on-dark`, which retargets the button
  variants (deep copper reads as mud on dark, so the accent lifts to `--accent-lift`)
- **Accent** copper `#A63D17` — 4.62:1 against white, so it passes WCAG AA as a button fill.
  The old `#C8860A` only managed 3.2:1 and failed
- **Typography**: `Recoleta` (display) over `Plus Jakarta Sans` (body). Recoleta is a commercial
  Latinotype face and is **not** free to embed, so the site currently ships **Fraunces** as the
  open-source stand-in. Both are self-hosted variable woff2 in `app/fonts/`; see `app/fonts.ts`
  for the two-step swap once a licence is bought. Never move these to a font CDN — same-origin
  skips a DNS lookup and TLS handshake on the critical render path
- **Motion**: three durations only — `--dur-fast` 120ms for pointer feedback, `--dur-base` 220ms
  for colour and card lift, `--dur-slow` 420ms for image scale and reveals. Everything eases on
  `cubic-bezier(.22,1,.36,1)`
- No dark mode (the dark bands are a design device, not a theme)

## Environment variables

`cp .env.example .env.local` and fill it in. `.env.example` is the committed
reference with notes on where each value comes from; `.env.local` is gitignored.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # secret — bypasses RLS, used by seed + order writes
GMAIL_USER=
GMAIL_APP_PASSWORD=             # Google App Password, not the account password
NEXT_PUBLIC_SITE_URL=           # absolute base for order links in emails and PDF
```

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is listed in the original brief but nothing
reads it — Places autocomplete is still deferred. Add it when that gets built.

Anything prefixed `NEXT_PUBLIC_` is inlined into the client bundle at build time
and is visible in devtools. `SUPABASE_SERVICE_ROLE_KEY` must never gain that
prefix.

## Business details (footer, emails, PDF)

- **Name**: M G Prakash Catering
- **Address**: 611, 10th Cross Rd, Indiranagar Rajajinagar, Bengaluru, Karnataka 560079
- **Phone**: +91 98801 93165
- **Email**: vijaykumar.sb.99@gmail.com
- **Established**: 2000

## Out of scope (do not build yet)

Order editing, admin dashboard, per-dish quantities, allergen tracking, service style fields,
popularity/featured flags, pricing and payment.

## Deferred (build later)

- **Google Maps Places autocomplete** on meal location field — use plain text input for now
- **Logo** — use text placeholder "M G Prakash Catering" in PDF header and site nav; real logo to be imported from Figma later
- **Email provider migration** — currently using Gmail SMTP via Nodemailer, which is fine for low order volumes. Once a custom domain is purchased, migrate to Resend (or similar) for better deliverability, higher send limits, and a professional "from" address (e.g. `orders@mgprakashcatering.com`)
- **Save draft order requests** — allow users to save their in-progress quote request and return to it later (e.g. via a magic link or account-linked draft)
- **Real photography** — `npm run fetch:images` covers what Commons has. The dishes still showing
  a placeholder tile are the shortlist worth photographing properly; the tile is a deliberate
  design, not a missing asset
- **Recoleta licence** — see `app/fonts.ts`
