import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Shirt,
  ScanLine,
  CalendarDays,
  CloudSun,
  Lightbulb,
  ChevronRight,
  MessageCircle,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useWeather } from '@/hooks/useWeather'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useOutfits, type SavedOutfit } from '@/hooks/useOutfits'
import { useFitCheck } from '@/hooks/useFitCheck'
import { usePlanner, type PlanDayWithOutfit } from '@/hooks/usePlanner'
import { useOutfitRanking, type AIRanking } from '@/hooks/useOutfitRanking'
import { buildProfileSummary } from '@/lib/style-profile-constants'
import { buildOutfits, type GeneratedOutfit, type OutfitBrief, type Occasion } from '@/lib/outfit-engine'
import { formatDate } from '@/lib/utils'
import { t, styleLabel, occasionLabel } from '@/i18n'
import type { StyleProfile, WardrobeItem, OutfitSlot, FitCheck } from '@/types'

const SLOT_ORDER: OutfitSlot[] = ['top', 'bottom', 'outerwear', 'shoes', 'belt', 'watch', 'fragrance']

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return t.greeting.morning
  if (h < 17) return t.greeting.afternoon
  return t.greeting.evening
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function genThumbs(outfit: GeneratedOutfit) {
  return SLOT_ORDER.filter((s) => outfit.slots[s]).map((s) => ({
    key: s,
    url: outfit.slots[s]!.image_url,
    name: outfit.slots[s]!.name,
  }))
}

function savedThumbs(outfit: SavedOutfit) {
  return [...outfit.outfit_items]
    .sort((a, b) => SLOT_ORDER.indexOf((a.slot ?? '') as OutfitSlot) - SLOT_ORDER.indexOf((b.slot ?? '') as OutfitSlot))
    .map((oi) => ({ key: oi.id, url: oi.wardrobe_items?.image_url ?? null }))
}

