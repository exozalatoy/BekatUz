export type Role = 'passenger' | 'driver' | 'admin'
export type Language = 'uz' | 'ru' | 'en'
export type VehicleStatus = 'moving' | 'idle' | 'offline'
export type RouteType = 'bus' | 'minibus' | 'taxi' | 'train'
export type NewsCategory = 'transport' | 'city' | 'announcements'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface DriverInfo {
  id: number
  rating: number
  online: boolean
  vehicle_category: string | null
  is_approved: boolean
}

export interface UserOut {
  id: number
  full_name: string
  phone: string
  email: string | null
  role: Role
  avatar_url: string | null
  language: Language
  is_verified: boolean
  is_premium: boolean
  is_blocked: boolean
  created_at: string
  driver?: DriverInfo | null
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type?: string
  user?: UserOut
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ListResponse<T> {
  items: T[]
}

export interface AdminDriver {
  id: number
  full_name?: string | null
  phone?: string | null
  email?: string | null
  rating?: number | null
  vehicle_category?: string | null
  is_approved?: boolean | null
  is_blocked?: boolean | null
  is_premium?: boolean | null
  online?: boolean | null
  created_at?: string | null
  user?: UserOut | null
}

export interface VehicleRouteInfo {
  id: number
  name: string
  color?: string | null
  from_name?: string | null
  to_name?: string | null
}

export interface VehicleOut {
  id: number
  route_id: number
  driver_id: number
  plate: string
  category: string
  status: VehicleStatus
  lat: number
  lng: number
  speed: number
  bearing: number
  seats_total: number
  seats_free: number
  updated_at: string
  route?: VehicleRouteInfo | null
}

export interface RouteStopOut {
  id?: number
  name: string
  lat: number
  lng: number
  order: number
}

export interface RouteOut {
  id: number
  name: string
  type: RouteType
  city: string
  from_name: string
  to_name: string
  first_time: string
  last_time: string
  interval_min: number
  price: number
  stops_count: number
  vehicles_count: number
  color: string
}

export interface RouteDetailOut extends RouteOut {
  stops: RouteStopOut[]
  vehicles?: VehicleOut[]
}

export interface NewsOut {
  id: number
  title: string
  body: string
  category: NewsCategory
  image_url: string | null
  views: number
  published_at: string
  is_pinned: boolean
}

export interface ReviewOut {
  id: number
  driver_id: number
  passenger_id: number
  passenger_name: string
  rating: number
  comment: string
  status: ReviewStatus
  created_at: string
}

export interface PlanOut {
  id: number
  name: string
  price: number
  currency: string
  duration_days: number
  features: string[]
  is_first_month_free: boolean
}

export type PaymentStatus = 'pending' | 'review' | 'paid' | 'rejected'

export interface PaymentOut {
  id: number
  user_id: number
  user_name: string | null
  user_phone: string | null
  plan_name: string | null
  provider: string
  status: PaymentStatus
  amount: number
  currency: string
  receipt_data: string | null
  created_at: string
  paid_at: string | null
}

export interface ChartPoint {
  date: string
  users: number
  orders: number
}

export interface AdminStats {
  users: number
  drivers: number
  orders: number
  premium_subscriptions: number
  chart: ChartPoint[]
  latest_news: NewsOut[]
  latest_users: UserOut[]
}

export interface PageQuery {
  page: number
  page_size: number
}
