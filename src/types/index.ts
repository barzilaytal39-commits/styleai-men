import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type WardrobeItem = Database['public']['Tables']['wardrobe_items']['Row']
export type WardrobeItemInsert = Database['public']['Tables']['wardrobe_items']['Insert']
export type WardrobeItemUpdate = Database['public']['Tables']['wardrobe_items']['Update']

export type Outfit = Database['public']['Tables']['outfits']['Row']
export type OutfitInsert = Database['public']['Tables']['outfits']['Insert']
export type OutfitItem = Database['public']['Tables']['outfit_items']['Row']
export type OutfitItemInsert = Database['public']['Tables']['outfit_items']['Insert']

export type StyleProfile = Database['public']['Tables']['style_profiles']['Row']
export type StyleProfileInsert = Database['public']['Tables']['style_profiles']['Insert']
export type StyleProfileUpdate = Database['public']['Tables']['style_profiles']['Update']

export type FitCheck = Database['public']['Tables']['fit_checks']['Row']
export type FitCheckInsert = Database['public']['Tables']['fit_checks']['Insert']

export type WeeklyPlan = Database['public']['Tables']['weekly_plans']['Row']
export type WeeklyPlanInsert = Database['public']['Tables']['weekly_plans']['Insert']
export type WeeklyPlanDay = Database['public']['Tables']['weekly_plan_days']['Row']
export type WeeklyPlanDayInsert = Database['public']['Tables']['weekly_plan_days']['Insert']

export type PlanMode = 'work_week' | 'full_week'

export type StyleMemory = Database['public']['Tables']['style_memory']['Row']
export type StyleMemoryInsert = Database['public']['Tables']['style_memory']['Insert']
export type StyleMemoryUpdate = Database['public']['Tables']['style_memory']['Update']

export type WardrobeCategory = 'tops' | 'bottoms' | 'outerwear' | 'shoes' | 'accessories'

export type OutfitSlot =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'shoes'
  | 'belt'
  | 'watch'
  | 'fragrance'

export interface ToastMessage {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}
