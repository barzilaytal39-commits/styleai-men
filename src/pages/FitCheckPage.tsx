import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/wardrobe/ImageUpload'
import { FitCheckResultView } from '@/components/fitcheck/FitCheckResultView'
import { useFitCheck, type FitCheckResult } from '@/hooks/useFitCheck'
import { useOutfits, type SavedOutfit } from '@/hooks/useOutfits'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useWeather } from '@/hooks/useWeather'
import { buildProfileSummary } from '@/lib/style-profile-constants'
import { summarizeWeatherForAI } from '@/lib/weather'
import { OCCASIONS, STYLE_OPTIONS } from '@/lib/outfit-engine'
import { useToast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { t, occasionLabel, styleLabel } from '@/i18n'
import type { StyleProfile, FitCheck } from '@/types'
import type { Json } from '@/types/database'

const selectClass =
  'h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string
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

function outfitToPayload(o: SavedOutfit): Record<string, unknown> {
  return {
    name: o.name,
    occasion: o.occasion,
    items: o.outfit_items
      .map((oi) => {
        const it = oi.wardrobe_items
        if (!it) return null
        return {
          slot: oi.slot,
          name: it.name,
          category: it.category,
          subcategory: it.subcategory,
          colors: it.color,
          style: it.style,
          formality_level: it.formality_level,
          material: it.material,
          pattern: it.pattern,
        }
      })
      .filter(Boolean),
  }
}

export function FitCheckPage() {
  const { uploadPhoto, analyze, saveFitCheck, fetchFitChecks, isUploading, isAnalyzing } =
    useFitCheck()
  const { fetchOutfits } = useOutfits()
  const { fetchStyleProfile } = useStyleProfile()
  const { weather } = useWeather()
  const { toast } = useToast()

  const [photoFile, setPhotoFile] = useState<File | undefined>()
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([])
  const [selectedOutfitId, setSelectedOutfitId] = useState('')
  const [occasion, setOccasion] = useState('Office')
  const [desiredStyle, setDesiredStyle] = useState('Smart Casual')
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)

  const [result, setResult] = useState<FitCheckResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [history, setHistory] = useState<FitCheck[]>([])

  useEffect(() => {
    let active = true
    void (async () => {
      const [outfitsRes, profileRes, historyRes] = await Promise.all([
        fetchOutfits(),
        fetchStyleProfile(),
        fetchFitChecks(),
      ])
      if (!active) return
      setSavedOutfits(outfitsRes.data)
      if (profileRes.data) setStyleProfile(profileRes.data)
      setHistory(historyRes.data)
    })()
    return () => {
      active = false
    }
  }, [fetchOutfits, fetchStyleProfile, fetchFitChecks])

  const handleImageChange = (file: File) => {
    setPhotoFile(file)
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    setResult(null)
    setAnalyzeError(null)
  }

  const handleImageClear = () => {
    setPhotoFile(undefined)
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
  }

  const onSelectOutfit = (id: string) => {
    setSelectedOutfitId(id)
    const o = savedOutfits.find((x) => x.id === id)
    if (o?.occasion) setOccasion(o.occasion)
  }

  const handleAnalyze = async () => {
    if (!photoFile) {
      toast({ title: t.fitCheck.addPhoto, description: t.fitCheck.addPhotoHint, variant: 'destructive' })
      return
    }
    setAnalyzeError(null)
    setResult(null)

    const { url, error: upErr } = await uploadPhoto(photoFile)
    if (upErr || !url) {
      setAnalyzeError(upErr ?? t.fitCheck.uploadFailed)
      toast({ title: t.fitCheck.uploadFailed, description: upErr ?? '', variant: 'destructive' })
      return
    }

    const selected = selectedOutfitId
      ? outfitToPayload(savedOutfits.find((o) => o.id === selectedOutfitId)!)
      : null
    const weatherPayload = weather ? summarizeWeatherForAI(weather) : null

    const { data, error } = await analyze({
      photo_url: url,
      user_profile: styleProfile ? buildProfileSummary(styleProfile) : null,
      selected_outfit: selected,
      weather: weatherPayload,
      occasion,
      desired_style: desiredStyle,
    })

    if (error || !data) {
      setAnalyzeError(error ?? t.fitCheck.failed)
      toast({ title: t.fitCheck.failed, description: error ?? '', variant: 'destructive' })
      return
    }

    setResult(data)

    // Persist (best-effort) and refresh history.
    const { error: saveErr } = await saveFitCheck({
      photo_url: url,
      outfit_id: selectedOutfitId || null,
      occasion,
      desired_style: desiredStyle,
      weather: (weatherPayload as Json) ?? null,
      result: data as unknown as Json,
      overall_score: data.overall_score,
      final_verdict: data.final_verdict,
    })
    if (!saveErr) {
      const { data: hist } = await fetchFitChecks()
      setHistory(hist)
    }
    toast({ title: t.fitCheck.complete, description: `${t.fitCheck.overall} ${data.overall_score}/10` })
  }

  const busy = isUploading || isAnalyzing

  return (
    <AppLayout title={t.fitCheck.title}>
      <div className="space-y-5 pb-6">
        {/* Photo */}
        <ImageUpload
          preview={photoPreview}
          onChange={handleImageChange}
          onClear={handleImageClear}
          disabled={busy}
        />

        {/* Context */}
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="fc-outfit">{t.fitCheck.compareOutfit}</Label>
            <Select id="fc-outfit" value={selectedOutfitId} onChange={onSelectOutfit}>
              <option value="">{t.fitCheck.justAnalyze}</option>
              {savedOutfits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fc-occasion">{t.fitCheck.occasion}</Label>
              <Select id="fc-occasion" value={occasion} onChange={setOccasion}>
                {OCCASIONS.map((o) => (
                  <option key={o} value={o}>
                    {occasionLabel(o)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fc-style">{t.fitCheck.desiredStyle}</Label>
              <Select id="fc-style" value={desiredStyle} onChange={setDesiredStyle}>
                {STYLE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {styleLabel(s)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {weather
              ? `${t.fitCheck.weatherUsing}${weather.city} (${Math.round(weather.temperature)}°C).`
              : t.fitCheck.weatherTip}
          </p>

          <Button className="w-full" onClick={handleAnalyze} isLoading={busy} disabled={!photoFile}>
            <ScanLine className="h-4 w-4" />
            {isUploading ? t.fitCheck.uploading : isAnalyzing ? t.fitCheck.analyzing : t.fitCheck.run}
          </Button>

          {analyzeError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-sm text-destructive">{analyzeError}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.fitCheck.photoKept}</p>
            </div>
          )}
        </div>

        {/* Result */}
        {result && <FitCheckResultView result={result} />}

        {/* History */}
        {history.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.fitCheck.previous}
            </h3>
            <div className="space-y-2">
              {history.map((h) => (
                <Link
                  key={h.id}
                  to={`/fit-check/${h.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img src={h.photo_url} alt="Fit check" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {h.overall_score !== null ? `${h.overall_score}/10` : t.fitCheck.title}
                      {h.occasion ? ` · ${occasionLabel(h.occasion)}` : ''}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.final_verdict ?? formatDate(h.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}
