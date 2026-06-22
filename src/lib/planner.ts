// Weekly Planner helpers (Phase 4D). Pure, deterministic logic that decides
// each day's brief and applies cross-day rotation. Outfit generation itself is
// delegated to the existing rule engine (buildOutfits) + AI ranking.
//
// Future-ready: planDayBriefs is the single seam where calendar-derived
// occasions could be injected later (Google Calendar import → inferred occasion),
// replacing the default occasion sequence without touching the rest.

import type { StyleProfile, PlanMode } from '@/types'
import type { GeneratedOutfit, Occasion, LocationType } from '@/lib/outfit-engine'

export interface PlanDayBrief {
  date: string // YYYY-MM-DD
  weekday: string // e.g. "Mon"
  occasion: Occasion
  locationType: LocationType
  formalityLevel: number
  desiredStyle: string
}

const DEFAULT_WORK_OCCASIONS: Occasion[] = [
  'Office',
  'Office + Field',
  'Office',
  'Executive Meeting',
  'Office',
]

const OCCASION_FORMALITY: Record<string, number> = {
  Office: 4,
  Field: 2,
  'Office + Field': 3,
  'Executive Meeting': 5,
  Casual: 2,
  Date: 3,
  'Evening Event': 4,
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function locationForOccasion(o: Occasion): LocationType {
  if (o === 'Field') return 'Outdoor'
  if (o === 'Office + Field') return 'Mixed'
  if (o === 'Casual' || o === 'Evening Event' || o === 'Date') return 'Mixed'
  return 'Indoor'
}

// Builds the per-day briefs for the planning horizon.
// work_week = 5 weekdays from start (skips Sat/Sun); full_week = 7 consecutive days.
export function planDayBriefs(
  startISO: string,
  mode: PlanMode,
  styleProfile: StyleProfile | null,
): PlanDayBrief[] {
  const desiredStyle = styleProfile?.preferred_style?.trim() || 'Smart Casual'
  const dayTypes = (styleProfile?.typical_day_types ?? []).filter(Boolean) as Occasion[]
  const weekdayOccasions = dayTypes.length > 0 ? dayTypes : DEFAULT_WORK_OCCASIONS

  const briefs: PlanDayBrief[] = []
  const start = parseISO(startISO)
  const targetCount = mode === 'work_week' ? 5 : 7
  let cursor = new Date(start)
  let weekdayPick = 0

  while (briefs.length < targetCount) {
    const dow = cursor.getDay() // 0=Sun..6=Sat
    const isWeekend = dow === 0 || dow === 6

    if (mode === 'work_week' && isWeekend) {
      cursor = new Date(cursor.getTime() + 86_400_000)
      continue
    }

    let occasion: Occasion
    if (mode === 'full_week' && isWeekend) {
      occasion = 'Casual'
    } else {
      occasion = weekdayOccasions[weekdayPick % weekdayOccasions.length]
      weekdayPick++
    }

    const styleFormality = styleProfile?.preferred_formality ?? undefined
    const formalityLevel = styleFormality ?? OCCASION_FORMALITY[occasion] ?? 3

    briefs.push({
      date: toISO(cursor),
      weekday: WEEKDAYS[dow],
      occasion,
      locationType: locationForOccasion(occasion),
      formalityLevel,
      desiredStyle,
    })

    cursor = new Date(cursor.getTime() + 86_400_000)
  }

  return briefs
}

export function outfitItemIds(outfit: GeneratedOutfit): string[] {
  return Object.values(outfit.slots)
    .filter(Boolean)
    .map((i) => i!.id)
}

// Picks the candidate that overlaps least with items already used this week.
// reused=true means even the best option repeats an already-used item
// (limited wardrobe) — surfaced to the user as an explanation.
export function chooseRotated(
  candidates: GeneratedOutfit[],
  usedItemIds: Set<string>,
): { index: number; reused: boolean } {
  let bestIndex = 0
  let bestOverlap = Infinity
  candidates.forEach((c, idx) => {
    const overlap = outfitItemIds(c).filter((id) => usedItemIds.has(id)).length
    if (overlap < bestOverlap) {
      bestOverlap = overlap
      bestIndex = idx
    }
  })
  return { index: bestIndex, reused: bestOverlap > 0 }
}
