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
npm run lint             # ESLint — must be clean: 0 errors AND 0 warnings
npm run typecheck        # tsc --noEmit
npm test                 # Vitest, run once — lib/validation, lib/format, lib/rate-limit,
                         # lib/order-draft-storage. One file: npx vitest run lib/format.test.ts
npm run test:watch       # Vitest in watch mode
npm run check:email      # Authenticate against Gmail SMTP without sending
npm run validate:dishes  # Check food_db.json5 against lib/taxonomy.ts
npm run seed             # Validate, then upsert dishes into Supabase
npm run fetch:images     # Source dish photos from Wikimedia Commons (needs network + sharp)
```

## Deployment

Deployed to Vercel via git push — Vercel builds and deploys automatically on push to `main`.

Seed the `dishes` table using the `json5` npm package to parse `food_db.json5` — do not rename it to `.json`. It is intentionally JSON5 so the business owner can hand-edit it with comments and trailing commas.

### `lib/supabase/schema.sql` is the migration mechanism

There is no migrations directory. That one file is the whole schema *and* the upgrade
path: it is idempotent, every table is `create table if not exists` and every later
column is `add column if not exists`, so running it against a live database is safe and
running it against an empty one builds the site from scratch. Add to it; never rewrite a
line already applied in production.

**A schema change must reach the database before the deploy that needs it**, and the
gap is not theoretical. `POST /api/orders` writes every column it knows about, so
pushing code that writes a column the database does not have yet makes PostgREST reject
the insert (`PGRST204`), the route returns a 500, and every customer sees "Could not
save your request" until the migration lands. Order of operations: run the SQL, confirm
the column exists, *then* push.

Confirm it on the path the application actually uses, not just in the SQL editor.
PostgREST caches the schema separately, so a column can exist in Postgres and still be
invisible to the client that writes it:

```
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/orders?select=id,notes&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

The `supabase` Claude Code plugin (`/plugin`) can apply a migration and run these checks
directly; without it, the Supabase SQL editor does the same job by hand.

## Architecture

### Data model

```
orders → meals → meal_dishes ← dishes
```

- **orders**: client contact info, event name/type, status (`"submitted"`), `user_id`
  (null for guest requests, which is the common case) and `notes` — see **Order notes**
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
so a value outside the vocabulary can never reach the database. Three modelling notes:

- **Diet is not one enum.** `diet` is `vegetarian | non-vegetarian | egg`, with an
  orthogonal `is_vegan` boolean. A flat enum could not express that Chitranna is
  vegetarian *and* vegan at once.
- **`is_jain` and `contains_onion_garlic` were removed. Do not reintroduce them.**
  They recorded a *customisation* as though it were a property of the dish: nearly
  anything in the catalogue can be cooked without onion and garlic, or to Jain rules,
  so a fixed per-dish answer was wrong in both directions — and worse than wrong, it
  hid dishes the kitchen would happily have adapted behind a filter chip. The kitchen
  still cooks satvik and Jain menus; the customer states the requirement in the order
  note instead. Same argument as the spice level below. The two columns still exist in
  the database, unread, because dropping a column is irreversible.
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

A meal or dish link that fails to insert does not fail the request either — but it is no
longer invisible. The write phase collects what it could not persist and the **business**
email renders it as a banner with the subject changed to "Incomplete quote request", so a
person who can ring the customer finds out. The customer's confirmation is deliberately left
alone: they cannot act on a failed insert.

### Abuse protection

Both public POST routes are rate-limited by IP through `lib/rate-limit.ts` — 5/hour for
`/api/orders`, 10/10min for `/api/orders/draft-pdf` — and the quote form carries an
off-screen honeypot field.

This matters more than it looks. Every accepted submission sends two messages from the
business's own Gmail account, which caps at a few hundred a day, so an unbounded endpoint
does not just fill the orders table — it drains the quota and real enquiries stop arriving,
with no admin dashboard to clear the junk from.

