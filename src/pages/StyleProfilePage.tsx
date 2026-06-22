import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useToast } from '@/components/ui/toaster'
import { COLORS } from '@/lib/wardrobe-constants'
import {
  EMPTY_STYLE_PROFILE,
  PERSONAL_MODE_PRESET,
  rowToForm,
  BODY_TYPES,
  SKIN_TONES,
  HAIR_COLORS,
  FREQUENCY_OPTIONS,
  DAY_TYPES,
  PREFERRED_STYLES,
  FORMALITY_OPTIONS,
  SHIRT_FITS,
  PANTS_FITS,
  SHOE_STYLES,
  TUCK_OPTIONS,
  CUFFING_OPTIONS,
  CLIMATE_OPTIONS,
  FRAGRANCE_OPTIONS,
  ACCESSORY_OPTIONS,
  type StyleProfileFormData,
} from '@/lib/style-profile-constants'
import { cn } from '@/lib/utils'
import {
  t,
  occasionLabel,
  colorLabel,
  styleLabel,
  formalityLabel,
  BODY_TYPE_LABELS,
  SKIN_TONE_LABELS,
  HAIR_COLOR_LABELS,
  SHIRT_FIT_LABELS,
  PANTS_FIT_LABELS,
  SHOE_STYLE_LABELS,
  TUCK_LABELS,
  CUFFING_LABELS,
  CLIMATE_LABELS,
  FRAGRANCE_LABELS,
  ACCESSORY_LABELS,
  FREQUENCY_LABELS,
} from '@/i18n'

const selectClass =
  'h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Dropdown({
  id,
  label,
  value,
  onChange,
  options,
  labels,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  labels?: Record<string, string>
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {labels?.[o] ?? o}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          ▾
        </span>
      </div>
    </div>
  )
}

function ChipMulti({
  label,
  options,
  selected,
  onToggle,
  labelFn,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (v: string) => void
  labelFn?: (v: string) => string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-foreground hover:border-foreground/40',
              )}
            >
              {labelFn ? labelFn(o) : o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-foreground"
      />
    </label>
  )
}

