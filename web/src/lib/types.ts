export type Role = 'passenger' | 'driver' | 'admin'
export type Lang = 'uz' | 'ru' | 'en'
export type RouteType = 'bus' | 'minibus' | 'taxi' | 'train'
export type VehicleStatus = 'moving' | 'idle' | 'offline'
export type NewsCategory = 'all' | 'transport' | 'city' | 'announcements'

export const VEHICLE_CATEGORIES = ['Avtobus', 'Mikroavtobus', 'Gazel', 'Yengil avto'] as const
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]

export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface DriverInfo {
  id: number
  rating: number
  online: boolean
  vehicle_category: string
  is_approved: boolean
}

export interface User {
  id: number
  full_name: string
  phone: string
  email: string | null
  role: Role
  avatar_url: string | null
  language: Lang
  is_verified: boolean
  is_premium: boolean
  is_blocked: boolean
  created_at: string
  driver?: DriverInfo | null
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface RegisterBody {
  full_name: string
  phone: string
  password: string
  password_confirm: string
  role: 'passenger' | 'driver'
  email?: string
  vehicle_category?: string
  telegram_id?: string
}

export interface RegisterResponse {
  user_id: number
  phone: string
  message: string
  dev_code?: string
  telegram_link?: string
}

export interface MessageResponse {
  message?: string
  detail?: string
  dev_code?: string
  dev_token?: string
  telegram_link?: string
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

export interface RouteDetail extends RouteOut {
  stops: RouteStopOut[]
  vehicles: VehicleOut[]
}

export interface VehicleRouteLite {
  id: number
  name: string
  color: string
  from_name: string
  to_name: string
}

export interface VehicleOut {
  id: number
  route_id: number | null
  driver_id: number | null
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
  route: VehicleRouteLite | null
}

export interface VehicleLite {
  id: number
  route_id: number | null
  lat: number
  lng: number
  speed: number
  bearing: number
  status: VehicleStatus
  updated_at: string
}

export interface VehiclesMessage {
  type: 'vehicles'
  data: VehicleLite[]
}

export interface NearbyItem {
  vehicle: VehicleOut
  eta_min: number
  distance_km: number
}

export interface RouteStopOut {
  id: number
  name: string
  lat: number
  lng: number
  order: number
}

export interface NewsOut {
  id: number
  title: string
  body: string
  category: Exclude<NewsCategory, 'all'>
  image_url: string | null
  views: number
  published_at: string
  is_pinned: boolean
}

export interface ReviewOut {
  id: number
  driver_id: number
  passenger_id: number | null
  passenger_name: string | null
  rating: number
  comment: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface DriverRatings {
  average: number
  distribution: Record<string, number>
  items: Page<ReviewOut>
}

export interface PremiumPlan {
  id: number
  name: string
  price: number
  currency: string
  duration_days: number
  features: string[]
  is_first_month_free: boolean
}

export interface PremiumSubscribeResponse {
  payment_id: string
  status: string
  amount: number
  currency: string
  card_number: string
  card_holder: string
}

export interface PremiumReceiptResponse {
  payment_id: string
  status: string
}

export interface PremiumPaymentOut {
  id: string
  provider: string
  status: string
  amount: number
  currency: string
  pay_url: string
  created_at: string
  paid_at: string | null
}

export interface PremiumMe {
  is_premium: boolean
  plan: PremiumPlan | null
  expires_at: string | null
  payments: PremiumPaymentOut[]
}

export interface NotificationOut {
  id: number
  title: string
  body: string
  is_read: boolean
  created_at: string
}

export interface DriverOrderOut {
  id: number
  route_name: string
  from_name: string
  to_name: string
  time: string
  price_som: number
  status: string
  passengers: number
}

export interface DriverMe {
  id: number
  full_name: string
  rating: number
  online: boolean
  is_premium: boolean
  vehicle_category: string
  vehicle: VehicleOut | null
  today_orders: DriverOrderOut[]
}

export interface DriverRequest {
  id: number
  passenger_name: string | null
  from_name: string
  to_name: string
  price_som: number
  status: string
}

export interface DriverRequestList {
  items: DriverRequest[]
}

export interface ChatMessage {
  id: string
  from: string
  text: string
  created_at: string
}

export interface ChatMessageEvent {
  type: 'message'
  data: ChatMessage
}

export interface DriverRequestEvent {
  type: 'request'
  data: DriverRequest & { created_at: string }
}
