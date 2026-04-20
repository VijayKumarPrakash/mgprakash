export type Course = 'starter' | 'main' | 'side' | 'dessert' | 'snack' | 'beverage'
export type Diet = 'vegetarian' | 'vegan' | 'jain' | 'non-vegetarian'
export type SpiceLevel = 'mild' | 'medium' | 'hot'
export type EventType =
  | 'wedding' | 'engagement' | 'birthday' | 'anniversary'
  | 'housewarming' | 'baby_shower' | 'namakarana' | 'religious'
  | 'party' | 'corporate' | 'funeral' | 'other'
export type OrderStatus = 'submitted'

export interface Dish {
  id: string
  name: string
  description: string
  image_url: string | null
  course: Course[]
  cuisine: string | null
  diet: Diet
  spice_level: SpiceLevel | null
  flavour_profile: string[]
  cooking_method: string[]
  ingredients: string[]
  tags: string[]
  occasion_fit: string[]
  region_of_origin: string | null
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
