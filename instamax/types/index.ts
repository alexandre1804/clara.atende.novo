export type PurchaseType = 'analysis' | 'schedule_week' | 'schedule_month' | 'credits_starter' | 'credits_plus' | 'credits_pro'

export interface CreditPack {
  type: 'credits_starter' | 'credits_plus' | 'credits_pro'
  label: string
  credits: number
  price: number
  priceFormatted: string
  perCredit: string
  highlight?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    type: 'credits_starter',
    label: 'Starter',
    credits: 8,
    price: 900,
    priceFormatted: 'R$9',
    perCredit: 'R$1,12/imagem',
  },
  {
    type: 'credits_plus',
    label: 'Plus',
    credits: 30,
    price: 2700,
    priceFormatted: 'R$27',
    perCredit: 'R$0,90/imagem',
    highlight: true,
  },
  {
    type: 'credits_pro',
    label: 'Pro',
    credits: 60,
    price: 4500,
    priceFormatted: 'R$45',
    perCredit: 'R$0,75/imagem',
  },
]

export interface InstagramProfile {
  id: string
  user_id: string
  instagram_user_id: string
  username: string
  full_name: string | null
  bio: string | null
  followers_count: number
  following_count: number
  media_count: number
  profile_picture_url: string | null
  access_token: string
  token_expires_at: string | null
  raw_media: MediaItem[]
  created_at: string
  updated_at: string
}

export interface MediaItem {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  caption?: string
  like_count?: number
  comments_count?: number
  timestamp: string
  permalink: string
}

export interface Analysis {
  id: string
  user_id: string
  instagram_profile_id: string
  niche: string
  objective: string
  status: 'pending' | 'processing' | 'complete' | 'failed'
  analysis_data: AnalysisData | null
  payment_id: string | null
  created_at: string
}

export interface AnalysisData {
  summary: string
  score: number
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  positioning: string
  voice_tone: string
  content_pillars: string[]
  hashtag_strategy: string
  posting_frequency: string
  best_times: string[]
  profile_fixes: ProfileFix[]
  growth_forecast: string
}

export interface ProfileFix {
  area: string
  current: string
  recommended: string
  priority: 'alta' | 'média' | 'baixa'
}

export interface Schedule {
  id: string
  user_id: string
  analysis_id: string
  type: 'week' | 'month'
  status: 'pending' | 'processing' | 'complete' | 'failed'
  included_with_analysis: boolean
  schedule_data: ScheduleData | null
  payment_id: string | null
  created_at: string
}

export interface ScheduleData {
  period: string
  total_posts: number
  days: DaySchedule[]
}

export interface DaySchedule {
  date: string
  day_of_week: string
  items: ContentItem[]
}

export interface ContentItem {
  id: string
  type: 'post' | 'reel' | 'story' | 'carrossel'
  time: string
  theme: string
  title: string
  description: string
  caption: string
  hashtags: string[]
  visual_description: string
  tips: string[]
  estimated_reach: string
  cta: string
}

export interface GeneratedImage {
  id: string
  user_id: string
  schedule_id: string | null
  analysis_id: string
  content_item_id: string | null
  prompt: string
  revised_prompt: string | null
  image_url: string
  storage_path: string | null
  payment_id: string | null
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  stripe_payment_id: string
  type: PurchaseType
  amount: number
  status: 'pending' | 'complete' | 'failed'
  metadata: Record<string, string>
  created_at: string
}
