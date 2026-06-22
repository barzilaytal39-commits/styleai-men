// Rule-based outfit builder (Phase 3D — no AI).
//
// Takes the user's wardrobe + a brief and produces up to 3 scored outfits
// using deterministic heuristics. AI-analyzed fields (style, formality_level,
// season) are used when present; otherwise we fall back to manual fields and
// sensible defaults inferred from category/subcategory.

import type { WardrobeItem, OutfitSlot } from '@/types'
import { type WeatherContext, isWet, feelsLike } from '@/lib/weather'

export const OCCASIONS = [
  'Office',
  'Field',
  'Office + Field',
  'Executive Meeting',
  'Casual',
  'Date',
  'Evening Event',
] as const
export type Occasion = (typeof OCCASIONS)[number]

export const LOCATION_TYPES = ['Indoor', 'Outdoor', 'Mixed'] as const
export type LocationType = (typeof LOCATION_TYPES)[number]

export const STYLE_OPTIONS = [
  'Casual',
  'Smart Casual',
  'Business',
  'Formal',
  'Streetwear',
  'Athletic',
] as const

export const FORMALITY_OPTIONS = [
  { value: 1, label: '1 — Very casual' },
  { value: 2, label: '2 — Casual' },
  { value: 3, label: '3 — Smart-casual' },
  { value: 4, label: '4 — Business' },
  { value: 5, label: '5 — Formal' },
]

export interface OutfitBrief {
  occasion: Occasion
  locationType: LocationType
  desiredStyle: string
  formalityLevel: number // 1-5
}

export type OutfitSlots = Partial<Record<OutfitSlot, WardrobeItem>>

export interface GeneratedOutfit {
  key: string
  slots: OutfitSlots
  score: number // 1-10
  explanation: string
}

// Occasions map to an expected formality range used for the occasion sub-score.
const OCCASION_FORMALITY: Record<Occasion, [number, number]> = {
  Office: [3, 4],
  Field: [1, 2],
  'Office + Field': [2, 3],
  'Executive Meeting': [4, 5],
  Casual: [1, 2],
  Date: [3, 4],
  'Evening Event': [4, 5],
}

// Fallback formality when an item has no AI formality_level.
const FORMALITY_BY_SUBCATEGORY: Record<string, number> = {
  'Dress Shoes': 5, Loafers: 4, Boots: 3, Sneakers: 2, 'Slip-Ons': 2, Sandals: 1,
  Suit: 5, Blazer: 4, Shirt: 3, Sweater: 3, Henley: 2, Polo: 2, Hoodie: 1, 'T-Shirt': 1, 'Tank Top': 1,
  Trousers: 4, Chinos: 3, Jeans: 2, Cargos: 2, Shorts: 1, Sweatpants: 1,
  Coat: 4, Blazer_ow: 4, Cardigan: 3, Jacket: 3, Bomber: 2, Puffer: 2, Raincoat: 2,
  Tie: 5, Watch: 4, Belt: 3,
}
const FORMALITY_BY_CATEGORY: Record<string, number> = {
  tops: 2, bottoms: 2, outerwear: 3, shoes: 3, accessories: 3,
}

const NEUTRAL_COLORS = new Set([
  'Black', 'White', 'Grey', 'Navy', 'Beige', 'Khaki', 'Brown',
])

// ---- effective-field accessors (AI first, then manual / inferred) ----

function effFormality(item: WardrobeItem): number {
  if (typeof item.formality_level === 'number') return item.formality_level
  if (item.subcategory && FORMALITY_BY_SUBCATEGORY[item.subcategory]) {
    return FORMALITY_BY_SUBCATEGORY[item.subcategory]
  }
  return FORMALITY_BY_CATEGORY[item.category] ?? 3
}

function effStyle(item: WardrobeItem): string {
  return (item.style ?? '').trim().toLowerCase()
}

function primaryColor(item: WardrobeItem): string | undefined {
  return item.color?.[0]
}

// 0..1 — freshness from rotation; never-worn is fully fresh.
function freshness(item: WardrobeItem): number {
  if (!item.last_worn_at) return 1
  const days = (Date.now() - new Date(item.last_worn_at).getTime()) / 86_400_000
  return clamp(days / 14, 0.3, 1)
}

