Build a full-stack catering order management web app called **M G Prakash Catering** from scratch. This is a customer-facing platform where clients can browse a food menu and place catering orders for events. Do not build an admin dashboard or user authentication — those are future iterations.

### Tech stack
- **Next.js** (App Router)
- **Supabase** — Postgres database (set up with auth-readiness in mind for future, but no login flows now)
- **Resend** — transactional email
- **React-PDF** — PDF generation
- **Tailwind CSS** — styling
- **Vercel** — deployment target

---

### Core workflow

**Order > Event > Meal > Dishes**

1. Client fills in their contact details (name, phone, email)
2. Client names their event (e.g. "Sharma Wedding") and selects an event type (wedding, birthday, corporate, other)
3. Client adds one or more **meals** to the event. Each meal has:
   - Meal name (e.g. "Reception Dinner", "Thursday Lunch")
   - Date and time
   - Location (free text + optional Google Maps Places autocomplete, India only)
   - Total guest count
   - Vegetarian guest count
4. For each meal, client browses the dish catalog and selects dishes to include (inclusion only — no quantities yet)
5. Client reviews a full order summary across all meals before submitting
6. On submission:
   - Order is written to the database with status `"submitted"`
   - Client receives a confirmation email with a link to their order page and a PDF attached
   - Business owner receives a notification email with the full order details
7. Client lands on `/order/[id]` — a permanent, shareable confirmation page showing the complete order

---

### Database schema

```
orders
  id (uuid, PK)
  client_name
  client_email
  client_phone
  event_name
  event_type
  status  (default: "submitted")
  created_at

meals
  id (uuid, PK)
  order_id (FK → orders)
  name
  date
  time
  location
  total_guests
  veg_guests

meal_dishes
  id (uuid, PK)
  meal_id (FK → meals)
  dish_id (FK → dishes)

dishes
  id (text, slug-style e.g. "masala-dosa")
  name
  description
  image_url
  course         (starter, main, dessert, beverage, snack)
  cuisine        (South Indian, North Indian, Mughlai, Indo-Chinese, Continental, etc.)
  diet           (vegetarian, non-vegetarian, vegan, jain)
  spice_level    (mild, medium, hot)
  flavour_profile  (jsonb array: ["spicy", "tangy", ...])
  cooking_method
  ingredients    (jsonb array)
  tags           (jsonb array — flexible catch-all)
  occasion_fit   (jsonb array, optional: ["wedding", "corporate", "birthday", "festive", "casual"])
  region_of_origin  (text, optional)
```

Seed the `dishes` table from the provided `food_db.json5` file. Use the `json5` npm package to parse it — do not rename it to `.json`. Keeping it as `.json5` allows comments and trailing commas, which is intentional since this file will be hand-edited by the business owner. All dish fields except `id`, `name`, `description`, `image_url`, `course`, `diet`, and `tags` are optional.

---

### Dish catalog & filtering

The catalog page should support:
- Full-text fuzzy search (use Fuse.js) across name, ingredients, description, tags
- Filter by: course, cuisine, diet, spice level, occasion fit
- Filters are additive (AND logic)
- Results shown as a card grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card: food photo, name, short description, tags, diet indicator, "Add to [meal]" button
- Expandable detail view (modal or side panel) showing all dish metadata including ingredients and flavour profile
- Pagination: show 6 cards initially with "Load more"
- "Clear all filters" button

---

### PDF output

Generated with React-PDF. Should include:
- Business header (M G Prakash Catering, logo, contact details)
- Client contact details
- Event name and type
- Each meal as a section: name, date, time, location, guest counts, then a clean list of selected dishes
- Branded footer
- Clean, elegant layout — not a raw data dump

---

### Email

Use Resend. Two emails on order submission:
1. **To client** — confirmation with order link (`/order/[id]`) and PDF attached
2. **To business** (vijaykumar.sb.99@gmail.com) — full order summary in HTML email body

---

### UI / Styling

Aesthetic: minimal, elegant, modern. Inspired by Sweetgreen (card-based browsing, bold sans-serif, breathing room), Apple.com (confident use of whitespace, large imagery, typographic precision), and a clean academic/editorial restraint.

- **Base color**: warm off-white (`#FAFAF8`)
- **Accent color**: implement as a single CSS custom property (`--color-accent`) and Tailwind config token so it can be swapped in one place. Use a placeholder deep amber (`#C8860A`) for now.
- **Typography**: Inter or Plus Jakarta Sans as the primary font; optionally a display serif (like Playfair Display) for hero headings only
- **Motion**: subtle only — fade/reveal on scroll, no flashy animations
- **No dark mode required for now**

---

### What NOT to build yet
- User authentication or login
- Order editing post-submission
- Admin dashboard
- Per-dish quantities
- Allergen tracking
- Service style or prep complexity fields on dishes
- Popularity/featured flags

---

### Business details (for footer, emails, PDF)
- **Name**: M G Prakash Catering
- **Address**: 611, 10th Cross Rd, Indiranagar Rajajinagar, Bengaluru, Karnataka 560079
- **Phone**: +91 98801 93165
- **Email**: vijaykumar.sb.99@gmail.com
- **Established**: 2000

---

### Before starting
Make sure you have the following before starting:
1. **`food_db.json5`** — the dish seed file (attach or paste alongside this prompt)
2. **Supabase project credentials** — or scaffold the schema and fill in env vars yourself
3. **Google Maps API key** — for Places autocomplete on the meal location field
4. **Logo/favicon images** — optional, can be added later
