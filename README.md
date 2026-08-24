# M G Prakash Catering

A self-serve quote-request site for **M G Prakash Catering**, a cooking
contractor operating in Bengaluru since 1999.

A customer browses a catalogue of 229 dishes, filters it down to what their
event actually needs — vegetarian, vegan, a particular course or cuisine —
assembles one or more meals, adds any notes for the kitchen, and submits a
request. The business gets an email with the full menu; the customer gets a
confirmation with a PDF quote attached and a shareable link back to their
order.

There is no pricing, no payment and no admin dashboard. It replaces a phone
call and a WhatsApp thread, not an ERP.

**Live:** https://mgprakash.vercel.app

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Database | Supabase (PostgreSQL, RLS) |
| Styling | Tailwind CSS v4, tokens in `app/globals.css` |
| Search | Fuse.js (weighted fuzzy, client-side) |
| PDF | `@react-pdf/renderer`, rendered server-side |
| Email | Nodemailer over Gmail SMTP |
| Auth | Supabase Auth, Google OAuth — **optional**, see below |
| Tests | Vitest, node environment, over the pure `lib/` modules |
| Hosting | Vercel, deploys on push to `main` |

---

## Getting started

```bash
git clone <this repo> && cd mgprakash
npm install
cp .env.example .env.local     # then fill it in — see the notes in that file
npm run dev                    # http://localhost:3000
```

**The site runs with no environment variables at all.** `lib/dishes.ts` falls
back to reading `food_db.json5` off disk when Supabase is not configured or not
reachable, so a fresh clone builds and renders the full catalogue immediately.
Submitting an order needs a real database and mail credentials; browsing does
not.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build — run before pushing |
| `npm run lint` | ESLint. Must be clean: 0 errors, 0 warnings |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run check:email` | Authenticates against Gmail SMTP without sending |
| `npm run validate:dishes` | Checks `food_db.json5` against `lib/taxonomy.ts` |
| `npm run seed` | Validates, then upserts every dish into Supabase |
| `npm run fetch:images` | Sources dish photos from Wikimedia Commons (needs network) |

### First-time database setup

Run `lib/supabase/schema.sql` in the Supabase SQL editor, then `npm run seed`.
The schema is idempotent and safe to re-run — it is also how migrations are
applied, since every added column uses `add column if not exists`.

**A schema change has to reach the database before the deploy that needs it.**
`POST /api/orders` writes every column it knows about, so pushing code that
writes a column the database does not have makes PostgREST reject the insert,
the route returns a 500, and every customer sees "Could not save your request"
until the migration lands. Run the SQL, confirm the column is visible over the
REST API — PostgREST caches the schema separately from Postgres — and only then
push.

---

## Repository layout

```
app/
  page.tsx                  Home — hero, pillars, catalogue preview strip
  menu/                     The public dish catalogue
  order/new/                The five-step quote request form
  order/[id]/               Order confirmation, publicly readable by uuid
  account/orders/           A signed-in customer's past requests
  auth/                     Google sign-in and the OAuth callback
  api/orders/               POST a request · GET its PDF · POST a draft preview
  globals.css               Every design token lives in the :root block here
  fonts.ts                  Self-hosted variable fonts

components/
  catalogue/                Search, chip filters, card grid, dish modal
  order/                    Form context + the five steps, client-only (see below)
  layout/                   Nav (server) + NavClient, Footer
  pdf/OrderPDF.tsx          The quote document
  HeroMandala.tsx           The drawn mandala on the hero — pure SVG, no client JS
  Reveal.tsx                Scroll-reveal wrapper

lib/
  taxonomy.ts               Controlled vocabulary for the catalogue
  dishes.ts                 Catalogue reads, cache, and the file fallback
  orders.ts                 Order + meals + dishes fan-out, used by page and PDF
  validation.ts             Server-side checks for the submitted order
  rate-limit.ts             IP rate limiting for the two public POST routes
  order-draft-storage.ts    Mirrors an in-progress draft into sessionStorage
  format.ts                 Shared date / time / reference formatting
  business.ts               Business details and the brand palette as literals
  email/emails.ts           The two transactional emails
  pdf/generate.ts           React-PDF render entry point
  supabase/                 Clients (browser, anon, service, cookie) + schema.sql
  *.test.ts                 Vitest specs, beside the modules they cover

scripts/
  validate-dishes.ts        Vocabulary + internal-consistency checks
  seed.ts                   Chunked upsert into the dishes table
  fetch-images.ts           Commons search → resize → LQIP → patch food_db.json5

