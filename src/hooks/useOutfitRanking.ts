import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { OutfitSlot } from '@/types'
import type { GeneratedOutfit, OutfitBrief } from '@/lib/outfit-engine'
import { summarizeWeatherForAI, type WeatherContext } from '@/lib/weather'

export interface AIRanking {
  candidate_id: string
  ai_score: number
  occasion_score: number
  color_score: number
  style_score: number
  premium_score: number
  effortless_score: number
  weather_score: number | null
  explanation: string
  styling_tip: string
}

interface RankResponse {
  ranked_candidate_ids: string[]
  rankings: AIRanking[]
}

const SLOT_ORDER: OutfitSlot[] = ['top', 'bottom', 'outerwear', 'shoes', 'belt', 'watch', 'fragrance']

// Builds the safe, structured payload sent to the AI (no images, no ids beyond
// a temporary candidate id, no sensitive data).
function toCandidatePayload(outfits: GeneratedOutfit[]) {
  return outfits.map((o) => ({
    candidate_id: o.key,
    rule_score: o.score,
    rule_explanation: o.explanation,
    items: SLOT_ORDER.filter((slot) => o.slots[slot]).map((slot) => {
      const it = o.slots[slot]!
      return {
        slot,
        name: it.name,
        category: it.category,
        subcategory: it.subcategory,
        colors: it.color,
        style: it.style,
        formality_level: it.formality_level,
        material: it.material,
        pattern: it.pattern,
        last_worn_at: it.last_worn_at,
      }
    }),
  }))
}

async function mapInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context
  const status = context?.status
  let serverMessage: string | undefined
  if (context && typeof context.clone === 'function') {
    try {
      const b = await context.clone().json()
      if (b && typeof b.error === 'string') serverMessage = b.error
    } catch {
      // not JSON
    }
  }
  switch (status) {
    case 401:
      return 'Your session has expired. Showing rule-based order.'
    case 429:
      return 'AI ranking is rate limited. Showing rule-based order.'
    case 500:
      return serverMessage ?? 'AI ranking is unavailable. Showing rule-based order.'
    case 502:
      return 'The AI provider failed. Showing rule-based order.'
    default:
      if (status) return serverMessage ?? `AI ranking failed (HTTP ${status}). Showing rule-based order.`
      return 'Could not reach AI ranking. Showing rule-based order.'
  }
}

export function useOutfitRanking() {
  const [isRanking, setIsRanking] = useState(false)

  // Memoized so effects that depend on it (e.g. the Dashboard) don't re-run every
  // render — an unstable identity here previously caused an infinite call loop.
  const rankOutfits = useCallback(async (
    brief: OutfitBrief,
    outfits: GeneratedOutfit[],
    userProfile?: Record<string, unknown> | null,
    weather?: WeatherContext | null,
  ): Promise<{ data: RankResponse | null; error: string | null }> => {
    setIsRanking(true)
    try {
      const { data, error } = await supabase.functions.invoke<RankResponse>('rank-outfits', {
        body: {
          user_profile: userProfile ?? null,
          weather: weather ? summarizeWeatherForAI(weather) : null,
          brief: {
            occasion: brief.occasion,
            location_type: brief.locationType,
            desired_style: brief.desiredStyle,
            formality_level: brief.formalityLevel,
          },
          candidate_outfits: toCandidatePayload(outfits),
        },
      })
      if (error) return { data: null, error: await mapInvokeError(error) }
      if (!data?.rankings?.length) {
        return { data: null, error: 'AI ranking returned no results. Showing rule-based order.' }
      }
      return { data, error: null }
    } finally {
      setIsRanking(false)
    }
  }, [])

  return { isRanking, rankOutfits }
}