The limiter's state is in one serverless instance's memory, so the true ceiling is the limit
times the number of warm instances, and a deploy resets it. It is deliberately the cheap
half of the answer; the durable control is a Vercel WAF rate-limit rule, which runs before a
function is invoked. Do not raise these numbers as a substitute for that.

The two are complements, not alternatives. A WAF window maxes out at 10 minutes on the Hobby
plan, so "5 submissions an hour" can only be enforced in the application; the edge rule is
what makes a flood cost nothing. Keep both.

A honeypot trip returns an actionable 400 rather than the conventional fake success. If it
ever fires on a real customer, a fake 201 would send them to a confirmation page for an
order that does not exist — they would think the request went in and the business would
never hear about it. That costs a booking; an error costs a bot one retry.

### Form input rules

Three fields that were validated only on the server, and so only after the customer had
finished and left them behind:

- **Phone** — digits only, stripped as typed rather than rejected, held to the national
  length for the selected country code (exactly 10 for `+91`). Server-side it is a shape
  check: digits, spaces, dashes and a leading `+`, then 7–15 digits per E.164.
- **Guest counts** — non-digits are stripped rather than parsed, which is what stops a
  negative count at source; `type="number"` holds `-5` quite happily and `parseInt` was
  returning it. `min={1}` on the total is a sanity floor, not a booking minimum.
- **Meal time** — seeded with the current Bengaluru hour (`nowTimeInIndia`). It was
  `'00:00'`, so anyone who never opened the picker silently booked a meal at midnight and
  passed every check on both sides.

### Notes — per dish, and per order

Two free-text fields, at two different scopes. Both exist because the catalogue
deliberately does not model preferences that are properties of the customer rather
than of the food.

#### Per-dish notes

Every selected dish can carry a free-text note — "mild, for the children", "extra crisp",
"no onion". It is the replacement for the spice classification that used to live on the
dish, and the mechanism for any per-dish preference generally.

- Stored on `meal_dishes.note`, not on the dish: the note is about *this order*.
- Captured in **`ReviewStep`**, not the dish-selection step. That step is the whole
  229-card catalogue and has nowhere to annotate a choice already made; review is also
  when "mild, for the children" actually occurs to the customer.
- Carried by `SelectedDish` (`Dish & { note: string | null }`) so the note travels with
  the dish through `lib/orders.ts`, the PDF and both emails, rather than in a parallel
  map that can drift out of alignment.
- `validateOrderDraft` drops any note keyed to a dish that is not on the meal and caps
  each at 300 characters. `POST /api/orders` writes with the service-role key, so the
  route cannot trust the form.
- In the emails it goes through `esc()` like every other interpolation. It is free text
  typed into a public form.

#### Order notes

One free-text field for the whole request — `orders.notes`, nullable. It is where
a requirement that governs the entire menu goes: "we are a Jain family — no onion,
garlic or root vegetables", an allergy, venue access, a timing. It is the
replacement for the `is_jain` / `contains_onion_garlic` filters.

- **Not a per-dish note repeated.** A rule that applies to sixty dishes has nowhere
  to live in a per-dish note without being typed sixty times, and the kitchen wants
  to read it once.
- Captured at the foot of **`ReviewStep`**, above Submit — the same reasoning as the
  per-dish notes, and it is the question a customer can only answer once they have
  seen the whole order.
- Capped at 1,000 characters, against 300 for a dish note: this one carries a
  dietary rule, an allergy list and a line about access, and truncating that
  mid-sentence loses exactly what it exists to capture. `ORDER_NOTE_MAX` and
  `DISH_NOTE_MAX` are exported from `lib/validation.ts` so the textarea's
  `maxLength` and the server cap cannot drift apart.
- Empty is written as `null`, not `''` — every renderer tests for absence to decide
  whether to draw the block at all, and two ways to spell "nothing" is one too many.
- In the emails it is escaped **before** its newlines become `<br>`. The other order
  escapes the tags this inserts and prints them as text. The business copy is ruled
  in the accent colour and sits *above* the menu it governs; the customer's copy is a
  quieter read-back, as is `/order/[id]`.
