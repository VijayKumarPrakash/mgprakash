/**
 * Canonical controlled vocabulary for the dish catalogue.
 *
 * Every value in `food_db.json5` must come from these lists. `scripts/validate-dishes.ts`
 * enforces it, so a typo in the seed file fails loudly at build time rather than silently
 * producing a dish that no filter can ever reach.
 *
 * Ordering matters: COURSES and the occasion list are declared in the sequence a
 * Bengaluru banquet is actually served in, and the UI renders them in array order.
 */

/* ------------------------------------------------------------------ *
 * Course — a dish may sit in more than one (curd rice is rice + side)
 * ------------------------------------------------------------------ */
export const COURSES = [
  'beverage',       // welcome drinks, juices, coffee/tea
  'starter',        // appetisers, tikkas, chaat, fried snacks
  'tiffin',         // South Indian breakfast/evening: idli, dosa, vada, upma
  'soup',           // shorbas, rasam served as soup, Indo-Chinese soups
  'main',           // curries, gravies, dry sabzis, koftas
  'rice',           // biryani, pulao, bath varieties, plain and curd rice
  'bread',          // roti, naan, poori, chapati, kulcha
  'side',           // palya, kosambari, raita, salads
  'accompaniment',  // chutney, pickle, papad, sambar, rasam served alongside
  'dessert',        // sweets, payasam, halwa
] as const
export type Course = (typeof COURSES)[number]

/**
 * COURSES is menu-service order, which is right for the PDF and the order
 * summary but wrong for browsing — it opens the catalogue on ten beverages.
 * This is the order the grid is sorted in instead: the food people came to
 * look at first, drinks last.
 */
export const BROWSE_ORDER: readonly Course[] = [
  'starter', 'main', 'tiffin', 'rice', 'bread', 'side',
  'dessert', 'accompaniment', 'soup', 'beverage',
]

/* ------------------------------------------------------------------ *
 * Diet
 *
 * Modelled as one base category plus orthogonal boolean flags, because the
 * previous single enum could not express the truth: Chitranna is vegetarian
 * AND vegan AND Jain-safe simultaneously. With a flat enum you had to pick one,
 * so it never surfaced under a vegan or Jain filter.
 *
 * `contains_onion_garlic` is tracked separately from `is_jain` — satvik and
 * temple-adjacent events (naming ceremonies, religious functions, some funerals)
 * exclude onion and garlic without requiring full Jain rules on root vegetables.
 * ------------------------------------------------------------------ */
export const DIETS = ['vegetarian', 'non-vegetarian', 'egg'] as const
export type Diet = (typeof DIETS)[number]

export const SPICE_LEVELS = ['mild', 'medium', 'hot'] as const
export type SpiceLevel = (typeof SPICE_LEVELS)[number]

/* ------------------------------------------------------------------ *
 * Cuisine — two levels. The group drives the filter chips (four options
 * stays scannable); the specific cuisine shows in the dish detail panel.
 * ------------------------------------------------------------------ */
export const CUISINE_GROUPS = [
  'South Indian',
  'North Indian',
  'Indo-Chinese',
  'Continental',
] as const
export type CuisineGroup = (typeof CUISINE_GROUPS)[number]

export const CUISINES = [
  // South Indian
  'Karnataka', 'Udupi', 'Mangalorean', 'North Karnataka', 'Coorg',
  'Tamil', 'Chettinad', 'Kerala', 'Andhra', 'Hyderabadi',
  // North Indian
  'Punjabi', 'Mughlai', 'Awadhi', 'Rajasthani', 'Gujarati',
  'Bengali', 'Maharashtrian', 'Kashmiri', 'North Indian',
  // Other
  'Indo-Chinese', 'Continental', 'Pan-Indian',
] as const
export type Cuisine = (typeof CUISINES)[number]

export const CUISINE_GROUP_OF: Record<Cuisine, CuisineGroup> = {
  'Karnataka': 'South Indian', 'Udupi': 'South Indian', 'Mangalorean': 'South Indian',
  'North Karnataka': 'South Indian', 'Coorg': 'South Indian', 'Tamil': 'South Indian',
  'Chettinad': 'South Indian', 'Kerala': 'South Indian', 'Andhra': 'South Indian',
  'Hyderabadi': 'South Indian',
  'Punjabi': 'North Indian', 'Mughlai': 'North Indian', 'Awadhi': 'North Indian',
  'Rajasthani': 'North Indian', 'Gujarati': 'North Indian', 'Bengali': 'North Indian',
  'Maharashtrian': 'North Indian', 'Kashmiri': 'North Indian', 'North Indian': 'North Indian',
  'Indo-Chinese': 'Indo-Chinese', 'Continental': 'Continental', 'Pan-Indian': 'North Indian',
}

/* ------------------------------------------------------------------ *
 * Occasion fit — the Indian-context entries are deliberate. Some dishes
 * are expected at a naming ceremony or a shraddha meal and would be wrong
 * anywhere else, and a caterer's customer thinks in exactly these terms.
 * ------------------------------------------------------------------ */
export const OCCASIONS = [
  'wedding', 'reception', 'engagement', 'naming-ceremony', 'housewarming',
  'birthday', 'corporate', 'festive', 'religious', 'funeral', 'casual',
] as const
export type Occasion = (typeof OCCASIONS)[number]

export const FLAVOURS = [
  'spicy', 'tangy', 'sweet', 'savoury', 'creamy', 'nutty',
  'smoky', 'herby', 'umami', 'bitter', 'sour', 'buttery', 'coconutty',
] as const
export type Flavour = (typeof FLAVOURS)[number]

export const COOKING_METHODS = [
  'steamed', 'deep-fried', 'shallow-fried', 'pan-fried', 'griddled',
  'tempered', 'slow-cooked', 'pressure-cooked', 'simmered', 'dum',
  'tandoor', 'roasted', 'ground', 'fermented', 'no-cook',
] as const
export type CookingMethod = (typeof COOKING_METHODS)[number]

/* ------------------------------------------------------------------ *
 * Image provenance. Free-licence does not mean attribution-free —
 * Wikimedia CC-BY-SA legally requires credit, so it is a schema field
 * rather than something we hope to remember at render time.
 * ------------------------------------------------------------------ */
export const IMAGE_LICENCES = [
  'unsplash', 'pexels', 'cc0', 'cc-by', 'cc-by-sa', 'owned', 'placeholder',
] as const
export type ImageLicence = (typeof IMAGE_LICENCES)[number]

/** Licences whose terms require a visible credit line in the dish detail panel. */
export const LICENCES_REQUIRING_CREDIT: readonly ImageLicence[] = ['cc-by', 'cc-by-sa']

/* ------------------------------------------------------------------ *
 * Display labels — keeps British/Indian English and title casing in one
 * place instead of scattered across components.
 * ------------------------------------------------------------------ */
export const COURSE_LABELS: Record<Course, string> = {
  beverage: 'Beverages',
  starter: 'Starters',
  tiffin: 'Tiffin',
  soup: 'Soups',
  main: 'Mains',
  rice: 'Rice',
  bread: 'Breads',
  side: 'Sides',
  accompaniment: 'Accompaniments',
  dessert: 'Sweets',
}

export const OCCASION_LABELS: Record<Occasion, string> = {
  wedding: 'Wedding',
  reception: 'Reception',
  engagement: 'Engagement',
  'naming-ceremony': 'Naming Ceremony',
  housewarming: 'Housewarming',
  birthday: 'Birthday',
  corporate: 'Corporate',
  festive: 'Festive',
  religious: 'Religious',
  funeral: 'Funeral / Shraddha',
  casual: 'Casual',
}
