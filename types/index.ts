import type {
  Course, Cuisine, CuisineGroup, Diet, SpiceLevel,
  Occasion, Flavour, CookingMethod, ImageLicence,
} from '@/lib/taxonomy'

export type {
  Course, Cuisine, CuisineGroup, Diet, SpiceLevel,
  Occasion, Flavour, CookingMethod, ImageLicence,
}

export type EventType =
  | 'wedding' | 'engagement' | 'birthday' | 'anniversary'
  | 'housewarming' | 'baby_shower' | 'namakarana' | 'religious'
  | 'party' | 'corporate' | 'funeral' | 'other'
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

  spice_level: SpiceLevel
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
  dishes?: Dish[]
}

export interface MealDish {
  id: string
  meal_id: string
  dish_id: string
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