- `lib/order-draft-storage.ts` backfills it onto a draft saved before the field
  existed, rather than bumping `KEY`. A version bump would bin a half-finished
  wedding order on deploy; reserve it for a change that actually breaks the reducer.

**The PDF prints a dashed rule under every dish, note or not.** That is not decoration:
the document gets printed and marked up by hand when a menu is settled over the phone.
Keep the rule when the note is empty. Note also that the hint line above the dish list
must not be italic — only Inter regular and semibold are registered, and React-PDF
throws on an unresolvable font style rather than falling back, failing the whole document.

### Draft survival

The order draft lives in React context, so any navigation out of the form used to
destroy it. That included the dish modal's own "Open full dish page" link — a customer
halfway through picking sixty dishes for a wedding lost everything to one click on a
link that looked helpful, then landed on a page whose button said "add this to a quote"
and got an empty form.

`lib/order-draft-storage.ts` mirrors the draft and the current step into
**sessionStorage**: per-tab, gone when the tab closes, which is the right lifetime for a
half-finished form on a possibly shared computer. localStorage would leave a stranger's
name and phone number in the browser indefinitely. This is *not* the "save a draft and
come back tomorrow" item in the backlog — that needs a server, a magic link and
different consent.

**The quote form is deliberately not server-rendered.** `OrderFormClient` loads it with
`ssr: false`. Restoring a draft in a state initialiser is the only way to have the values
present on the first render, and that is only legitimate when there is no server render
to disagree with — otherwise every input on the form is a hydration mismatch. Restoring in
an effect instead means rendering empty and then full, and React's lint rules reject
setting state from an effect to achieve it. Nothing is lost to search engines: the
indexable content of `/order/new` is the `<h1>` and the copy above the form, which are
still server-rendered.

Storage is cleared on successful submit, and a draft older than 24 hours is discarded
rather than restored — it would carry an event date the server now rejects as past.

### Catalogue reads — the file fallback and the cache

**The site builds and renders with no environment variables at all.** `lib/dishes.ts` reads
the catalogue from Supabase and falls back to reading `food_db.json5` off disk when Supabase
is unconfigured or unreachable, so a fresh clone shows all 229 dishes and a preview deploy
never renders an empty menu because a variable was missed. Submitting an order needs a real
database and mail credentials; browsing does not.

**`fromFile()` and `hydrate()` must default every field identically.** They are the two
paths to the same dish, and they once disagreed: one defaulted a missing boolean `true` and
the other `false`, so a dish appeared under a filter while the file was being read and
vanished from it the moment the database answered. Change a default in one and change it in
the other in the same edit.

**The Supabase read is cached in module scope for an hour, and `export const revalidate`
does nothing here.** The root layout renders `<Nav />`, which reads the session via
`cookies()`, and that opts every page in the tree into dynamic rendering — so the catalogue
was being refetched, all 229 rows, on every single page view. Module scope survives between
warm invocations of a serverless instance and is dropped on deploy, which is exactly the
invalidation a table that only changes on `npm run seed` needs. Do not "fix" this by adding
`revalidate` back.

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

Eight small modules exist specifically because the same logic had been copied into three or
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
  the form to have validated anything. Also rejects a date in the past: the date input's
  `min` is a browser hint, not a control.
- **`lib/rate-limit.ts`** — `checkRateLimit`, `clientKey`. Guards both public POST routes;
  see **Abuse protection** above. Takes `now` as an argument so the window is testable.
- **`lib/order-draft-storage.ts`** — mirrors the in-progress draft into sessionStorage so
  opening a dish page does not destroy it. See **Draft survival** above.
- **`lib/dishes.ts`** — the *browsable* catalogue: the sort into `BROWSE_ORDER`, the
  hour-long cache and the `food_db.json5` fallback. See **Catalogue reads** above. Anything
  rendering a list of dishes to a customer goes through here. The order paths
  (`lib/orders.ts`, `POST /api/orders`, `scripts/seed.ts`) do query the table directly, and
  should: they look up specific ids by primary key, they want no browse sort, and the file
  fallback would be actively wrong for them — an order has to reflect what is really stored,
  and if Supabase is unreachable those paths have already failed for other reasons.