function formalityCloseness(item: WardrobeItem, target: number): number {
  return clamp(1 - Math.abs(effFormality(item) - target) / 4, 0, 1)
}

function styleMatches(item: WardrobeItem, desiredStyle: string): boolean {
  const s = effStyle(item)
  const d = desiredStyle.trim().toLowerCase()
  if (!s || !d) return false
  return s.includes(d) || d.includes(s)
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// ---- weather fit (0..1) ----

const HOT_MATERIALS = ['cotton', 'linen', 'mesh', 'polyester', 'nylon']
const COLD_MATERIALS = ['wool', 'fleece', 'leather', 'denim', 'cashmere', 'suede', 'flannel', 'corduroy']

function weatherSeason(w: WeatherContext): string {
  const t = feelsLike(w)
  if (t < 10) return 'winter'
  if (t < 18) return 'fall'
  if (t < 25) return 'spring'
  return 'summer'
}

function seasonFit(item: WardrobeItem, w: WeatherContext): number {
  const s = (item.season ?? '').trim().toLowerCase()
  if (!s || s === 'all-season') return 0.8
  return s === weatherSeason(w) ? 1 : 0.4
}

function materialFit(item: WardrobeItem, w: WeatherContext): number {
  const m = (item.material ?? '').trim().toLowerCase()
  if (!m) return 0.7
  const t = feelsLike(w)
  if (t >= 24) {
    if (HOT_MATERIALS.some((x) => m.includes(x))) return 1
    if (COLD_MATERIALS.some((x) => m.includes(x))) return 0.3
    return 0.6
  }
  if (t <= 12) {
    if (COLD_MATERIALS.some((x) => m.includes(x))) return 1
    if (HOT_MATERIALS.some((x) => m.includes(x))) return 0.4
    return 0.6
  }
  return 0.7
}

function shoeWeatherFit(item: WardrobeItem, w: WeatherContext): number {
  const sub = (item.subcategory ?? '').trim().toLowerCase()
  if (isWet(w)) {
    if (sub === 'sandals' || sub === 'slip-ons') return 0.2
    if (sub === 'boots') return 1
    return 0.7
  }
  return 0.8
}

// Overall weather suitability of a single item.
function weatherFit(item: WardrobeItem, w: WeatherContext): number {
  const base = 0.5 * seasonFit(item, w) + 0.5 * materialFit(item, w)
  if (item.category === 'shoes') return clamp(0.4 * base + 0.6 * shoeWeatherFit(item, w), 0, 1)
  return clamp(base, 0, 1)
}

// ---- candidate buckets ----

function isSubcat(item: WardrobeItem, name: string): boolean {
  return (item.subcategory ?? '').toLowerCase() === name.toLowerCase()
}

interface Buckets {
  top: WardrobeItem[]
  bottom: WardrobeItem[]
  outerwear: WardrobeItem[]
  shoes: WardrobeItem[]
  belt: WardrobeItem[]
  watch: WardrobeItem[]
  fragrance: WardrobeItem[]
}

function bucketItems(items: WardrobeItem[]): Buckets {
  return {
    top: items.filter((i) => i.category === 'tops'),
    bottom: items.filter((i) => i.category === 'bottoms'),
    outerwear: items.filter((i) => i.category === 'outerwear'),
    shoes: items.filter((i) => i.category === 'shoes'),
    belt: items.filter((i) => i.category === 'accessories' && isSubcat(i, 'Belt')),
    watch: items.filter((i) => i.category === 'accessories' && isSubcat(i, 'Watch')),
    fragrance: items.filter(
      (i) => isSubcat(i, 'Fragrance') || (i.name ?? '').toLowerCase().includes('fragrance'),
    ),
  }
}

// Per-item suitability used to shortlist each bucket (weather-aware when given).
function itemScore(item: WardrobeItem, brief: OutfitBrief, weather?: WeatherContext): number {
  const base =
    0.5 * formalityCloseness(item, brief.formalityLevel) +
    0.3 * (styleMatches(item, brief.desiredStyle) ? 1 : 0) +
    0.2 * freshness(item)
  if (!weather) return base
  return 0.7 * base + 0.3 * weatherFit(item, weather)
}

function shortlist(
  items: WardrobeItem[],
  brief: OutfitBrief,
  n: number,
  weather?: WeatherContext,
): WardrobeItem[] {
  return [...items]
    .sort((a, b) => itemScore(b, brief, weather) - itemScore(a, brief, weather))
    .slice(0, n)
}

function bestAccessory(
  items: WardrobeItem[],
  brief: OutfitBrief,
  weather?: WeatherContext,
): WardrobeItem | undefined {
  if (items.length === 0) return undefined
  return shortlist(items, brief, 1, weather)[0]
}

// ---- outfit scoring ----

interface ScoreBreakdown {
  formality: number
  occasion: number
  style: number
  color: number
  completeness: number
  rotation: number
  weather: number | null
}

function coreItems(slots: OutfitSlots): WardrobeItem[] {
  return [slots.top, slots.bottom, slots.shoes].filter(Boolean) as WardrobeItem[]
}

function scoreOutfit(
  slots: OutfitSlots,
  brief: OutfitBrief,
  weatherCtx?: WeatherContext,
): { score: number; b: ScoreBreakdown } {
  const core = coreItems(slots)
  const n = core.length || 1

  const formality = core.reduce((s, i) => s + formalityCloseness(i, brief.formalityLevel), 0) / n

  const [lo, hi] = OCCASION_FORMALITY[brief.occasion]
  const avgFormality = core.reduce((s, i) => s + effFormality(i), 0) / n
  const occasion =
    avgFormality >= lo && avgFormality <= hi
      ? 1
      : clamp(1 - Math.min(Math.abs(avgFormality - lo), Math.abs(avgFormality - hi)) / 3, 0, 1)

  const style = core.filter((i) => styleMatches(i, brief.desiredStyle)).length / n

  const colors = core.map(primaryColor).filter(Boolean) as string[]
  const neutralRatio = colors.length
    ? colors.filter((c) => NEUTRAL_COLORS.has(c)).length / colors.length
    : 0.5
  const color = 0.5 + 0.5 * neutralRatio

  const coreFilled = [slots.top, slots.bottom, slots.shoes].filter(Boolean).length
  const completeness = coreFilled / 3

  const rotation = core.reduce((s, i) => s + freshness(i), 0) / n

  // Weather sub-score over all weather-relevant pieces present.
  let weather: number | null = null
  if (weatherCtx) {
    const wItems = [slots.top, slots.bottom, slots.shoes, slots.outerwear].filter(
      Boolean,
    ) as WardrobeItem[]
    weather = wItems.length
      ? wItems.reduce((s, i) => s + weatherFit(i, weatherCtx), 0) / wItems.length
      : 0.5
  }

  const b: ScoreBreakdown = { formality, occasion, style, color, completeness, rotation, weather }

  const weighted =
    weather === null
      ? 0.25 * formality + 0.2 * occasion + 0.2 * style + 0.15 * color + 0.1 * completeness + 0.1 * rotation
      : 0.2 * formality +
        0.15 * occasion +
        0.15 * style +
        0.12 * color +
        0.08 * completeness +
        0.1 * rotation +
        0.2 * weather

  // Small bonus for extra pieces present (outerwear/belt/watch/fragrance).
  const extras = [slots.outerwear, slots.belt, slots.watch, slots.fragrance].filter(Boolean).length
  const extraBonus = Math.min(extras * 0.025, 0.06)

  const score = clamp(Math.round((1 + 9 * (weighted + extraBonus)) * 10) / 10, 1, 10)
  return { score, b }
}

function explain(
  slots: OutfitSlots,
  brief: OutfitBrief,
  b: ScoreBreakdown,
  weather?: WeatherContext,
): string {
  const parts: string[] = []
  parts.push(`${brief.desiredStyle} look for ${brief.occasion.toLowerCase()}`)

  if (b.formality >= 0.85) parts.push(`formality on point (~${brief.formalityLevel}/5)`)
  else if (b.formality >= 0.6) parts.push('formality close')
  else parts.push('formality a stretch')

  if (b.style >= 0.66) parts.push('style matches well')
  const colors = coreItems(slots).map(primaryColor).filter(Boolean) as string[]
  if (b.color >= 0.9 && colors.length) parts.push('neutral, easy-to-pair colors')
  else if (colors.length) parts.push(`colors: ${[...new Set(colors)].join(', ')}`)

  if (weather && b.weather !== null) {
    const t = Math.round(feelsLike(weather))
    if (slots.outerwear) parts.push(`layered for ${t}°C ${weather.condition.toLowerCase()}`)
    else if (b.weather >= 0.8) parts.push(`weather-appropriate (${t}°C ${weather.condition.toLowerCase()})`)
    else parts.push(`okay for ${t}°C ${weather.condition.toLowerCase()}`)
  }

  if (b.rotation >= 0.9) parts.push('fresh — not worn recently')
  if (b.completeness < 1) parts.push('partial (missing a core piece)')

  return parts.join('; ') + '.'
}

// ---- public entry point ----

export function buildOutfits(
  items: WardrobeItem[],
  brief: OutfitBrief,
  weather?: WeatherContext,
): GeneratedOutfit[] {
  const buckets = bucketItems(items)

  // Need at least one core piece to form anything meaningful.
  if (buckets.top.length === 0 && buckets.bottom.length === 0 && buckets.shoes.length === 0) {
    return []
  }

  const tops = shortlist(buckets.top, brief, 4, weather)
  const bottoms = shortlist(buckets.bottom, brief, 4, weather)
  const shoesList = shortlist(buckets.shoes, brief, 4, weather)

  // Cartesian over shortlists; allow an "absent" slot when a bucket is empty.
  const topOpts = tops.length ? tops : [undefined]
  const bottomOpts = bottoms.length ? bottoms : [undefined]
  const shoesOpts = shoesList.length ? shoesList : [undefined]

  const belt = bestAccessory(buckets.belt, brief, weather)
  const watch = bestAccessory(buckets.watch, brief, weather)
  const fragrance = bestAccessory(buckets.fragrance, brief, weather)

  // Layering: add outerwear when it's cold (feels-like < 14°C) and available.
  const wantsOuterwear = weather ? feelsLike(weather) < 14 : false
  const outerwear =
    wantsOuterwear ? bestAccessory(buckets.outerwear, brief, weather) : undefined

  const candidates: GeneratedOutfit[] = []
  for (const top of topOpts) {
    for (const bottom of bottomOpts) {
      for (const shoes of shoesOpts) {
        const slots: OutfitSlots = {}
        if (top) slots.top = top
        if (bottom) slots.bottom = bottom
        if (shoes) slots.shoes = shoes
        if (outerwear) slots.outerwear = outerwear
        if (belt) slots.belt = belt
        if (watch) slots.watch = watch
        if (fragrance) slots.fragrance = fragrance

        if (coreItems(slots).length === 0) continue

        const { score, b } = scoreOutfit(slots, brief, weather)
        candidates.push({
          key: [top?.id, bottom?.id, shoes?.id].join('|'),
          slots,
          score,
          explanation: explain(slots, brief, b, weather),
        })
      }
    }
  }

  // Sort by score, then keep 3 with distinct top+bottom pairings for variety.
  candidates.sort((a, b) => b.score - a.score)
  const chosen: GeneratedOutfit[] = []
  const seen = new Set<string>()
  for (const c of candidates) {
    const sig = `${c.slots.top?.id ?? '-'}|${c.slots.bottom?.id ?? '-'}`
    if (seen.has(sig)) continue
    seen.add(sig)
    chosen.push(c)
    if (chosen.length === 3) break
  }
  // If variety filtering left fewer than 3 but more candidates exist, top up.
  if (chosen.length < 3) {
    for (const c of candidates) {
      if (chosen.includes(c)) continue
      chosen.push(c)
      if (chosen.length === 3) break
    }
  }
  return chosen
}
