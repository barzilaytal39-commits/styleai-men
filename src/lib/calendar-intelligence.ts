// Calendar Intelligence Engine (Phase 8A). PURE — no AI, no external APIs, no DB.
// Foundation for future calendar integrations.
//
// Layered for pluggability — downstream code only ever consumes CalendarContext:
//
//   Event Source (future: Google / Apple / Outlook adapters)
//        ↓  produces CalendarEvent[]
//   Classification (classifyEvent — deterministic keywords, Hebrew + English)
//        ↓  produces ClassifiedEvent[]
//   Calendar Context (buildCalendarContext — summaries, dress code, recommendations)
//
// To add a provider later, implement `CalendarSource.listEvents()` → CalendarEvent[]
// and feed the result to buildCalendarContext(); nothing downstream changes.
//
// Context strings are English (internal/context layer); localize at the UI later.

export interface CalendarEvent {
  id?: string
  title: string
  start?: string | null // ISO datetime
  end?: string | null
  location?: string | null
  notes?: string | null
}

// Future provider adapters implement this; not used yet (no source connected).
export interface CalendarSource {
  id: string // 'google' | 'apple' | 'outlook' | …
  listEvents(rangeDays?: number): Promise<CalendarEvent[]>
}

export type EventType =
  | 'office'
  | 'executive_meeting'
  | 'presentation'
  | 'client_meeting'
  | 'site_visit'
  | 'conference'
  | 'travel'
  | 'airport'
  | 'dinner'
  | 'wedding'
  | 'party'
  | 'date'
  | 'shopping'
  | 'family'
  | 'casual'
  | 'workout'
  | 'unknown'

export interface ClassifiedEvent extends CalendarEvent {
  type: EventType
}

export interface CalendarContext {
  today_summary: string
  tomorrow_summary: string
  this_week_summary: string
  today_types: EventType[]
  tomorrow_types: EventType[]
  event_types: EventType[]
  dress_code: string
  busiest_day: string | null
  earliest_event: { title: string; start: string } | null
  latest_event: { title: string; start: string } | null
  recommendations: string[]
}

// Readable English labels for each type (used in summaries).
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  office: 'office',
  executive_meeting: 'executive meeting',
  presentation: 'presentation',
  client_meeting: 'client meeting',
  site_visit: 'site visit',
  conference: 'conference',
  travel: 'travel',
  airport: 'airport',
  dinner: 'dinner',
  wedding: 'wedding',
  party: 'party',
  date: 'date',
  shopping: 'shopping',
  family: 'family',
  casual: 'casual',
  workout: 'workout',
  unknown: 'event',
}

// Dress-code mapping per event type.
export const DRESS_CODE_BY_TYPE: Record<EventType, string> = {
  office: 'Smart Casual',
  executive_meeting: 'Business Casual',
  presentation: 'Business',
  client_meeting: 'Business Casual',
  site_visit: 'Smart Casual Premium',
  conference: 'Smart Casual',
  travel: 'Comfortable Smart Casual',
  airport: 'Comfortable Smart Casual',
  dinner: 'Smart Casual',
  wedding: 'Formal',
  party: 'Smart Casual',
  date: 'Smart Casual Premium',
  shopping: 'Casual',
  family: 'Smart Casual',
  casual: 'Casual',
  workout: 'Activewear',
  unknown: 'Smart Casual',
}

// Higher = more formal — used to pick the day's overall dress code.
const DRESS_CODE_RANK: Record<string, number> = {
  Activewear: 0,
  Casual: 1,
  'Comfortable Smart Casual': 2,
  'Smart Casual': 3,
  'Smart Casual Premium': 4,
  'Business Casual': 5,
  Business: 6,
  Formal: 7,
}

export const dressCodeForType = (type: EventType): string => DRESS_CODE_BY_TYPE[type]

// ---- classification (ordered: specific → generic) ----

const CLASSIFIER: { type: EventType; keywords: string[] }[] = [
  { type: 'airport', keywords: ['airport', 'terminal', 'נתב"ג', 'נתבג', 'שדה תעופה', 'טרמינל'] },
  {
    type: 'executive_meeting',
    keywords: ['executive', 'board', 'directors', 'הנהלה', 'ישיבת הנהלה', 'דירקטוריון'],
  },
  { type: 'presentation', keywords: ['presentation', 'demo', 'pitch', 'מצגת', 'הצגה'] },
  { type: 'client_meeting', keywords: ['client', 'customer', 'לקוח', 'פגישת לקוח'] },
  { type: 'site_visit', keywords: ['site visit', 'site', 'inspection', 'field', 'סיור', 'שטח', 'ביקור באתר', 'אתר'] },
  { type: 'conference', keywords: ['conference', 'convention', 'expo', 'summit', 'meetup', 'כנס', 'תערוכה'] },
  { type: 'wedding', keywords: ['wedding', 'engagement', 'חתונה', 'חינה', 'אירוסין'] },
  { type: 'party', keywords: ['party', 'celebration', 'מסיבה', 'חגיגה'] },
  { type: 'date', keywords: ['date night', 'romantic', 'דייט', 'רומנטי'] },
  { type: 'family', keywords: ['family', 'משפחה', 'הורים', 'סבא', 'סבתא', 'ארוחה משפחתית'] },
  { type: 'dinner', keywords: ['dinner', 'restaurant', 'ארוחת ערב', 'מסעדה'] },
  { type: 'shopping', keywords: ['shopping', 'mall', 'קניות', 'קניון', 'חנות'] },
  { type: 'workout', keywords: ['workout', 'gym', 'run', 'yoga', 'אימון', 'חדר כושר', 'כושר', 'ריצה', 'יוגה'] },
  { type: 'travel', keywords: ['flight', 'travel', 'trip', 'abroad', 'טיסה', 'נסיעה', 'חו"ל'] },
  { type: 'office', keywords: ['office', 'work', 'meeting', 'sync', 'standup', 'משרד', 'עבודה', 'פגישה', 'ישיבה'] },
  { type: 'casual', keywords: ['casual', 'coffee', 'friends', 'hangout', 'קז׳ואל', 'קפה', 'חברים', 'בילוי'] },
]

