import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Check } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { PlanDayCard, type DayThumb } from '@/components/planner/PlanDayCard'
import { usePlanner, type FullPlan, type PlanDayWithOutfit } from '@/hooks/usePlanner'
import { useOutfits } from '@/hooks/useOutfits'
import { useToast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { t, occasionLabel, slotLabel } from '@/i18n'
import type { OutfitSlot } from '@/types'
import type { WeatherContext } from '@/lib/weather'

const SLOT_ORDER: { slot: OutfitSlot; label: string }[] = [
  { slot: 'top', label: 'Top' },
  { slot: 'bottom', label: 'Bottom' },
  { slot: 'outerwear', label: 'Outer' },
  { slot: 'shoes', label: 'Shoes' },
  { slot: 'belt', label: 'Belt' },
  { slot: 'watch', label: 'Watch' },
  { slot: 'fragrance', label: 'Scent' },
]

function thumbsForDay(day: PlanDayWithOutfit): DayThumb[] {
  const items = day.outfits?.outfit_items ?? []
  const ordered = [...items].sort(
    (a, b) =>
      SLOT_ORDER.findIndex((s) => s.slot === a.slot) - SLOT_ORDER.findIndex((s) => s.slot === b.slot),
  )
  return ordered.map((oi) => ({
    key: oi.id,
    imageUrl: oi.wardrobe_items?.image_url ?? null,
    label: slotLabel(oi.slot),
  }))
}

function weatherText(snapshot: PlanDayWithOutfit['weather_snapshot']): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  const w = snapshot as unknown as Partial<WeatherContext>
  if (typeof w.temperature !== 'number') return null
  return `${Math.round(w.temperature)}°C ${w.condition ?? ''}`.trim()
}

export function WeeklyPlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchPlan, setDayWorn } = usePlanner()
  const { markOutfitWorn } = useOutfits()
  const { toast } = useToast()
  const [plan, setPlan] = useState<FullPlan | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const { data, error } = await fetchPlan(id)
    if (error || !data) setNotFound(true)
    else setPlan(data)
  }, [id, fetchPlan])

  useEffect(() => {
    void load()
  }, [load])

  const handleMarkWorn = async (day: PlanDayWithOutfit) => {
    if (!day.outfits) return
    setMarkingId(day.id)
    const { error } = await markOutfitWorn(day.outfits)
    if (!error) await setDayWorn(day.id)
    setMarkingId(null)
    if (error) {
      toast({ title: t.profile.updateFailed, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.saved.markedWorn })
      await load()
    }
  }

  if (notFound) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground" strokeWidth={1.25} />
          <div>
            <p className="font-semibold">{t.planner.notFound}</p>
            <p className="text-sm text-muted-foreground">{t.wardrobe.notFoundHint}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/planner')}>
            {t.planner.backToPlanner}
          </Button>
        </div>
      </AppLayout>
    )
  }

  if (!plan) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout hideHeader>
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          type="button"
          onClick={() => navigate('/planner')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </button>
        <div>
          <h1 className="text-lg font-semibold">
            {plan.plan.mode === 'work_week' ? t.planner.workWeek : t.planner.fullWeek}
          </h1>
          <p className="text-xs text-muted-foreground">{plan.plan.start_date}</p>
        </div>
      </div>

      <div className="space-y-4 pt-3 pb-6">
        {plan.days.map((day) => (
          <PlanDayCard
            key={day.id}
            weekday={formatDate(day.day)}
            date={day.day}
            occasion={day.occasion ? occasionLabel(day.occasion) : null}
            weatherText={weatherText(day.weather_snapshot)}
            thumbnails={thumbsForDay(day)}
            explanation={day.notes}
            badge={day.worn_at ? t.planner.worn : null}
          >
            {day.outfits && !day.worn_at && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkWorn(day)}
                isLoading={markingId === day.id}
              >
                <Check className="h-3.5 w-3.5" />
                {t.planner.markWorn}
              </Button>
            )}
          </PlanDayCard>
        ))}
      </div>
    </AppLayout>
  )
}
