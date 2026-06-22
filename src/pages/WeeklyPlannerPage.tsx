import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlanDayCard, type DayThumb } from '@/components/planner/PlanDayCard'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useWeather } from '@/hooks/useWeather'
import { useOutfitRanking, type AIRanking } from '@/hooks/useOutfitRanking'
import { usePlanner, type PlanDaySaveInput } from '@/hooks/usePlanner'
import { buildProfileSummary } from '@/lib/style-profile-constants'
import { buildOutfits, type GeneratedOutfit, type OutfitBrief } from '@/lib/outfit-engine'
import { planDayBriefs, chooseRotated, outfitItemIds, type PlanDayBrief } from '@/lib/planner'
import { fetchForecast, type WeatherContext } from '@/lib/weather'
import { useToast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { t, occasionLabel, slotLabel } from '@/i18n'
import type { StyleProfile, WeeklyPlan, PlanMode, OutfitSlot } from '@/types'

const SLOTS: OutfitSlot[] = ['top', 'bottom', 'outerwear', 'shoes', 'belt', 'watch', 'fragrance']

interface DayDraft {
  brief: PlanDayBrief
  weather: WeatherContext | null
  candidates: GeneratedOutfit[]
  ai: Record<string, AIRanking>
  chosenIndex: number
  reused: boolean
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weatherText(w: WeatherContext | null): string | null {
  return w ? `${Math.round(w.temperature)}°C ${w.condition}` : null
}

function thumbsFor(outfit: GeneratedOutfit): DayThumb[] {
  return SLOTS.filter((slot) => outfit.slots[slot]).map((slot) => {
    const item = outfit.slots[slot]!
    return { key: slot, imageUrl: item.image_url, label: slotLabel(slot) }
  })
}

export function WeeklyPlannerPage() {
  const navigate = useNavigate()
  const { items, isLoaded, fetchItems } = useWardrobe()
  const { fetchStyleProfile } = useStyleProfile()
  const { city, weather } = useWeather()
  const { rankOutfits } = useOutfitRanking()
  const { savePlan, fetchPlans, isSaving } = usePlanner()
  const { toast } = useToast()

  const [startDate, setStartDate] = useState(todayISO())
  const [mode, setMode] = useState<PlanMode>('work_week')
  const [useAi, setUseAi] = useState(true)
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)

  const [drafts, setDrafts] = useState<DayDraft[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [history, setHistory] = useState<WeeklyPlan[]>([])

  useEffect(() => {
    if (!isLoaded) void fetchItems()
  }, [isLoaded, fetchItems])

  useEffect(() => {
    let active = true
    void (async () => {
      const [profileRes, plansRes] = await Promise.all([fetchStyleProfile(), fetchPlans()])
      if (!active) return
      if (profileRes.data) setStyleProfile(profileRes.data)
      setHistory(plansRes.data)
    })()
    return () => {
      active = false
    }
  }, [fetchStyleProfile, fetchPlans])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const briefs = planDayBriefs(startDate, mode, styleProfile)

      // Forecast for the whole range (optional — graceful if no city / out of range).
      let forecast: Record<string, WeatherContext> = {}
      if (city.trim()) {
        try {
          forecast = await fetchForecast(city, briefs[0].date, briefs[briefs.length - 1].date)
        } catch {
          forecast = {}
        }
      }

      const userProfile = styleProfile ? buildProfileSummary(styleProfile) : null
      const used = new Set<string>()
      const out: DayDraft[] = []

      for (const brief of briefs) {
        const dayWeather = forecast[brief.date] ?? null
        const engineBrief: OutfitBrief = {
          occasion: brief.occasion,
          locationType: brief.locationType,
          desiredStyle: brief.desiredStyle,
          formalityLevel: brief.formalityLevel,
        }
        let candidates = buildOutfits(items, engineBrief, dayWeather ?? undefined)
        const ai: Record<string, AIRanking> = {}

        if (candidates.length > 0 && useAi) {
          const { data } = await rankOutfits(engineBrief, candidates, userProfile, dayWeather)
          if (data) {
            const byKey = new Map(candidates.map((c) => [c.key, c]))
            const ordered = data.ranked_candidate_ids
              .map((id) => byKey.get(id))
              .filter(Boolean) as GeneratedOutfit[]
            for (const c of candidates) if (!ordered.includes(c)) ordered.push(c)
            candidates = ordered
            for (const r of data.rankings) ai[r.candidate_id] = r
          }
        }

        let chosenIndex = 0
        let reused = false
        if (candidates.length > 0) {
          const pick = chooseRotated(candidates, used)
          chosenIndex = pick.index
          reused = pick.reused
          for (const id of outfitItemIds(candidates[chosenIndex])) used.add(id)
        }

        out.push({ brief, weather: dayWeather, candidates, ai, chosenIndex, reused })
      }

      setDrafts(out)
      const built = out.filter((d) => d.candidates.length > 0).length
      if (built === 0) {
        toast({
          title: t.planner.noOutfitsPlanned,
          description: t.planner.addMore,
          variant: 'destructive',
        })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const replaceDay = (dayIdx: number) => {
    setDrafts((prev) => {
      if (!prev) return prev
      const copy = [...prev]
      const d = copy[dayIdx]
      if (d.candidates.length > 1) {
        copy[dayIdx] = { ...d, chosenIndex: (d.chosenIndex + 1) % d.candidates.length, reused: false }
      }
      return copy
    })
  }

  const handleSave = async () => {
    if (!drafts) return
    const inputs: PlanDaySaveInput[] = drafts.map((d, i) => {
      const chosen = d.candidates[d.chosenIndex] ?? null
      const notes = chosen
        ? `${chosen.explanation}${d.reused ? t.planner.limitedWardrobe : ''}`
        : t.planner.noOutfit
      return { dayIndex: i, brief: d.brief, outfit: chosen, weather: d.weather, notes }
    })
    const { id, error } = await savePlan(startDate, mode, inputs)
    if (error || !id) {
      toast({ title: t.planner.title, description: error?.message ?? '', variant: 'destructive' })
      return
    }
    toast({ title: t.planner.planSaved })
    navigate(`/planner/${id}`)
  }

  if (!isLoaded) {
    return (
      <AppLayout title={t.planner.title}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Weekly Planner">
      <div className="space-y-5 pb-6">
        {/* Controls */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="start">{t.planner.startDate}</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>{t.planner.mode}</Label>
            <div className="flex gap-2">
              {(['work_week', 'full_week'] as PlanMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    mode === m
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background hover:border-foreground/40'
                  }`}
                >
                  {m === 'work_week' ? t.planner.workWeek : t.planner.fullWeek}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{t.planner.useAi}</span>
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="h-4 w-4 accent-foreground"
            />
          </label>

          <p className="text-xs text-muted-foreground">
            {city.trim()
              ? `${t.planner.weatherUsing}${weather?.city ?? city}.`
              : t.planner.weatherTip}
          </p>

          <Button className="w-full" onClick={handleGenerate} isLoading={isGenerating}>
            <CalendarDays className="h-4 w-4" />
            {isGenerating ? t.planner.planning : t.planner.generate}
          </Button>
        </div>

        {/* Drafts */}
        {drafts && drafts.length > 0 && (
          <div className="space-y-4">
            {drafts.map((d, i) => {
              const chosen = d.candidates[d.chosenIndex]
              const ai = chosen ? d.ai[chosen.key] : undefined
              return (
                <PlanDayCard
                  key={d.brief.date}
                  weekday={d.brief.weekday}
                  date={d.brief.date}
                  occasion={occasionLabel(d.brief.occasion)}
                  weatherText={weatherText(d.weather)}
                  thumbnails={chosen ? thumbsFor(chosen) : []}
                  explanation={
                    chosen
                      ? `${chosen.explanation}${d.reused ? t.planner.limitedWardrobe : ''}`
                      : t.planner.noOutfit
                  }
                  badge={ai ? `AI ${ai.ai_score}/10` : chosen ? `Rule ${chosen.score.toFixed(1)}/10` : null}
                >
                  {d.candidates.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => replaceDay(i)}>
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t.planner.replace}
                    </Button>
                  )}
                </PlanDayCard>
              )
            })}

            <Button className="w-full" onClick={handleSave} isLoading={isSaving}>
              {t.planner.savePlan}
            </Button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.planner.previous}
            </h3>
            <div className="space-y-2">
              {history.map((p) => (
                <Link
                  key={p.id}
                  to={`/planner/${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {p.mode === 'work_week' ? t.planner.workWeek : t.planner.fullWeek} · {p.start_date}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.saved.savedOn} {formatDate(p.created_at)}</p>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}
