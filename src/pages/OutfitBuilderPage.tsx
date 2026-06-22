import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Shirt, CloudSun, Wind, Droplets, RefreshCw } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OutfitCard } from '@/components/outfits/OutfitCard'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useOutfits } from '@/hooks/useOutfits'
import { useOutfitRanking, type AIRanking } from '@/hooks/useOutfitRanking'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useWeather } from '@/hooks/useWeather'
import { buildProfileSummary } from '@/lib/style-profile-constants'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toaster'
import { t, occasionLabel, locationLabel, styleLabel, formalityLabel } from '@/i18n'
import type { StyleProfile } from '@/types'
import {
  buildOutfits,
  OCCASIONS,
  LOCATION_TYPES,
  STYLE_OPTIONS,
  FORMALITY_OPTIONS,
  type GeneratedOutfit,
  type OutfitBrief,
  type Occasion,
  type LocationType,
} from '@/lib/outfit-engine'

const selectClass =
  'h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string | number
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        ▾
      </span>
    </div>
  )
}

export function OutfitBuilderPage() {
  const { items, isLoaded, fetchItems } = useWardrobe()
  const { saveOutfit, isSaving } = useOutfits()
  const { rankOutfits, isRanking } = useOutfitRanking()
  const { fetchStyleProfile } = useStyleProfile()
  const { city, setCity, weather, isLoading: isWeatherLoading, error: weatherError, loadWeather } =
    useWeather()
  const profile = useAuthStore((s) => s.profile)
  const { toast } = useToast()
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)

  const [occasion, setOccasion] = useState<Occasion>('Office')
  const [locationType, setLocationType] = useState<LocationType>('Indoor')
  const [desiredStyle, setDesiredStyle] = useState<string>('Smart Casual')
  const [formalityLevel, setFormalityLevel] = useState<number>(3)
  const [useAi, setUseAi] = useState(true)

  const [outfits, setOutfits] = useState<GeneratedOutfit[] | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [aiByKey, setAiByKey] = useState<Record<string, AIRanking>>({})
  const [rankSource, setRankSource] = useState<'ai' | 'rule' | null>(null)

  useEffect(() => {
    if (!isLoaded) void fetchItems()
  }, [isLoaded, fetchItems])

  // Load the Style DNA once so it can personalize AI ranking (preferences only).
  useEffect(() => {
    let active = true
    void (async () => {
      const { data } = await fetchStyleProfile()
      if (active && data) setStyleProfile(data)
    })()
    return () => {
      active = false
    }
  }, [fetchStyleProfile])

  const brief: OutfitBrief = { occasion, locationType, desiredStyle, formalityLevel }

  const handleGenerate = async () => {
    // 1. Rule engine always runs first and is the source of candidates.
    // Weather is optional context — generation works fine without it.
    const result = buildOutfits(items, brief, weather ?? undefined)
    setAiByKey({})
    setRankSource(null)

    if (result.length === 0) {
      setOutfits(result)
      toast({
        title: t.outfits.noOutfit,
        description: t.outfits.noOutfitHint,
        variant: 'destructive',
      })
      return
    }

    // Default to showing the rule-based order immediately.
    setOutfits(result)

    if (!useAi) {
      setRankSource('rule')
      return
    }

    // 2. AI ranks the rule-engine candidates; fall back to rule order on failure.
    // Prefer the richer Style DNA summary; fall back to the basic account profile.
    const userProfile = styleProfile
      ? buildProfileSummary(styleProfile)
      : profile
        ? { style_preferences: profile.style_preferences, age: profile.age }
        : null
    const { data, error } = await rankOutfits(brief, result, userProfile, weather)

    if (error || !data) {
      setRankSource('rule')
      if (error) {
        toast({ title: t.outfits.usingRuleOrder, description: error })
      }
      return
    }

    // Reorder by the AI ranking; append any candidates the AI omitted.
    const byKey = new Map(result.map((o) => [o.key, o]))
    const ordered: GeneratedOutfit[] = []
    for (const id of data.ranked_candidate_ids) {
      const o = byKey.get(id)
      if (o) {
        ordered.push(o)
        byKey.delete(id)
      }
    }
    ordered.push(...byKey.values())

    const map: Record<string, AIRanking> = {}
    for (const r of data.rankings) map[r.candidate_id] = r

    setOutfits(ordered)
    setAiByKey(map)
    setRankSource('ai')
  }

  const handleSave = async (outfit: GeneratedOutfit) => {
    setSavingKey(outfit.key)
    const { error } = await saveOutfit(outfit, brief, `${occasion} look`)
    setSavingKey(null)
    if (error) {
      toast({ title: t.outfits.noOutfit, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.outfits.outfitSaved, description: occasionLabel(occasion) })
    }
  }

  if (!isLoaded) {
    return (
      <AppLayout title={t.outfits.title}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  if (items.length === 0) {
    return (
      <AppLayout title={t.outfits.title}>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <Shirt className="h-12 w-12 text-muted-foreground" strokeWidth={1.25} />
          <div>
            <p className="font-semibold">{t.outfits.emptyWardrobe}</p>
            <p className="text-sm text-muted-foreground">{t.outfits.emptyWardrobeHint}</p>
          </div>
          <Button asChild>
            <Link to="/wardrobe/add">{t.outfits.addItem}</Link>
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={t.outfits.title}>
      <div className="space-y-5 pb-6">
        <div className="flex justify-end gap-4">
          <Link
            to="/planner"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.outfits.plannerLink}
          </Link>
          <Link
            to="/outfits/saved"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t.outfits.savedLink}
          </Link>
        </div>

        {/* Weather */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.fitCheck.weather}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="עיר (לדוגמה: תל אביב)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadWeather()
              }}
            />
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => void loadWeather()}
              isLoading={isWeatherLoading}
            >
              <RefreshCw className="h-4 w-4" />
              {weather ? 'עדכן' : 'קבל'}
            </Button>
          </div>

          {weather && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold">{weather.city}</span>
              <span>
                {Math.round(weather.temperature)}°C
                {weather.apparentTemperature !== null && (
                  <span className="text-muted-foreground"> (feels {Math.round(weather.apparentTemperature)}°)</span>
                )}
              </span>
              <span className="text-muted-foreground">{weather.condition}</span>
              {weather.precipitationProbability !== null && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5" />
                  {weather.precipitationProbability}%
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Wind className="h-3.5 w-3.5" />
                {Math.round(weather.windSpeed)} km/h
              </span>
            </div>
          )}

          {weatherError && <p className="text-xs text-destructive">{weatherError}</p>}
          {!weather && !weatherError && (
            <p className="text-xs text-muted-foreground">
              אופציונלי — הוסף עיר כדי לשקלל את מזג האוויר בהמלצות.
            </p>
          )}
        </div>

        {/* Brief */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="occasion">{t.outfits.occasion}</Label>
            <Select id="occasion" value={occasion} onChange={(v) => setOccasion(v as Occasion)}>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>
                  {occasionLabel(o)}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="location">{t.outfits.location}</Label>
              <Select
                id="location"
                value={locationType}
                onChange={(v) => setLocationType(v as LocationType)}
              >
                {LOCATION_TYPES.map((l) => (
                  <option key={l} value={l}>
                    {locationLabel(l)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="formality">{t.outfits.formality}</Label>
              <Select
                id="formality"
                value={formalityLevel}
                onChange={(v) => setFormalityLevel(Number(v))}
              >
                {FORMALITY_OPTIONS.map(({ value }) => (
                  <option key={value} value={value}>
                    {formalityLabel(value)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="style">{t.outfits.desiredStyle}</Label>
            <Select id="style" value={desiredStyle} onChange={setDesiredStyle}>
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {styleLabel(s)}
                </option>
              ))}
            </Select>
          </div>

          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{t.outfits.useAi}</span>
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="h-4 w-4 accent-foreground"
            />
          </label>

          <Button className="w-full" onClick={handleGenerate} isLoading={isRanking}>
            <Sparkles className="h-4 w-4" />
            {isRanking ? t.outfits.ranking : t.outfits.generate}
          </Button>
        </div>

        {/* Results */}
        {outfits && outfits.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {outfits.length} {t.outfits.optionsFor} {occasionLabel(occasion)}
              </p>
              {rankSource && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    rankSource === 'ai'
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {rankSource === 'ai' && <Sparkles className="h-3 w-3" />}
                  {rankSource === 'ai' ? t.outfits.aiRanked : t.outfits.ruleRanked}
                </span>
              )}
            </div>
            {outfits.map((outfit, i) => (
              <OutfitCard
                key={outfit.key}
                outfit={outfit}
                index={i}
                isSaving={isSaving && savingKey === outfit.key}
                onSave={handleSave}
                ai={aiByKey[outfit.key]}
              />
            ))}
          </div>
        )}

        {outfits && outfits.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">{t.outfits.noOutfit}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.outfits.noOutfitHint}</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
