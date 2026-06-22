import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shirt, ShoppingBag, Lightbulb } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useOutfits } from '@/hooks/useOutfits'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useWeather } from '@/hooks/useWeather'
import {
  wardrobeHealth,
  wardrobeSections,
  shoppingGaps,
  type GapPriority,
} from '@/lib/wardrobe-insights'
import { t, categoryLabel, colorLabel } from '@/i18n'
import type { StyleProfile, WardrobeItem } from '@/types'

const METRIC_LABELS: Record<string, string> = {
  'Item count': t.insights.metricItemCount,
  'Category coverage': t.insights.metricCategory,
  Analyzed: t.insights.metricAnalyzed,
  'Color diversity': t.insights.metricColor,
  'Formality coverage': t.insights.metricFormality,
  'Season coverage': t.insights.metricSeason,
  'Usage balance': t.insights.metricUsage,
}
const PRIORITY_LABELS: Record<string, string> = {
  high: t.insights.priorityHigh,
  medium: t.insights.priorityMedium,
  low: t.insights.priorityLow,
}

function healthColor(score: number): string {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

function priorityClasses(p: GapPriority): string {
  if (p === 'high') return 'bg-rose-600 text-white'
  if (p === 'medium') return 'bg-amber-500 text-white'
  return 'bg-muted text-foreground'
}

function ItemThumb({ item }: { item: WardrobeItem }) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Shirt className="h-4 w-4 text-foreground/20" />
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, meta }: { item: WardrobeItem; meta?: string }) {
  return (
    <Link
      to={`/wardrobe/${item.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm transition-colors hover:bg-accent/40"
    >
      <ItemThumb item={item} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{categoryLabel(item.category)}</p>
      </div>
      {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
    </Link>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function daysAgo(iso: string | null): string {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return `${d}d ago`
}

export function WardrobeInsightsPage() {
  const navigate = useNavigate()
  const { items, isLoaded, fetchItems } = useWardrobe()
  const { fetchOutfits } = useOutfits()
  const { fetchStyleProfile } = useStyleProfile()
  const { weather } = useWeather()

  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)
  const [loadedExtras, setLoadedExtras] = useState(false)

  useEffect(() => {
    if (!isLoaded) void fetchItems()
  }, [isLoaded, fetchItems])

  useEffect(() => {
    let active = true
    void (async () => {
      const [outfitsRes, profileRes] = await Promise.all([fetchOutfits(), fetchStyleProfile()])
      if (!active) return
      const counts: Record<string, number> = {}
      for (const o of outfitsRes.data) {
        for (const oi of o.outfit_items) {
          counts[oi.wardrobe_item_id] = (counts[oi.wardrobe_item_id] ?? 0) + 1
        }
      }
      setUsageCounts(counts)
      if (profileRes.data) setStyleProfile(profileRes.data)
      setLoadedExtras(true)
    })()
    return () => {
      active = false
    }
  }, [fetchOutfits, fetchStyleProfile])

  const health = useMemo(() => wardrobeHealth(items), [items])
  const sections = useMemo(() => wardrobeSections(items, usageCounts), [items, usageCounts])
  const gaps = useMemo(
    () => shoppingGaps(items, styleProfile, weather ?? null),
    [items, styleProfile, weather],
  )

  const header = (
    <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <button
        type="button"
        onClick={() => navigate('/wardrobe')}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">Back</span>
      </button>
      <h1 className="text-lg font-semibold">{t.insights.title}</h1>
    </div>
  )

  if (!isLoaded || !loadedExtras) {
    return (
      <AppLayout hideHeader>
        {header}
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  if (items.length === 0) {
    return (
      <AppLayout hideHeader>
        {header}
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <Shirt className="h-12 w-12 text-muted-foreground" strokeWidth={1.25} />
          <div>
            <p className="font-semibold">{t.insights.nothingToAnalyze}</p>
            <p className="text-sm text-muted-foreground">{t.insights.nothingHint}</p>
          </div>
          <Link to="/wardrobe/add" className="text-sm font-medium underline-offset-4 hover:underline">
            {t.dashboard.addItem}
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout hideHeader>
      {header}
      <div className="space-y-6 pt-3 pb-6">
        {/* Health score */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.insights.health}
          </p>
          <p className={`mt-1 text-4xl font-bold ${healthColor(health.score)}`}>
            {health.score}
            <span className="text-lg font-medium text-muted-foreground">/100</span>
          </p>
          <div className="mt-4 space-y-2">
            {health.metrics.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{METRIC_LABELS[m.label] ?? m.label}</span>
                  <span className="font-medium">{Math.round(m.value * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${Math.round(m.value * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shopping gaps */}
        <Section title={t.insights.shopping}>
          {gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.insights.noGaps}</p>
          ) : (
            <div className="space-y-2">
              {gaps.map((g) => (
                <div key={g.key} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {g.item_type}
                        <span className="text-muted-foreground"> · {colorLabel(g.recommended_color)}</span>
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityClasses(g.priority)}`}>
                      {PRIORITY_LABELS[g.priority] ?? g.priority}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{g.reason}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                    {g.outfit_impact}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Usage sections */}
        {sections.mostWorn.length > 0 && (
          <Section title={t.insights.mostWorn}>
            <div className="space-y-2">
              {sections.mostWorn.map((i) => (
                <ItemRow key={i.id} item={i} meta={`${i.worn_count}× ${t.insights.wornTimes}`} />
              ))}
            </div>
          </Section>
        )}

        {sections.mostVersatile.length > 0 && (
          <Section title={t.insights.mostVersatile}>
            <div className="space-y-2">
              {sections.mostVersatile.map(({ item, count }) => (
                <ItemRow key={item.id} item={item} meta={`${count} ${t.insights.outfits}`} />
              ))}
            </div>
          </Section>
        )}

        {sections.notWorn30.length > 0 && (
          <Section title={t.insights.notWorn30}>
            <div className="space-y-2">
              {sections.notWorn30.map((i) => (
                <ItemRow key={i.id} item={i} meta={daysAgo(i.last_worn_at)} />
              ))}
            </div>
          </Section>
        )}

        {sections.neverWorn.length > 0 && (
          <Section title={t.insights.neverWorn}>
            <div className="space-y-2">
              {sections.neverWorn.map((i) => (
                <ItemRow key={i.id} item={i} meta={t.insights.new} />
              ))}
            </div>
          </Section>
        )}

        {sections.recentlyAdded.length > 0 && (
          <Section title={t.insights.recentlyAdded}>
            <div className="space-y-2">
              {sections.recentlyAdded.map((i) => (
                <ItemRow key={i.id} item={i} meta={daysAgo(i.created_at)} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </AppLayout>
  )
}