export function classifyEvent(event: CalendarEvent): EventType {
  const hay = `${event.title ?? ''} ${event.notes ?? ''} ${event.location ?? ''}`.toLowerCase()
  for (const rule of CLASSIFIER) {
    if (rule.keywords.some((k) => hay.includes(k.toLowerCase()))) return rule.type
  }
  return 'unknown'
}

// ---- context builder ----

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function localDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function distinctTypes(events: ClassifiedEvent[]): EventType[] {
  return [...new Set(events.map((e) => e.type))]
}

function topDressCode(events: ClassifiedEvent[]): string {
  let best = ''
  let bestRank = -1
  for (const e of events) {
    const dc = DRESS_CODE_BY_TYPE[e.type]
    const r = DRESS_CODE_RANK[dc] ?? 0
    if (r > bestRank) {
      bestRank = r
      best = dc
    }
  }
  return best
}

function daySummary(label: string, events: ClassifiedEvent[]): string {
  if (events.length === 0) return `${label}: no events.`
  const types = distinctTypes(events).map((t) => EVENT_TYPE_LABELS[t])
  return `${label}: ${types.join(', ')}.`
}

export function buildCalendarContext(events: CalendarEvent[] = [], now: Date = new Date()): CalendarContext {
  const classified: ClassifiedEvent[] = events.map((e) => ({ ...e, type: classifyEvent(e) }))

  const todayKey = localDate(now)
  const tomorrowKey = localDate(new Date(now.getTime() + 86_400_000))
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000)

  const dated = classified.filter((e) => e.start && !Number.isNaN(new Date(e.start).getTime()))
  const onDay = (key: string) => dated.filter((e) => localDate(new Date(e.start as string)) === key)
  const thisWeek = dated.filter((e) => {
    const d = new Date(e.start as string)
    return d >= new Date(todayKey) && d <= weekEnd
  })

  const today = onDay(todayKey)
  const tomorrow = onDay(tomorrowKey)

  // busiest day in the next week
  const counts = new Map<string, number>()
  for (const e of thisWeek) {
    const k = localDate(new Date(e.start as string))
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  let busiest_day: string | null = null
  let busiestCount = 0
  for (const [k, c] of counts) {
    if (c > busiestCount) {
      busiestCount = c
      busiest_day = WEEKDAYS[new Date(k).getDay()]
    }
  }

  // earliest / latest by start time within the week (fall back to today)
  const pool = today.length ? today : thisWeek
  const sorted = [...pool].sort(
    (a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime(),
  )
  const toRef = (e?: ClassifiedEvent) =>
    e ? { title: e.title, start: e.start as string } : null

  // dress code for today (else tomorrow)
  const dress_code = today.length ? topDressCode(today) : tomorrow.length ? topDressCode(tomorrow) : ''

  // recommendations
  const recommendations: string[] = []
  if (today.length) {
    const rank = DRESS_CODE_RANK[dress_code] ?? 0
    if (rank <= DRESS_CODE_RANK['Smart Casual']) recommendations.push('Mostly casual today.')
    if (dress_code) recommendations.push(`Suggested dress code: ${dress_code}.`)
  } else {
    recommendations.push('Nothing scheduled today — dress to your own plans.')
  }
  if (today.some((e) => e.type === 'airport' || e.type === 'travel'))
    recommendations.push('Travel today — prioritize comfort.')
  if (busiest_day && busiestCount > 1) recommendations.push(`Busiest day this week: ${busiest_day}.`)

  return {
    today_summary: daySummary('Today', today),
    tomorrow_summary: daySummary('Tomorrow', tomorrow),
    today_types: distinctTypes(today),
    tomorrow_types: distinctTypes(tomorrow),
    this_week_summary: thisWeek.length
      ? `This week: ${thisWeek.length} event(s) — ${distinctTypes(thisWeek)
          .map((t) => EVENT_TYPE_LABELS[t])
          .join(', ')}.`
      : 'This week: no events.',
    event_types: distinctTypes(thisWeek),
    dress_code,
    busiest_day,
    earliest_event: toRef(sorted[0]),
    latest_event: toRef(sorted[sorted.length - 1]),
    recommendations,
  }
}
