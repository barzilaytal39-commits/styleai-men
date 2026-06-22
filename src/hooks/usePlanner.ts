import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { OutfitSlot, WeeklyPlan, WeeklyPlanDay, PlanMode } from '@/types'
import type { Json } from '@/types/database'
import type { GeneratedOutfit } from '@/lib/outfit-engine'
import type { PlanDayBrief } from '@/lib/planner'
import type { SavedOutfit } from '@/hooks/useOutfits'
import type { WeatherContext } from '@/lib/weather'

const SLOT_ORDER: OutfitSlot[] = ['top', 'bottom', 'outerwear', 'shoes', 'belt', 'watch', 'fragrance']

// A generated day ready to persist.
export interface PlanDaySaveInput {
  dayIndex: number
  brief: PlanDayBrief
  outfit: GeneratedOutfit | null
  weather: WeatherContext | null
  notes: string
}

export interface PlanDayWithOutfit extends WeeklyPlanDay {
  outfits: SavedOutfit | null
}
export interface FullPlan {
  plan: WeeklyPlan
  days: PlanDayWithOutfit[]
}

const PLAN_SELECT =
  '*, weekly_plan_days(*, outfits(*, outfit_items(*, wardrobe_items(*))))'

export function usePlanner() {
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)

  // Persists one generated outfit and returns its id (for the day's outfit_id).
  const persistOutfit = useCallback(
    async (userId: string, outfit: GeneratedOutfit, brief: PlanDayBrief): Promise<string> => {
      const notes = `Planned ${brief.date} · ${brief.occasion} · score ${outfit.score}/10`
      const { data: created, error } = await supabase
        .from('outfits')
        .insert({
          user_id: userId,
          name: `${brief.occasion} — ${brief.weekday} ${brief.date}`,
          occasion: brief.occasion,
          notes,
        })
        .select()
        .single()
      if (error) throw error

      const rows = SLOT_ORDER.filter((s) => outfit.slots[s]).map((s) => ({
        outfit_id: created.id,
        wardrobe_item_id: outfit.slots[s]!.id,
        slot: s,
      }))
      if (rows.length > 0) {
        const { error: e2 } = await supabase.from('outfit_items').insert(rows)
        if (e2) throw e2
      }
      return created.id
    },
    [],
  )

  const savePlan = useCallback(
    async (
      startISO: string,
      mode: PlanMode,
      days: PlanDaySaveInput[],
    ): Promise<{ id: string | null; error: Error | null }> => {
      if (!user) return { id: null, error: new Error('Not authenticated') }
      setIsSaving(true)
      try {
        const { data: plan, error: planError } = await supabase
          .from('weekly_plans')
          .insert({ user_id: user.id, start_date: startISO, mode })
          .select()
          .single()
        if (planError) throw planError

        for (const d of days) {
          const outfitId = d.outfit ? await persistOutfit(user.id, d.outfit, d.brief) : null
          const { error: dayError } = await supabase.from('weekly_plan_days').insert({
            plan_id: plan.id,
            user_id: user.id,
            day: d.brief.date,
            day_index: d.dayIndex,
            occasion: d.brief.occasion,
            location_type: d.brief.locationType,
            formality_level: d.brief.formalityLevel,
            weather_snapshot: (d.weather as unknown as Json) ?? null,
            outfit_id: outfitId,
            notes: d.notes,
          })
          if (dayError) throw dayError
        }

        return { id: plan.id, error: null }
      } catch (err) {
        return { id: null, error: err as Error }
      } finally {
        setIsSaving(false)
      }
    },
    [user, persistOutfit],
  )

  const fetchPlans = useCallback(async (): Promise<{ data: WeeklyPlan[]; error: Error | null }> => {
    if (!user) return { data: [], error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return { data: [], error }
    return { data: data ?? [], error: null }
  }, [user])

  const fetchPlan = useCallback(
    async (id: string): Promise<{ data: FullPlan | null; error: Error | null }> => {
      if (!user) return { data: null, error: new Error('Not authenticated') }
      const { data, error } = await supabase
        .from('weekly_plans')
        .select(PLAN_SELECT)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (error) return { data: null, error }
      const row = data as unknown as WeeklyPlan & { weekly_plan_days: PlanDayWithOutfit[] }
      const days = [...(row.weekly_plan_days ?? [])].sort((a, b) => a.day_index - b.day_index)
      return { data: { plan: row, days }, error: null }
    },
    [user],
  )

  // Marks a plan day's worn_at (wear history of the outfit + items is handled by
  // useOutfits.markOutfitWorn in the caller).
  const setDayWorn = useCallback(
    async (dayId: string): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      const { error } = await supabase
        .from('weekly_plan_days')
        .update({ worn_at: new Date().toISOString() })
        .eq('id', dayId)
        .eq('user_id', user.id)
      return { error: error ?? null }
    },
    [user],
  )

  return { isSaving, savePlan, fetchPlans, fetchPlan, setDayWorn }
}