- **`lib/seo.ts`** — `SITE_URL`, `absoluteUrl()` and every JSON-LD builder. One origin for
  every canonical, OpenGraph URL and sitemap entry: `metadataBase` was once pinned to a
  domain with no DNS record at all, which told Google every page was a copy of somewhere
  unfetchable. The structured-data builders read `lib/business.ts` rather than retyping the
  name, address and phone, because local search matches those against the Google Business
  Profile character for character.

### Supabase clients, and `proxy.ts`

**Session refresh runs in `proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention —
`middleware.ts` / `export function middleware` became `proxy.ts` / `export function proxy`.
The old name still builds, with only a deprecation warning, so a snippet pasted from
anywhere older creates a second file that silently never runs.

`proxy.ts` refreshes the Supabase session cookie on every request, so the nav can read the
signed-in user during render rather than round-tripping for it after paint. It returns
early when Supabase is unconfigured — this runs on every request, and throwing here used
to 500 the entire site, including the menu and the home page, neither of which needs auth
at all.

`lib/supabase/server.ts` exports **four** clients. Picking the wrong one is not a style
question:

- **`createServiceClient()`** — bypasses RLS entirely. Order writes and the seed script.
  Never import it into anything that reaches the browser.
- **`createAnonClient()`** — public reads with no cookie context. The catalogue, and
  `getOrderWithMeals`.
- **`createCookieClient()`** — server components and route handlers that need auth context.
- **`createReadOnlyRequestClient(request)`** — route handlers that need to know *who* is
  calling and nothing else. `autoRefreshToken: false` and a no-op `setAll`, both load-bearing.
  The obvious version — a normal cookie-writing client handed a `new Headers()` the caller
  discards — refreshed an expired token, Supabase rotated the refresh token, and the new pair
  was written into headers nobody attached to a response. The browser kept a refresh token
  that had just been consumed server-side, so **a customer could be signed out by the act of
  submitting an order**. Nothing is lost by refusing to refresh here: `proxy.ts` already did
  it, and if it somehow did not, the caller reads null and treats the request as a guest,
  which is the normal case anyway.

### Row level security

Reads are public; **writes have no policy at all** on `orders`, `meals`, `meal_dishes` and
`dishes`, because every write goes through the service-role client, which bypasses RLS. Do
not add an insert policy to "make writes work" — that grants insert to `anon`, the key
shipped in the client bundle.

The one exception is **`keepalive`**, which carries `Public read` *and* `Anon update`.
`.github/workflows/keep-supabase-alive.yml` PATCHes a single row there twice a week with the
anon key, so a free-tier project is never paused for inactivity. It is a dedicated table for
exactly that reason — the ping must never touch real data, and the anon write grant must
never extend beyond it.

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
NEXT_PUBLIC_SITE_URL=           # absolute base for order links, canonicals and the sitemap
```

**None of these are required to run the site.** The catalogue falls back to
`food_db.json5` (see **Catalogue reads**), `proxy.ts` serves signed-out when Supabase is
unconfigured, and `lib/seo.ts` falls back to the live Vercel origin rather than to
localhost — so an unset `NEXT_PUBLIC_SITE_URL` in production still produces a working
canonical rather than one pointing at a developer's laptop. Submitting an order is the
one flow that genuinely needs a database and mail credentials.

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
- **Established**: 1999

  Recorded as 2000 for a long time and wrong. `BUSINESS.established` in
  `lib/business.ts` is the only place it may appear as a literal — `yearsTrading()`
  and every "since …" in the copy derive from it. Four pages had the year typed in
  rather than interpolated, so correcting the constant did not correct the site.

## How the business actually works

These are facts about the trade, not copy. Several of them were contradicted by
the site's own text before they were written down here, so check against this
list before writing anything customer-facing.

