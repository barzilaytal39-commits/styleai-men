// Wardrobe Insights (Phase 4.5B) — deterministic, no AI. Computes a wardrobe
// health score, usage sections, and personalized shopping gaps from existing
// wardrobe / outfit / Style DNA / weather data.

import type { WardrobeItem, StyleProfile, WardrobeCategory } from '@/types'
import type { WeatherContext } from '@/lib/weather'
import { feelsLike, isWet } from '@/lib/weather'
import { categoryLabel, colorLabel, seasonLabel } from '@/i18n'

const CATEGORIES: WardrobeCategory[] = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories']
const CORE_COLORS = ['Black', 'White', 'Navy', 'Grey', 'Beige', 'Brown']
const SEASONS = ['winter', 'spring', 'summer', 'fall']

const FORM_SUB: Record<string, number> = {
  'Dress Shoes': 5, Loafers: 4, Boots: 3, Sneakers: 2, 'Slip-Ons': 2, Sandals: 1,
  Suit: 5, Blazer: 4, Shirt: 3, Sweater: 3, Polo: 2, Henley: 2, Hoodie: 1, 'T-Shirt': 1, 'Tank Top': 1,
  Trousers: 4, Chinos: 3, Jeans: 2, Cargos: 2, Shorts: 1, Sweatpants: 1,
  Coat: 4, Cardigan: 3, Jacket: 3, Bomber: 2, Puffer: 2, Raincoat: 2,
  Tie: 5, Watch: 4, Belt: 3,
}
const FORM_CAT: Record<string, number> = { tops: 2, bottoms: 2, outerwear: 3, shoes: 3, accessories: 3 }