export function StyleProfilePage() {
  const { fetchStyleProfile, saveStyleProfile, isSaving } = useStyleProfile()
  const { toast } = useToast()
  const [form, setForm] = useState<StyleProfileFormData | null>(null)
  const [hadProfile, setHadProfile] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error } = await fetchStyleProfile()
      if (!active) return
      if (error) {
        toast({ title: t.styleDna.loadFailed, description: error.message, variant: 'destructive' })
        setForm(EMPTY_STYLE_PROFILE)
      } else if (data) {
        setForm(rowToForm(data))
        setHadProfile(true)
      } else {
        setForm(EMPTY_STYLE_PROFILE)
      }
    })()
    return () => {
      active = false
    }
  }, [fetchStyleProfile, toast])

  const set = <K extends keyof StyleProfileFormData>(key: K, value: StyleProfileFormData[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const toggleIn = (key: 'typical_day_types' | 'favorite_colors' | 'avoid_colors', v: string) =>
    setForm((prev) => {
      if (!prev) return prev
      const cur = prev[key]
      return { ...prev, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }
    })

  const handleSave = async () => {
    if (!form) return
    const { error } = await saveStyleProfile(form)
    if (error) {
      toast({ title: t.styleDna.saveFailed, description: error.message, variant: 'destructive' })
    } else {
      setHadProfile(true)
      toast({ title: t.styleDna.saved, description: t.styleDna.savedHint })
    }
  }

  if (!form) {
    return (
      <AppLayout title={t.styleDna.title}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  const colorNames = COLORS.map((c) => c.name)

  return (
    <AppLayout title="Style DNA">
      <div className="space-y-5 pb-24">
        {!hadProfile && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center">
            <p className="text-sm font-medium">{t.styleDna.build}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.styleDna.buildHint}</p>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setForm(PERSONAL_MODE_PRESET)
            toast({ title: t.styleDna.presetApplied, description: t.styleDna.presetReview })
          }}
        >
          <Sparkles className="h-4 w-4" />
          {t.styleDna.applyPreset}
        </Button>

        {/* Personal */}
        <Section title={t.styleDna.sectionPersonal}>
          <div className="space-y-1.5">
            <Label htmlFor="height">{t.styleDna.height}</Label>
            <Input
              id="height"
              type="number"
              inputMode="numeric"
              value={form.height_cm ?? ''}
              onChange={(e) => set('height_cm', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <Dropdown id="body" label={t.styleDna.bodyType} value={form.body_type} onChange={(v) => set('body_type', v)} options={BODY_TYPES} labels={BODY_TYPE_LABELS} />
          <Dropdown id="skin" label={t.styleDna.skinTone} value={form.skin_tone} onChange={(v) => set('skin_tone', v)} options={SKIN_TONES} labels={SKIN_TONE_LABELS} />
          <Dropdown id="hair" label={t.styleDna.hairColor} value={form.hair_color} onChange={(v) => set('hair_color', v)} options={HAIR_COLORS} labels={HAIR_COLOR_LABELS} />
        </Section>

        {/* Work / lifestyle */}
        <Section title={t.styleDna.sectionWork}>
          <div className="space-y-1.5">
            <Label htmlFor="profession">{t.styleDna.profession}</Label>
            <Input id="profession" value={form.profession} onChange={(e) => set('profession', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-env">{t.styleDna.workEnv}</Label>
            <Input id="work-env" value={form.work_environment} onChange={(e) => set('work_environment', e.target.value)} />
          </div>
          <Dropdown id="field-freq" label={t.styleDna.fieldFreq} value={form.field_work_frequency} onChange={(v) => set('field_work_frequency', v)} options={FREQUENCY_OPTIONS} labels={FREQUENCY_LABELS} />
          <Dropdown id="office-freq" label={t.styleDna.officeFreq} value={form.office_work_frequency} onChange={(v) => set('office_work_frequency', v)} options={FREQUENCY_OPTIONS} labels={FREQUENCY_LABELS} />
          <ChipMulti label={t.styleDna.dayTypes} options={DAY_TYPES} selected={form.typical_day_types} onToggle={(v) => toggleIn('typical_day_types', v)} labelFn={occasionLabel} />
        </Section>

        {/* Style preferences */}
        <Section title={t.styleDna.sectionStyle}>
          <Dropdown id="pref-style" label={t.styleDna.preferredStyle} value={form.preferred_style} onChange={(v) => set('preferred_style', v)} options={PREFERRED_STYLES} labels={Object.fromEntries(PREFERRED_STYLES.map((s) => [s, styleLabel(s)]))} />
          <div className="space-y-1.5">
            <Label htmlFor="pref-formality">{t.styleDna.preferredFormality}</Label>
            <div className="relative">
              <select
                id="pref-formality"
                className={selectClass}
                value={form.preferred_formality ?? ''}
                onChange={(e) => set('preferred_formality', e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">—</option>
                {FORMALITY_OPTIONS.map(({ value }) => (
                  <option key={value} value={value}>
                    {formalityLabel(value)}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">▾</span>
            </div>
          </div>
          <div className="space-y-2.5 pt-1">
            <ToggleRow label={t.styleDna.wantsPremium} checked={form.wants_premium_look} onChange={(v) => set('wants_premium_look', v)} />
            <ToggleRow label={t.styleDna.wantsEffortless} checked={form.wants_effortless_look} onChange={(v) => set('wants_effortless_look', v)} />
            <ToggleRow label={t.styleDna.wantsHeadTurning} checked={form.wants_head_turning_look} onChange={(v) => set('wants_head_turning_look', v)} />
          </div>
          <ChipMulti label={t.styleDna.favoriteColors} options={colorNames} selected={form.favorite_colors} onToggle={(v) => toggleIn('favorite_colors', v)} labelFn={colorLabel} />
          <ChipMulti label={t.styleDna.avoidColors} options={colorNames} selected={form.avoid_colors} onToggle={(v) => toggleIn('avoid_colors', v)} labelFn={colorLabel} />
          <div className="space-y-1.5">
            <Label htmlFor="brands">{t.styleDna.preferredBrands}</Label>
            <Input
              id="brands"
              value={form.preferred_brands.join(', ')}
              onChange={(e) =>
                set('preferred_brands', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="disliked">{t.styleDna.dislikedStyles}</Label>
            <Input
              id="disliked"
              value={form.disliked_styles.join(', ')}
              onChange={(e) =>
                set('disliked_styles', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
              }
            />
          </div>
        </Section>

        {/* Fit preferences */}
        <Section title={t.styleDna.sectionFit}>
          <Dropdown id="shirt-fit" label={t.styleDna.shirtFit} value={form.shirt_fit_preference} onChange={(v) => set('shirt_fit_preference', v)} options={SHIRT_FITS} labels={SHIRT_FIT_LABELS} />
          <Dropdown id="pants-fit" label={t.styleDna.pantsFit} value={form.pants_fit_preference} onChange={(v) => set('pants_fit_preference', v)} options={PANTS_FITS} labels={PANTS_FIT_LABELS} />
          <Dropdown id="shoe-style" label={t.styleDna.shoeStyle} value={form.shoe_style_preference} onChange={(v) => set('shoe_style_preference', v)} options={SHOE_STYLES} labels={SHOE_STYLE_LABELS} />
          <Dropdown id="tuck" label={t.styleDna.tuck} value={form.tuck_preference} onChange={(v) => set('tuck_preference', v)} options={TUCK_OPTIONS} labels={TUCK_LABELS} />
          <Dropdown id="cuffing" label={t.styleDna.cuffing} value={form.cuffing_preference} onChange={(v) => set('cuffing_preference', v)} options={CUFFING_OPTIONS} labels={CUFFING_LABELS} />
        </Section>

        {/* Context */}
        <Section title={t.styleDna.sectionContext}>
          <Dropdown id="climate" label={t.styleDna.climate} value={form.climate_sensitivity} onChange={(v) => set('climate_sensitivity', v)} options={CLIMATE_OPTIONS} labels={CLIMATE_LABELS} />
          <Dropdown id="fragrance" label={t.styleDna.fragrancePref} value={form.fragrance_preference} onChange={(v) => set('fragrance_preference', v)} options={FRAGRANCE_OPTIONS} labels={FRAGRANCE_LABELS} />
          <Dropdown id="accessory" label={t.styleDna.accessoryPref} value={form.accessory_preference} onChange={(v) => set('accessory_preference', v)} options={ACCESSORY_OPTIONS} labels={ACCESSORY_LABELS} />
        </Section>

        <Button className="w-full" onClick={handleSave} isLoading={isSaving}>
          {isSaving ? t.common.saving : t.styleDna.save}
        </Button>
      </div>
    </AppLayout>
  )
}
