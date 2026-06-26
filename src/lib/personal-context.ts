// Personal Context Engine (Phase 7B.1).
//
// Builds one compact, reusable styling context for the signed-in user from
// already-fetched data. PURE — no hooks, no Supabase, no network. Summaries
// only: no image URLs, no auth tokens, no large payloads. Every field degrades
// gracefully when its source data is missing.
//
// The keys `style_profile`, `weather`, `wardrobe_items`, `recent_outfits`,
// `recent_fit_checks`, `weekly_plan` match what the `stylist-chat` Edge Function
// already reads; the remaining summary fields are extra context (sent but ignored
// by the current function, ready for future server-side use).

import type { Profile, StyleProfile, WardrobeItem, WardrobeCategory } from '@/types'
import type { WeatherContext } from '@/lib/weather'
import type { SavedOutfit } from '@/hooks/useOutfits'
import type { PlanDayWithOutfit } from '@/hooks/usePlanner'
import { summarizeWeatherForAI } from '@/lib/weather'
import { buildProfileSummary } from '@/lib/style-profile-constants'
import { wardrobeHealth, shoppingGaps } from '@/lib/wardrobe-insights'

const MAX_ITEMS = 60
const CATEGORIES: WardrobeCategory[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories']

export interface PersonalContextInput {
  profile?: Profile | null
  styleProfile?: StyleProfile | null
  weather?: WeatherContext | null
  items?: WardrobeItem[]
  recentOutfits?: SavedOutfit[]
  recentFitChecks?: { overall_score: number | null; final_verdict: string | null }[]
  todayPlanDay?: PlanDayWithOutfit | null
  now?: Date
}

export interface PersonalContext {
  // temporal
  weekday: string
  season: string
  hour: number
  time_of_day: string
  // who
  user: { name?: string; age?: number; height_cm?: number } | null
  // preferences / environment
  style_profile: Record<string, unknown> | null
  weather: Record<string, unknown> | null
  // wardrobe
  wardrobe_summary: { total: number; analyzed: number; by_category: Record<string, number> }
  wardrobe_health: { score: number }
  shopping_gaps: { key: string; item: string; priority: string }[]
  wardrobe_items: Record<string, unknown>[]
  wear_history: {
    most_worn: { name: string; worn_count: number }[]
    not_worn_30_days: number
    never_worn: number
  }
  // activity
  recent_outfits: Record<string, unknown>[]
  recent_fit_checks: Record<string, unknown>[]
  weekly_plan: Record<string, unknown> | null
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function seasonOf(month: number): string {
  // 0=Jan … 11=Dec (northern hemisphere)
  if (month <= 1 || month === 11) return 'winter'
  if (month <= 4) return 'spring'
  if (month <= 7) return 'summer'
  return 'fall'
}

function timeOfDay(hour: number): string {
  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// Compact wardrobe-item metadata (no images). Exported so the chat can resolve
// recommended_item_ids back to full items in the UI.
export function compactWardrobeItem(i: WardrobeItem): Record<string, unknown> {
  const ai = i.ai_analysis as { ai_notes?: string } | null
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    subcategory: i.subcategory,
    colors: i.color,
    style: i.style,
    formality_level: i.formality_level,
    season: i.season,
    material: i.material,
    pattern: i.pattern,
    last_worn_at: i.last_worn_at,
    worn_count: i.worn_count,
    ai_notes: ai && typeof ai === 'object' ? ai.ai_notes : undefined,
  }
}

export function buildPersonalContext(input: PersonalContextInput = {}): PersonalContext {
  const items = input.items ?? []
  const now = input.now ?? new Date()

  // ---- temporal ----
  const hour = now.getHours()
  const temporal = {
    weekday: WEEKDAYS[now.getDay()],
    season: seasonOf(now.getMonth()),
    hour,
    time_of_day: timeOfDay(hour),
  }

  // ---- user ----
  const p = input.profile
  const user = p
    ? {
        name: p.full_name?.split(' ')[0] ?? undefined,
        age: p.age ?? undefined,
        height_cm: p.height_cm ?? undefined,
      }
    : null

  // ---- wardrobe summary ----
  const by_category: Record<string, number> = {}
  for (const c of CATEGORIES) by_category[c] = 0
  for (const i of items) by_category[i.category] = (by_category[i.category] ?? 0) + 1
  const wardrobe_summary = {
    total: items.length,
    analyzed: items.filter((i) => i.ai_analyzed_at).length,
    by_category,
  }

  // ---- health + gaps (deterministic, reused) ----
  const wardrobe_health = { score: wardrobeHealth(items).score }
  const shopping_gaps = shoppingGaps(items, input.styleProfile ?? null, input.weather ?? null)
    .slice(0, 4)
    .map((g) => ({ key: g.key, item: g.item_type, priority: g.priority }))

  // ---- wear history ----
  const most_worn = [...items]
    .filter((i) => i.worn_count > 0)
    .sort((a, b) => b.worn_count - a.worn_count)
    .slice(0, 3)
    .map((i) => ({ name: i.name, worn_count: i.worn_count }))
  const wear_history = {
    most_worn,
    not_worn_30_days: items.filter((i) => {
      const d = daysSince(i.last_worn_at)
      return d !== null && d >= 30
    }).length,
    never_worn: items.filter((i) => i.worn_count === 0).length,
  }

  // ---- activity summaries ----
  const recent_outfits = (input.recentOutfits ?? []).slice(0, 5).map((o) => ({
    name: o.name,
    occasion: o.occasion,
    items: o.outfit_items.map((oi) => oi.wardrobe_items?.name).filter(Boolean),
  }))
  const recent_fit_checks = (input.recentFitChecks ?? []).slice(0, 3).map((f) => ({
    overall_score: f.overall_score,
    verdict: f.final_verdict,
  }))
  const day = input.todayPlanDay
  const weekly_plan = day
    ? {
        occasion: day.occasion,
        items: day.outfits?.outfit_items.map((oi) => oi.wardrobe_items?.name).filter(Boolean) ?? [],
        worn: !!day.worn_at,
      }
    : null

  return {
    ...temporal,
    user,
    style_profile: input.styleProfile ? buildProfileSummary(input.styleProfile) : null,
    weather: input.weather ? summarizeWeatherForAI(input.weather) : null,
    wardrobe_summary,
    wardrobe_health,
    shopping_gaps,
    wardrobe_items: items.slice(0, MAX_ITEMS).map(compactWardrobeItem),
    wear_history,
    recent_outfits,
    recent_fit_checks,
    weekly_plan,
  }
}