food_db.json5               The 229-dish source of truth. JSON5 on purpose.
proxy.ts                    Session-cookie refresh on every request
vitest.config.mts           Node environment, no jsdom. .mts on purpose
```

---

## How it fits together

### The catalogue

`food_db.json5` is the source of truth, hand-editable by the business owner —
which is exactly why it is JSON5 and not JSON. It keeps comments and trailing
commas. **Do not rename it to `.json`.**

`npm run seed` validates it against `lib/taxonomy.ts` and upserts it into
Supabase. At runtime `lib/dishes.ts` reads from Supabase and falls back to the
file, sorting both paths identically so the catalogue never looks different
depending on whether the database answered.

**Dish ids are permanent.** `meal_dishes.dish_id` is a foreign key with
`ON DELETE RESTRICT`, so re-slugging a dish breaks or blocks every past order
that referenced it. A few ids are historical and slightly wrong (`dosa-1` is
Masala Dosa, `dal-makhni` is Dal Makhani). Leave them.

### Diet is not one field

`diet` is `vegetarian | non-vegetarian | egg`, with an **orthogonal** `is_vegan`
boolean, because a flat enum could not express that Chitranna is vegetarian
*and* vegan at once. `npm run validate:dishes` cross-checks it against the
ingredient list — a dish marked vegan that lists ghee fails the build.

There used to be `is_jain` and `contains_onion_garlic` alongside it. They are
gone and should not come back: they recorded a *customisation* as though it
were a property of the dish. Nearly anything on the list can be cooked without
onion and garlic, or to Jain rules, so a fixed per-dish answer was wrong in
both directions — and it hid dishes behind a filter chip that the kitchen would
happily have adapted. The kitchen still cooks satvik and Jain menus; the
customer says so in the order note. Same argument that retired the spice
level.

### Data model

```
orders ──< meals ──< meal_dishes >── dishes
```

No quantities, no line-item pricing. `orders.user_id` is null for guest
requests, which is the common case. Two free-text fields carry everything the
catalogue deliberately does not model: `meal_dishes.note` for one dish on one
meal ("mild, for the children"), and `orders.notes` for the whole request ("we
are a Jain family — no onion, garlic or root vegetables"). A rule governing
sixty dishes has nowhere to live in a per-dish note without being typed sixty
times.

### The order flow

Contact → event → meals → per-meal dish selection → review → submit.

On submit, `POST /api/orders` validates the payload (`lib/validation.ts`),
writes the order, renders the PDF, and sends both emails. Everything after the
write is best-effort: a font host or SMTP failure is logged but never turns a
saved order into a 500, because a customer who sees an error retries and
submits twice.

A meal or dish link that fails to insert does not fail the request either, but
it is not silent: the write phase collects what it could not persist and the
**business** email carries it as a banner, subject line included, so somebody
who can ring the customer finds out. The customer's own confirmation is left
alone — they cannot act on a failed insert.

Both public POST routes are rate-limited by IP (`lib/rate-limit.ts`) and the
form carries an off-screen honeypot. Every accepted submission sends two
messages from the business's own Gmail account, which caps at a few hundred a
day, so an unbounded endpoint drains the quota and real enquiries stop
arriving. The limiter is per-instance memory and says so in its own header —
the durable control is a Vercel firewall rule, and these numbers are not a
substitute for it.

### Reading orders

`/order/[id]` is a **capability URL** — anyone holding the uuid can read the
order, which is what makes the emailed link work without a login. The uuid is
the secret. Do not surface order ids anywhere enumerable.

Signing in is entirely optional. It pre-fills the contact step and lets a
customer find past requests under `/account/orders`; nothing requires it.

---

## Design system — "Sandalwood & Ink"

Every colour, radius and duration is a custom property in the `:root` block of
`app/globals.css`. **Nothing downstream hard-codes a hex.**

- **Paper** `#F6F2EB`, **surface** `#FFFDF9`, **ink** `#1C1A17`
- **Dark ground** `#1A1512` — the hero, CTA band and footer invert to espresso.
  Wrap those sections in `.on-dark`, which retargets the button variants: deep
  copper reads as mud on dark, so the accent lifts to `--accent-lift`
- **Accent** copper `#A63D17` — 4.62:1 against white, so it passes WCAG AA as a
  button fill. The old `#C8860A` managed 3.2:1 and failed
- **Type**: Fraunces (display) over Plus Jakarta Sans (body), both self-hosted
  variable woff2. Fraunces stands in for the commercial Recoleta; see
  `app/fonts.ts` for the two-step swap once a licence is bought
- **Motion**: three durations only — 120ms pointer feedback, 220ms colour and
  card lift, 420ms image scale. Only `transform` and `opacity` are animated
- No dark mode. The dark bands are a design device, not a theme

The PDF and the emails cannot read CSS custom properties, so they take the same
values as literals from `lib/business.ts`. If you change a token in
`globals.css`, change it there too.

---

## Things that look wrong but are deliberate