function Thumbs({ items }: { items: { key: string; url: string | null }[] }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {items.map((t) => (
        <div key={t.key} className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
          {t.url ? (
            <img src={t.url} alt="Outfit item" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Shirt className="h-4 w-4 text-foreground/20" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

// One human-readable wardrobe insight (graceful when data is thin).
function wardrobeInsight(items: WardrobeItem[]): string | null {
  if (items.length === 0) return null
  const withWear = items
    .map((i) => ({ i, d: daysSince(i.last_worn_at) }))
    .filter((x) => x.d !== null && (x.d as number) >= 30)
    .sort((a, b) => (b.d as number) - (a.d as number))
  if (withWear.length > 0) {
    const { i, d } = withWear[0]
    return `You haven't worn your ${i.name} in ${d} days.`
  }
  const hasFormalShoes = items.some(
    (i) =>
      i.category === 'shoes' &&
      ((i.formality_level ?? 0) >= 4 ||
        ['dress shoes', 'loafers'].includes((i.subcategory ?? '').toLowerCase())),
  )
  if (!hasFormalShoes) return 'Your wardrobe lacks formal shoes — consider adding a pair.'
  const neverWorn = items.filter((i) => i.worn_count === 0).length
  if (neverWorn > 0) return `You have ${neverWorn} item${neverWorn === 1 ? '' : 's'} you've never worn — try one today.`
  return 'Your wardrobe is in healthy rotation.'
}

export function DashboardPage() {
  const { profile, user } = useAuthStore()
  const { items, isLoaded, fetchItems } = useWardrobe()
  const { city, weather } = useWeather()
  const { fetchStyleProfile } = useStyleProfile()
  const { fetchOutfits } = useOutfits()
  const { fetchFitChecks } = useFitCheck()
  const { fetchPlans, fetchPlan } = usePlanner()
  const { rankOutfits } = useOutfitRanking()

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there'

  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)
  const [outfits, setOutfits] = useState<SavedOutfit[]>([])
  const [lastFitCheck, setLastFitCheck] = useState<FitCheck | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [todayPlanDay, setTodayPlanDay] = useState<PlanDayWithOutfit | null>(null)
  const [hasPlan, setHasPlan] = useState(false)

  const [rec, setRec] = useState<{
    outfit: GeneratedOutfit
    ai?: AIRanking
    source: 'rule' | 'ai'
    fallback?: boolean
  } | null>(null)
  // Guards the "today's outfit" recommendation so AI ranking runs at most once per
  // relevant input change — and never auto-retries on failure (prevents call loop).
  const recRanRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) void fetchItems()
  }, [isLoaded, fetchItems])

  // Aggregate the dashboard data sources (each independent; failures degrade).
  useEffect(() => {
    let active = true
    void (async () => {
      const [profileRes, outfitsRes, fitRes, plansRes] = await Promise.all([
        fetchStyleProfile(),
        fetchOutfits(),
        fetchFitChecks(),
        fetchPlans(),
      ])
      if (!active) return
      if (profileRes.data) setStyleProfile(profileRes.data)
      setOutfits(outfitsRes.data)
      setLastFitCheck(fitRes.data[0] ?? null)

      if (plansRes.data.length > 0) {
        setHasPlan(true)
        const latest = plansRes.data[0]
        setPlanId(latest.id)
        const { data: full } = await fetchPlan(latest.id)
        if (active && full) {
          setTodayPlanDay(full.days.find((d) => d.day === todayISO()) ?? null)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [fetchStyleProfile, fetchOutfits, fetchFitChecks, fetchPlans, fetchPlan])

  // Today's recommendation: rule engine first (instant), AI upgrade in background.
  // Runs at most ONCE per input signature; on AI failure it keeps the rule pick and
  // does not retry (the signature is already recorded).
  useEffect(() => {
    if (!isLoaded || items.length === 0) return

    const sig = [
      items.length,
      items[0]?.id ?? '',
      items[0]?.updated_at ?? '',
      styleProfile?.id ?? 'none',
      weather?.city ?? 'none',
      weather ? Math.round(weather.temperature) : 'none',
    ].join('|')
    if (recRanRef.current === sig) return
    recRanRef.current = sig

    const occasion = ((styleProfile?.typical_day_types?.[0] as Occasion) ?? 'Office') as Occasion
    const brief: OutfitBrief = {
      occasion,
      locationType: 'Indoor',
      desiredStyle: styleProfile?.preferred_style?.trim() || 'Smart Casual',
      formalityLevel: styleProfile?.preferred_formality ?? 3,
    }
    const candidates = buildOutfits(items, brief, weather ?? undefined)
    if (candidates.length === 0) {
      setRec(null)
      return
    }
    // Show the rule pick immediately — the dashboard never blocks on AI.
    setRec({ outfit: candidates[0], source: 'rule' })

    let active = true
    void (async () => {
      const userProfile = styleProfile ? buildProfileSummary(styleProfile) : null
      const { data } = await rankOutfits(brief, candidates, userProfile, weather)
      if (!active) return
      if (!data?.rankings?.length) {
        // AI failed/empty — fall back to rule pick, flag it, and do NOT retry.
        setRec((prev) => (prev ? { ...prev, source: 'rule', fallback: true } : prev))
        return
      }
      const topId = data.ranked_candidate_ids[0]
      const top = candidates.find((c) => c.key === topId) ?? candidates[0]
      const ai = data.rankings.find((r) => r.candidate_id === top.key)
      setRec({ outfit: top, ai, source: 'ai' })
    })()
    return () => {
      active = false
    }
  }, [isLoaded, items, styleProfile, weather, rankOutfits])

  // ---- derived stats ----
  const stats = useMemo(() => {
    const total = items.length
    const analyzed = items.filter((i) => i.ai_analyzed_at).length
    const neverWorn = items.filter((i) => i.worn_count === 0).length
    const stale = items.filter((i) => {
      const d = daysSince(i.last_worn_at)
      return d !== null && d >= 30
    }).length
    return { total, analyzed, neverWorn, stale }
  }, [items])

  const insight = useMemo(() => wardrobeInsight(items), [items])

  const recentlyWorn = useMemo(
    () =>
      outfits
        .filter((o) => o.last_worn_at)
        .sort((a, b) => new Date(b.last_worn_at!).getTime() - new Date(a.last_worn_at!).getTime())
        .slice(0, 3),
    [outfits],
  )
  const recentlySaved = useMemo(() => outfits.slice(0, 3), [outfits])

  const quickActions = [
    { to: '/stylist', label: t.dashboard.actionStylist, icon: MessageCircle },
    { to: '/fit-check', label: t.dashboard.actionFitCheck, icon: ScanLine },
    { to: '/planner', label: t.dashboard.actionPlanner, icon: CalendarDays },
    { to: '/wardrobe', label: t.dashboard.actionWardrobe, icon: Shirt },
    { to: '/outfits', label: t.dashboard.actionBuild, icon: Sparkles },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()}</p>
          <h2 className="text-2xl font-bold tracking-tight">{firstName}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{formatDate(new Date().toISOString())}</span>
            {weather && (
              <span className="flex items-center gap-1">
                <CloudSun className="h-4 w-4" />
                {weather.city} · {Math.round(weather.temperature)}°C {weather.condition}
              </span>
            )}
            {!weather && city && <span>{city}</span>}
          </div>
          {styleProfile?.preferred_style && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t.dashboard.styleDna}
              {styleLabel(styleProfile.preferred_style)}
              {styleProfile.preferred_formality
                ? ` · ${t.dashboard.formality} ${styleProfile.preferred_formality}/5`
                : ''}
            </p>
          )}
        </div>

        {/* Personal Stylist entry */}
        <Link
          to="/stylist"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t.dashboard.actionStylist}</p>
            <p className="text-xs text-muted-foreground">{t.dashboard.stylistSubtitle}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>

        {/* Today's recommendation */}
        <section>
          <SectionTitle>{t.dashboard.todayOutfit}</SectionTitle>
          {rec ? (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-semibold">
                  {rec.source === 'ai' ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> {t.dashboard.aiPick}
                    </>
                  ) : rec.fallback ? (
                    t.dashboard.ruleFallback
                  ) : (
                    t.dashboard.rulePick
                  )}
                </span>
                <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
                  {rec.ai ? `${rec.ai.ai_score}/10` : `${rec.outfit.score.toFixed(1)}/10`}
                </span>
              </div>
              <Thumbs items={genThumbs(rec.outfit)} />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {rec.ai?.explanation ?? rec.outfit.explanation}
              </p>
              {rec.ai?.styling_tip && (
                <p className="mt-1 text-xs leading-relaxed">
                  <span className="font-semibold">{t.dashboard.tip}</span>
                  {rec.ai.styling_tip}
                </p>
              )}
              <Link to="/outfits" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">
                {t.dashboard.openBuilder}
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center">
              <p className="text-sm font-medium">{t.dashboard.noRecommendation}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.dashboard.noRecommendationHint}</p>
              <Link to="/wardrobe/add" className="mt-2 inline-block text-sm font-medium underline-offset-4 hover:underline">
                {t.dashboard.addItem}
              </Link>
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <SectionTitle>{t.dashboard.quickActions}</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Wardrobe intelligence */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <SectionTitle>{t.dashboard.wardrobe}</SectionTitle>
            <Link to="/wardrobe/insights" className="text-xs font-medium underline-offset-4 hover:underline">
              {t.dashboard.insights}
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: t.dashboard.statItems, value: stats.total },
              { label: t.dashboard.statAnalyzed, value: stats.analyzed },
              { label: t.dashboard.statNeverWorn, value: stats.neverWorn },
              { label: t.dashboard.statIdle, value: stats.stale },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/60 p-3 text-center">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {insight && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-card p-3">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm">{insight}</p>
            </div>
          )}
        </section>

        {/* Planner intelligence */}
        <section>
          <SectionTitle>{t.dashboard.todayPlan}</SectionTitle>
          {todayPlanDay ? (
            <Link
              to={planId ? `/planner/${planId}` : '/planner'}
              className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {todayPlanDay.occasion ? occasionLabel(todayPlanDay.occasion) : t.dashboard.todayPlan}
                </span>
                <Badge variant={todayPlanDay.worn_at ? 'secondary' : 'outline'}>
                  {todayPlanDay.worn_at ? t.dashboard.worn : t.dashboard.planned}
                </Badge>
              </div>
              {todayPlanDay.outfits ? (
                <Thumbs items={savedThumbs(todayPlanDay.outfits)} />
              ) : (
                <p className="text-sm text-muted-foreground">{t.dashboard.noPlanToday}</p>
              )}
            </Link>
          ) : hasPlan ? (
            <Link
              to={planId ? `/planner/${planId}` : '/planner'}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
            >
              <span className="text-sm">{t.dashboard.noPlanToday}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <Link
              to="/planner"
              className="flex items-center justify-between rounded-2xl border border-dashed border-border p-4 transition-colors hover:bg-accent/40"
            >
              <span className="text-sm font-medium">{t.dashboard.generatePlan}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}
        </section>

        {/* Fit Check intelligence */}
        <section>
          <SectionTitle>{t.dashboard.fitCheckTitle}</SectionTitle>
          {lastFitCheck ? (
            <Link
              to={`/fit-check/${lastFitCheck.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={lastFitCheck.photo_url} alt="Last fit check" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {lastFitCheck.overall_score !== null ? `${lastFitCheck.overall_score}/10` : 'Fit Check'} ·{' '}
                  {formatDate(lastFitCheck.created_at)}
                </p>
                {lastFitCheck.final_verdict && (
                  <p className="truncate text-xs text-muted-foreground">{lastFitCheck.final_verdict}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : (
            <Link
              to="/fit-check"
              className="flex items-center justify-between rounded-2xl border border-dashed border-border p-4 transition-colors hover:bg-accent/40"
            >
              <span className="text-sm font-medium">{t.dashboard.runFirstFitCheck}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}
        </section>

        {/* History */}
        {(recentlyWorn.length > 0 || recentlySaved.length > 0) && (
          <section className="space-y-4">
            {recentlyWorn.length > 0 && (
              <div>
                <SectionTitle>{t.dashboard.recentlyWorn}</SectionTitle>
                <div className="space-y-2">
                  {recentlyWorn.map((o) => (
                    <Link
                      key={o.id}
                      to={`/outfits/${o.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
                    >
                      <Thumbs items={savedThumbs(o)} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {o.last_worn_at ? formatDate(o.last_worn_at) : ''}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {recentlySaved.length > 0 && (
              <div>
                <SectionTitle>{t.dashboard.recentlySaved}</SectionTitle>
                <div className="space-y-2">
                  {recentlySaved.map((o) => (
                    <Link
                      key={o.id}
                      to={`/outfits/${o.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
                    >
                      <Thumbs items={savedThumbs(o)} />
                      <span className="ml-auto truncate text-xs text-muted-foreground">{o.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/*
          Future extension points (Phase 4.5+):
          - notifications: a banner slot above "Today's outfit".
          - Google Calendar: feed events into planDayBriefs to set today's occasion.
          - morning briefing: assemble greeting + weather + today's pick into a push.
          - style insights engine: replace wardrobeInsight() with a richer analyzer.
        */}
      </div>
    </AppLayout>
  )
}