- **No guest ranges, per service or anywhere else.** Meals have been cooked for
  as few as five people, so there is no floor; and a per-service ceiling implies
  some occasions are capped lower than others, which is not how it works — any
  type of function can be catered at any size we can reasonably reach. The
  services page used to carry a range on every entry ("30–300 guests" for
  namakarana, "50–5,000+" for weddings), including in the JSON-LD `audience`,
  where a machine-readable minimum is still a minimum. State the overall scale in
  prose once — no minimum, annadana meals for well over five thousand — and let
  the customer give their headcount.
- **One work order a day.** One function, one kitchen, one team, the whole day.
  This is why notice is weeks at minimum and months for a wedding or festival
  season, and it is a selling point rather than an apology.
- **One-off events only.** No PG or hostel meals, no office canteen, no weekly
  tiffin contract. The corporate service entry used to promise "long-running
  office meal contracts", which was the opposite of the truth.
- **Three independent engagement axes**, any combination:
  1. *Where* — cooked at the venue, or in a godown and brought to the venue hot
     (a venue with no space, water or gas point is common).
  2. *How far* — cooking only, or cooking and serving.
  3. *Groceries* — the customer buys against an itemised list we prepare, or we
     go end to end: provisions, vessels on rent, gas connection, transport,
     team, service.
- **The menu, an itemised provisions list and a vessels list come with every
  level of engagement**, including "just cook for us", and before anything is
  committed to. They are what let a customer check the quote makes sense.
- **Non-vegetarian costs more per plate than vegetarian** — ingredients cost
  more and the cooking and service have to be kept separate. This is why the
  form collects the two headcounts separately.
- **Sourcing is from local markets**, not a wholesaler's catalogue, with
  long-standing meat vendors and suppliers for ice cream, fresh juice for a
  welcome counter, curd and sweets in quantity.
- **Condolence meals are the standing exception** to notice and to the quote
  form both — they are arranged by phone at short notice.

## Out of scope (do not build yet)

Order editing, admin dashboard, per-dish quantities, allergen tracking, service style fields,
popularity/featured flags, pricing and payment.

"Allergen tracking" means allergens as structured data on a dish — a field, a filter,
something that could be queried or promised against. A customer writing "two guests are
allergic to peanuts" in the order note is not that and is exactly what the note is for.

Per-dish and per-order *notes* are built and in scope — see **Notes**. Quantities are not:
a note is free text the kitchen reads, a quantity is a number something would have to
calculate against.

## Deferred (build later)

- **Google Maps Places autocomplete** on meal location field — use plain text input for now
- **Logo** — use text placeholder "M G Prakash Catering" in PDF header and site nav; real logo to be imported from Figma later
- **Email provider migration** — currently using Gmail SMTP via Nodemailer, which is fine for low order volumes. Once a custom domain is purchased, migrate to Resend (or similar) for better deliverability, higher send limits, and a professional "from" address (e.g. `orders@mgprakashcatering.com`)
- **Save draft order requests** — allow users to save their in-progress quote request and return to it later (e.g. via a magic link or account-linked draft)
- **Real photography** — `npm run fetch:images` covers what Commons has. The dishes still showing
  a placeholder tile are the shortlist worth photographing properly; the tile is a deliberate
  design, not a missing asset
- **Durable rate limiting** — `lib/rate-limit.ts` counts in one serverless instance's memory,
  so the real ceiling is the limit times the number of warm instances and a deploy resets it.
  Add a Vercel WAF rate-limit rule, which counts at the edge and rejects before a function is
  invoked. It *is* available on Hobby: one rate-limit rule per project (of three custom
  firewall rules), IP key, fixed window, counting window capped at 10 minutes, 1M allowed
  requests a month included. Spec and rationale are in the README backlog — note the action
  must be left at the **default 429**, not set to Deny, which answers 403. The edge rule does
  not replace the in-app one: a 10-minute maximum window cannot express "5 an hour", so the
  two layers stay. See **Abuse protection** above for why this matters more than the traffic
  suggests.
- **Recoleta licence** — see `app/fonts.ts`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