export function inferFormality(item: WardrobeItem): number {
  if (typeof item.formality_level === 'number') return item.formality_level
  if (item.subcategory && FORM_SUB[item.subcategory]) return FORM_SUB[item.subcategory]
  return FORM_CAT[item.category] ?? 3
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// ---- health score (0-100) ----

export interface HealthMetric {
  label: string
  value: number // 0..1
}
export interface WardrobeHealth {
  score: number
  metrics: HealthMetric[]
}

export function wardrobeHealth(items: WardrobeItem[]): WardrobeHealth {
  const total = items.length
  if (total === 0) {
    return {
      score: 0,
      metrics: [
        { label: 'Item count', value: 0 },
        { label: 'Category coverage', value: 0 },
        { label: 'Analyzed', value: 0 },
        { label: 'Color diversity', value: 0 },
        { label: 'Formality coverage', value: 0 },
        { label: 'Season coverage', value: 0 },
        { label: 'Usage balance', value: 0 },
      ],
    }
  }

  const itemCount = Math.min(total / 30, 1)

  const presentCats = new Set(items.map((i) => i.category))
  const categoryCoverage = presentCats.size / CATEGORIES.length

  const analyzed = items.filter((i) => i.ai_analyzed_at).length / total

  const colorSet = new Set<string>()
  items.forEach((i) => (i.color ?? []).forEach((c) => colorSet.add(c)))
  const colorDiversity = Math.min(colorSet.size / 8, 1)

  const formSet = new Set(items.map((i) => inferFormality(i)))
  const formalityCoverage = formSet.size / 5

  const seasonSet = new Set<string>()
  let hasAllSeason = false
  items.forEach((i) => {
    const s = (i.season ?? '').trim().toLowerCase()
    if (s === 'all-season') hasAllSeason = true
    else if (SEASONS.includes(s)) seasonSet.add(s)
  })
  const seasonCoverage = hasAllSeason ? 1 : Math.min(seasonSet.size / SEASONS.length, 1)

  const wornAtLeastOnce = items.filter((i) => i.worn_count > 0).length / total

  const metrics: HealthMetric[] = [
    { label: 'Item count', value: itemCount },
    { label: 'Category coverage', value: categoryCoverage },
    { label: 'Analyzed', value: analyzed },
    { label: 'Color diversity', value: colorDiversity },
    { label: 'Formality coverage', value: formalityCoverage },
    { label: 'Season coverage', value: seasonCoverage },
    { label: 'Usage balance', value: wornAtLeastOnce },
  ]

  const weighted =
    0.15 * itemCount +
    0.2 * categoryCoverage +
    0.15 * analyzed +
    0.1 * colorDiversity +
    0.15 * formalityCoverage +
    0.1 * seasonCoverage +
    0.15 * wornAtLeastOnce

  return { score: Math.round(weighted * 100), metrics }
}

// ---- usage sections ----

export interface VersatileItem {
  item: WardrobeItem
  count: number
}
export interface WardrobeSections {
  mostWorn: WardrobeItem[]
  neverWorn: WardrobeItem[]
  notWorn30: WardrobeItem[]
  recentlyAdded: WardrobeItem[]
  mostVersatile: VersatileItem[]
}

export function wardrobeSections(
  items: WardrobeItem[],
  usageCounts: Record<string, number>,
): WardrobeSections {
  const mostWorn = [...items]
    .filter((i) => i.worn_count > 0)
    .sort((a, b) => b.worn_count - a.worn_count)
    .slice(0, 5)

  const neverWorn = items.filter((i) => i.worn_count === 0).slice(0, 8)

  const notWorn30 = [...items]
    .map((i) => ({ i, d: daysSince(i.last_worn_at) }))
    .filter((x) => x.d !== null && (x.d as number) >= 30)
    .sort((a, b) => (b.d as number) - (a.d as number))
    .map((x) => x.i)
    .slice(0, 8)

  const recentlyAdded = [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const mostVersatile = [...items]
    .map((i) => ({ item: i, count: usageCounts[i.id] ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return { mostWorn, neverWorn, notWorn30, recentlyAdded, mostVersatile }
}

// ---- shopping gaps ----

export type GapPriority = 'high' | 'medium' | 'low'
export interface ShoppingGap {
  key: string // stable English id (dedupe/analytics) — never localized
  item_type: string // Hebrew display
  recommended_color: string // internal English color value (display via colorLabel)
  priority: GapPriority
  reason: string // Hebrew display
  outfit_impact: string // Hebrew display
}

const PRIORITY_RANK: Record<GapPriority, number> = { high: 0, medium: 1, low: 2 }

// Style-DNA "essentials" for an elevated smart-casual wardrobe.
interface Essential {
  key: string
  item_type: string
  color: string
  category: WardrobeCategory
  match: (i: WardrobeItem) => boolean
  impact: string
}

const SMART_CASUAL_ESSENTIALS: Essential[] = [
  {
    key: 'loafers',
    item_type: 'מוקסיני עור',
    color: 'Brown',
    category: 'shoes',
    match: (i) => i.category === 'shoes' && /loafer|dress/i.test(i.subcategory ?? ''),
    impact: 'משדרג כמעט כל לוק סמארט-קז׳ואל',
  },
  {
    key: 'belt',
    item_type: 'חגורת עור',
    color: 'Brown',
    category: 'accessories',
    match: (i) => i.category === 'accessories' && /belt/i.test(i.subcategory ?? ''),
    impact: 'מחבר בין הנעליים למכנסיים',
  },
  {
    key: 'polo',
    item_type: 'פולו / פולו סרוג',
    color: 'Navy',
    category: 'tops',
    match: (i) => i.category === 'tops' && /polo/i.test(i.subcategory ?? ''),
    impact: 'חולצת סמארט-קז׳ואל בסיסית עם המון שילובים',
  },
  {
    key: 'chinos',
    item_type: 'צ׳ינוס',
    color: 'Beige',
    category: 'bottoms',
    match: (i) => i.category === 'bottoms' && /chino/i.test(i.subcategory ?? ''),
    impact: 'תחתון רב-תכליתי למשרד ולשטח',
  },
  {
    key: 'dark_jeans',
    item_type: 'ג׳ינס כהה',
    color: 'Navy',
    category: 'bottoms',
    match: (i) =>
      i.category === 'bottoms' &&
      /jean/i.test(i.subcategory ?? '') &&
      (i.color ?? []).some((c) => ['Navy', 'Black', 'Blue'].includes(c)),
    impact: 'מתאים גם למעלה וגם למטה בקלות',
  },
  {
    key: 'neutral_layer',
    item_type: 'שכבה נייטרלית (אוברשירט / קרדיגן)',
    color: 'Grey',
    category: 'outerwear',
    match: (i) => i.category === 'outerwear',
    impact: 'מוסיף ליטוש וחום',
  },
]

export function shoppingGaps(
  items: WardrobeItem[],
  styleProfile: StyleProfile | null,
  weather: WeatherContext | null,
): ShoppingGap[] {
  const gaps: ShoppingGap[] = []
  const presentCats = new Set(items.map((i) => i.category))

  // 1. Missing core categories.
  for (const cat of ['tops', 'bottoms', 'shoes'] as WardrobeCategory[]) {
    if (!presentCats.has(cat)) {
      gaps.push({
        key: `category_${cat}`,
        item_type: categoryLabel(cat),
        recommended_color: 'Navy',
        priority: 'high',
        reason: `אין לך ${categoryLabel(cat)} בארון.`,
        outfit_impact: 'פריט בסיס — נחוץ כמעט לכל לוק',
      })
    }
  }

  // 2. Style-DNA personalized essentials (premium / smart-casual).
  const style = (styleProfile?.preferred_style ?? '').toLowerCase()
  const isElevated = style.includes('smart') || style.includes('premium') || style.includes('business')
  if (isElevated || !styleProfile) {
    for (const e of SMART_CASUAL_ESSENTIALS) {
      if (!items.some(e.match)) {
        gaps.push({
          key: `essential_${e.key}`,
          item_type: e.item_type,
          recommended_color: e.color,
          priority: isElevated ? 'high' : 'medium',
          reason: 'חסר פריט בסיס לסגנון שלך.',
          outfit_impact: e.impact,
        })
      }
    }
  }

  // 3. Missing core colors.
  const presentColors = new Set<string>()
  items.forEach((i) => (i.color ?? []).forEach((c) => presentColors.add(c)))
  for (const c of CORE_COLORS) {
    if (!presentColors.has(c)) {
      gaps.push({
        key: `color_${c}`,
        item_type: 'פריט רב-תכליתי',
        recommended_color: c,
        priority: 'low',
        reason: `אין פריטים בצבע ${colorLabel(c)} — צבע נייטרלי חשוב לשילובים.`,
        outfit_impact: 'משפר את התאמות הצבעים בארון',
      })
    }
  }

  // 4. Missing formality levels.
  const forms = new Set(items.map(inferFormality))
  const hasFormal = [4, 5].some((f) => forms.has(f))
  const hasCasual = [1, 2].some((f) => forms.has(f))
  if (items.length > 0 && !hasFormal) {
    gaps.push({
      key: 'formality_formal',
      item_type: 'אפשרות רשמית (בלייזר או נעלי אלגנט)',
      recommended_color: 'Navy',
      priority: 'medium',
      reason: 'אין פריטים ברמת רשמיות גבוהה לאירועים מחויטים.',
      outfit_impact: 'פותח לוקים לפגישת הנהלה / אירוע ערב',
    })
  }
  if (items.length > 0 && !hasCasual) {
    gaps.push({
      key: 'formality_casual',
      item_type: 'אפשרות יומיומית (טי-שירט או סניקרס)',
      recommended_color: 'White',
      priority: 'low',
      reason: 'אין פריטים יומיומיים לימים רגועים.',
      outfit_impact: 'פותח לוקים קז׳ואליים / לסופ״ש',
    })
  }

  // 5. Season / weather coverage.
  const seasonSet = new Set<string>()
  let hasAllSeason = false
  items.forEach((i) => {
    const s = (i.season ?? '').trim().toLowerCase()
    if (s === 'all-season') hasAllSeason = true
    else if (SEASONS.includes(s)) seasonSet.add(s)
  })
  if (!hasAllSeason) {
    for (const s of SEASONS) {
      if (!seasonSet.has(s)) {
        gaps.push({
          key: `season_${s}`,
          item_type: `שכבה ל${seasonLabel(s)}`,
          recommended_color: 'Grey',
          priority: 'low',
          reason: `כיסוי מוגבל ל${seasonLabel(s)} בארון.`,
          outfit_impact: `שומר עליך מוכן ל${seasonLabel(s)}`,
        })
      }
    }
  }

  // 6. Weather-specific (only when weather is available).
  if (weather) {
    if (isWet(weather) && !items.some((i) => /boot/i.test(i.subcategory ?? ''))) {
      gaps.push({
        key: 'weather_boots',
        item_type: 'מגפיים עמידים למזג אוויר',
        recommended_color: 'Brown',
        priority: 'high',
        reason: 'צפוי גשם ואין לך מגפיים.',
        outfit_impact: 'שומר על נעליים פרקטיות במזג אוויר רטוב',
      })
    }
    if (feelsLike(weather) < 10 && !presentCats.has('outerwear')) {
      gaps.push({
        key: 'weather_coat',
        item_type: 'מעיל חם',
        recommended_color: 'Navy',
        priority: 'high',
        reason: 'תנאים קרים ואין שכבה עליונה.',
        outfit_impact: 'שכבה חיונית לימים קרים',
      })
    }
  }

  // Dedupe by stable key (keep highest priority) + sort.
  const byKey = new Map<string, ShoppingGap>()
  for (const g of gaps) {
    const existing = byKey.get(g.key)
    if (!existing || PRIORITY_RANK[g.priority] < PRIORITY_RANK[existing.priority]) {
      byKey.set(g.key, g)
    }
  }
  return [...byKey.values()].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
}
