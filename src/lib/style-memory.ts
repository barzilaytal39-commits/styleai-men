// Adaptive Style Memory — engine (Phase 7D). PURE helpers (no hooks/Supabase).
//
// Stores STRUCTURED learned preferences only — never raw chat. Two layers:
//  - Session memory: ephemeral, lives in component state during a chat session.
//  - Persistent style memory: the `style_memory` table (summarized below for the AI).
// All stored tokens are internal English values; only UI labels are localized.

import type { StyleMemory, StyleMemoryUpdate, WardrobeItem } from '@/types'
import type { Json } from '@/types/database'

export type FeedbackKind = 'helped' | 'not_helped' | 'loved' | 'saved'

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const uniq = (arr: string[]) => [...new Set(arr.filter((x) => x && x.trim()))]

function isWatch(i: WardrobeItem) {
  return i.category === 'accessories' && /watch/i.test(i.subcategory ?? '')
}
function isFragrance(i: WardrobeItem) {
  return /fragrance/i.test(i.subcategory ?? '') || /fragrance|בושם/i.test(i.name ?? '')
}

// Compact, preferences-only summary sent to the AI (omits empty fields).
export function summarizeMemoryForAI(m: StyleMemory | null): Record<string, unknown> | null {
  if (!m) return null
  const o: Record<string, unknown> = {
    favorite_styles: m.favorite_styles,
    favorite_colors: m.favorite_colors,
    favorite_brands: m.favorite_brands,
    favorite_fragrances: m.favorite_fragrances,
    favorite_watches: m.favorite_watches,
    favorite_accessories: m.favorite_accessories,
    preferred_formality: m.preferred_formality,
    preferred_fits: m.preferred_fits,
    learned_preferences: m.learned_preferences,
    learned_avoids: m.learned_avoids,
    confidence: m.confidence,
  }
  const compact = Object.fromEntries(
    Object.entries(o).filter(([, v]) =>
      Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '' &&
      !(typeof v === 'object' && v !== null && Object.keys(v).length === 0),
    ),
  )
  return Object.keys(compact).length ? compact : null
}

interface SavedRec {
  text: string
  item_ids: string[]
  at: string
}

// Produces the next persistent-memory values from a feedback event. Pure — the
// caller upserts the result. `items` are the recommended items being reacted to.
export function applyFeedback(
  current: StyleMemory | null,
  kind: FeedbackKind,
  items: WardrobeItem[],
  savedText?: string,
): StyleMemoryUpdate {
  const cur = current
  const counts = (cur?.feedback_counts ?? {}) as Record<string, number>
  const nextCounts = { ...counts, [kind]: (counts[kind] ?? 0) + 1 }

  const update: StyleMemoryUpdate = {
    favorite_styles: cur?.favorite_styles ?? [],
    favorite_colors: cur?.favorite_colors ?? [],
    favorite_brands: cur?.favorite_brands ?? [],
    favorite_fragrances: cur?.favorite_fragrances ?? [],
    favorite_watches: cur?.favorite_watches ?? [],
    favorite_accessories: cur?.favorite_accessories ?? [],
    learned_preferences: cur?.learned_preferences ?? [],
    learned_avoids: cur?.learned_avoids ?? [],
    confidence: cur?.confidence ?? 0,
    feedback_counts: nextCounts as Json,
    saved_recommendations: (cur?.saved_recommendations ?? []) as Json,
  }

  if (kind === 'helped') {
    update.confidence = clamp01((update.confidence ?? 0) + 0.03)
  } else if (kind === 'not_helped') {
    update.confidence = clamp01((update.confidence ?? 0) - 0.02)
  } else if (kind === 'saved') {
    update.confidence = clamp01((update.confidence ?? 0) + 0.02)
    const recs = ((cur?.saved_recommendations ?? []) as unknown as SavedRec[]) || []
    const next: SavedRec[] = [
      { text: savedText ?? '', item_ids: items.map((i) => i.id), at: new Date().toISOString() },
      ...recs,
    ].slice(0, 20)
    update.saved_recommendations = next as unknown as Json
  } else if (kind === 'loved') {
    update.confidence = clamp01((update.confidence ?? 0) + 0.06)
    const styles: string[] = []
    const colors: string[] = []
    const brands: string[] = []
    const fragrances: string[] = []
    const watches: string[] = []
    const accessories: string[] = []
    for (const i of items) {
      if (i.style) styles.push(i.style)
      ;(i.color ?? []).forEach((c) => colors.push(c))
      if (i.brand) brands.push(i.brand)
      if (isWatch(i)) watches.push(i.name)
      else if (isFragrance(i)) fragrances.push(i.name)
      else if (i.category === 'accessories') accessories.push(i.name)
    }
    update.favorite_styles = uniq([...(update.favorite_styles ?? []), ...styles])
    update.favorite_colors = uniq([...(update.favorite_colors ?? []), ...colors])
    update.favorite_brands = uniq([...(update.favorite_brands ?? []), ...brands])
    update.favorite_fragrances = uniq([...(update.favorite_fragrances ?? []), ...fragrances])
    update.favorite_watches = uniq([...(update.favorite_watches ?? []), ...watches])
    update.favorite_accessories = uniq([...(update.favorite_accessories ?? []), ...accessories])
    update.learned_preferences = uniq([...(update.learned_preferences ?? []), ...styles, ...colors])
  }

  return update
}