- **`useDeferredValue` and `useTransition` in `CatalogueClient`.** The search
  input stays at interactive priority while Fuse runs against a lagging copy;
  chips latch instantly while the re-filter stays interruptible, and `isPending`
  dims the grid rather than blanking it. Do not "simplify" this away.
- **`next.config.ts` `remotePatterns` is locked to two hosts.** Adding `'**'`
  back turns `/_next/image` into an open proxy anyone can bill to this account.
- **Dishes with no photo get a component, not a file.** `DishImage` draws a
  thali tile whose hue comes from an FNV-1a hash of the dish id — deterministic,
  so server and client markup stay byte-identical. It is a design, not a gap.
- **Images are self-hosted under `public/dishes/`, never hotlinked.**
  `image_licence` / `image_credit` / `image_source_url` are schema columns
  because CC-BY and CC-BY-SA legally require a visible credit, which the dish
  modal renders.
- **The quote form is not server-rendered** (`OrderFormClient`, `ssr: false`). It
  restores an in-progress draft from sessionStorage in a state initialiser, which
  is the only way to have the values on the first render — and only safe with no
  server render to disagree with, or every input is a hydration mismatch. The
  indexable content of /order/new is the heading and copy above the form, which
  still render on the server.
- **No guest ranges in any copy.** Not "30–300 guests" per service, not in the
  JSON-LD `audience`. There is no minimum — five people is a real booking — and a
  per-service ceiling wrongly implies some occasions are capped lower than
  others. The founding year is the same kind of rule: `BUSINESS.established` is
  the only literal, everything else interpolates.
- **A honeypot trip answers with a 400, not a fake success.** The convention is
  to fake a 201 so a script learns nothing. If it ever fires on a real customer
  that sends them to a confirmation page for an order that does not exist —
  they think the request went in and the business never hears. That costs a
  booking; an error costs a bot one retry.
- **`.github/workflows/keep-supabase-alive.yml`** writes to a dedicated
  `keepalive` table twice a week, so a free-tier project is never paused for
  inactivity and never has its real data touched by the ping.

---

## Conventions

- **British / Indian English** everywhere — UI copy, comments, emails, PDF.
  "flavour", "colour", "catalogue", "organise".
- `npm run lint`, `npm run typecheck` and `npm test` must all be clean before a
  push.
- Comments explain *why*, not *what*. If a line looks odd, the comment should
  say what breaks without it.
- Never commit `.env.local` or anything holding a real key. `.env.example` is
  the committed reference and carries only placeholders.
- `SUPABASE_SERVICE_ROLE_KEY` must never gain a `NEXT_PUBLIC_` prefix —
  anything so prefixed is inlined into the client bundle at build time.

---

## Not built yet

**Out of scope for now:** order editing, an admin dashboard, per-dish
quantities, allergen tracking, service-style fields, popularity flags.

**Deferred, with a plan:**

- Google Maps Places autocomplete on the meal location field — plain text input
  for now
- A real logo — text placeholder in the nav and PDF header until one arrives
- Migrating email off Gmail SMTP to a proper provider once a custom domain is
  bought, for deliverability and an `orders@` from-address. That also clears the
  last outstanding advisory in the production tree, which needs nodemailer 9.x
- **A Vercel WAF rate-limit rule on `/api/orders`.** `lib/rate-limit.ts` counts
  in one serverless instance's memory, so the real ceiling is the limit times
  however many instances are warm, and a deploy resets every counter. It stops
  the casual case — a bored person with `curl`, a form-spam bot walking the web —
  and not a deliberate one. A WAF rule counts at the edge and rejects before a
  function is invoked, so a flood costs no compute. **Available on the Hobby
  plan** (1 rule per project, IP key, fixed window, 1M allowed requests/month
  included). Set it up in the dashboard under Firewall → Configure → New Rule:

  ```
  If    request path  equals  /api/orders
        request method equals POST
  Then  Rate Limit — Fixed Window
        Window 600s · Limit 5 · Key: IP · Action: Deny (429)
  ```

  600s because 10 minutes is the maximum window on Hobby, so the app-level
  5-per-hour cannot be expressed at the edge — the two layers do different jobs
  and both stay. One rule is also the Hobby limit, which is why it targets the
  expensive endpoint (rows written, two emails sent) rather than `draft-pdf`,
  which only costs CPU and is still covered in-app. On Pro (40 rules) add a
  second for `/api/orders/draft-pdf` at 10 per 600s. Note WAF counters are
  per-region, so a globally distributed flood can still exceed the number.

  Worth doing because the consequence is out of proportion to the effort: every
  accepted submission sends two emails from the business's own Gmail account,
  which caps in the low hundreds a day, so someone could quietly stop real
  enquiries arriving — and with no admin dashboard, clearing the junk means
  hand-written SQL
- Saving a draft request to return to later
- Real photography for the dishes still on a placeholder tile
- A Recoleta webfont licence — see `app/fonts.ts`
