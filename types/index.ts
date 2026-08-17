import type {
  Course, Cuisine, CuisineGroup, Diet,
  Occasion, Flavour, CookingMethod, ImageLicence,
} from '@/lib/taxonomy'

export type {
  Course, Cuisine, CuisineGroup, Diet,
  Occasion, Flavour, CookingMethod, ImageLicence,
}

/**
 * Event types, as a runtime list rather than a bare union — the order route has
 * to check a submitted value against it, and the form has to render the whole
 * set. Two hand-maintained copies of the same twelve strings would drift.
 */
export const EVENT_TYPES = [
  'wedding', 'engagement', 'birthday', 'anniversary',
  'housewarming', 'baby_shower', 'namakarana', 'religious',
  'party', 'corporate', 'funeral', 'other',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

/**
 * Display labels. Without these the confirmation page and the account list
 * rendered the raw column through a `capitalize` class, so a naming ceremony
 * read as "Namakarana" but a baby shower read as "Baby_shower".
 */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  engagement: 'Engagement',
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  housewarming: 'Gruha Pravesha / Housewarming',
  baby_shower: 'Seemantha / Baby Shower',
  namakarana: 'Namakarana',
  religious: 'Religious / Prasad',
  party: 'Party',
  corporate: 'Corporate',
  funeral: 'Funeral / Condolence',
  other: 'Other',
}

export type OrderStatus = 'submitted'

export interface Dish {
  id: string
  name: string
  /** Name in the local script/transliteration where it differs, e.g. "Kayi Obbattu". */
  alt_names: string[]
  description: string

  image_url: string | null
  /** Base64 LQIP inlined at first paint so cards never render as empty grey holes. */
  blur_data_url: string | null
  image_licence: ImageLicence
  /** Required by cc-by / cc-by-sa; rendered in the dish detail panel. */
  image_credit: string | null
  image_source_url: string | null

  course: Course[]
  cuisine: Cuisine
  cuisine_group: CuisineGroup
  region_of_origin: string | null

  diet: Diet
  /** Orthogonal to `diet` — a dish can be vegetarian, vegan and Jain at once. */
  is_vegan: boolean
  is_jain: boolean
  /** Tracked apart from `is_jain`: satvik events exclude alliums without full Jain rules. */
  contains_onion_garlic: boolean
  flavour_profile: Flavour[]
  cooking_method: CookingMethod[]
  ingredients: string[]
  tags: string[]
  occasion_fit: Occasion[]
}

export interface Order {
  id: string
  client_name: string
  client_email: string
  client_phone: string
  event_name: string
  event_type: EventType
  status: OrderStatus
  created_at: string
  /** Set when the request was placed while signed in; null for guest orders. */
  user_id: string | null
  meals?: Meal[]
}

export interface Meal {
  id: string
  order_id: string
  name: string
  date: string
  time: string
  location: string
  total_guests: number
  veg_guests: number
  dishes?: SelectedDish[]
}

/**
 * A dish as it appears on an order, carrying the note the customer wrote
 * against it. The note lives on the link row rather than on the dish, because
 * it is about this order — "mild, for the children" — not about the dish.
 */
export type SelectedDish = Dish & { note: string | null }

export interface MealDish {
  id: string
  meal_id: string
  dish_id: string
  note: string | null
}

// Order form draft state (client-side only, not persisted until submit)
export interface MealDraft {
  id: string          // temporary client-side id
  name: string
  date: string
  time: string
  location: string
  total_guests: number | ''
  veg_guests: number | ''
  dish_ids: string[]
  /** Per-dish note, keyed by dish id. A missing or empty entry means no note. */
  dish_notes: Record<string, string>
}

export interface OrderDraft {
  client_name: string
  client_email: string
  client_phone: string
  event_name: string
  event_type: EventType | ''
  meals: MealDraft[]
  active_meal_id: string | null
}
