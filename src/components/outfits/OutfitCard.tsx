import { Shirt, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t, slotLabel } from '@/i18n'
import type { OutfitSlot } from '@/types'
import type { GeneratedOutfit } from '@/lib/outfit-engine'
import type { AIRanking } from '@/hooks/useOutfitRanking'

const SLOTS: OutfitSlot[] = ['top', 'bottom', 'outerwear', 'shoes', 'belt', 'watch', 'fragrance']

function scoreColor(score: number): string {
  if (score >= 8) return 'bg-emerald-600 text-white'
  if (score >= 6) return 'bg-amber-500 text-white'
  return 'bg-muted text-foreground'
}

interface OutfitCardProps {
  outfit: GeneratedOutfit
  index: number
  isSaving: boolean
  onSave: (outfit: GeneratedOutfit) => void
  ai?: AIRanking
}

export function OutfitCard({ outfit, index, isSaving, onSave, ai }: OutfitCardProps) {
  const filled = SLOTS.filter((slot) => outfit.slots[slot]).map((slot) => ({ slot, label: slotLabel(slot) }))

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">{t.outfits.option} {index + 1}</h3>
        <div className="flex items-center gap-2">
          {ai && (
            <span className="flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
              <Sparkles className="h-3 w-3" />
              {ai.ai_score}/10
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${scoreColor(outfit.score)}`}
            title="Rule-based score"
          >
            Rule {outfit.score.toFixed(1)}/10
          </span>
        </div>
      </div>

      {/* Item thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filled.map(({ slot, label }) => {
          const item = outfit.slots[slot]!
          return (
            <div key={slot} className="w-20 shrink-0">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Shirt className="h-6 w-6 text-foreground/20" strokeWidth={1.25} />
                  </div>
                )}
              </div>
              <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-xs">{item.name}</p>
            </div>
          )
        })}
      </div>

      {ai ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm leading-relaxed">{ai.explanation}</p>
          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5">{t.fitCheck.occasionScore} {ai.occasion_score}</span>
            <span className="rounded bg-muted px-1.5 py-0.5">{t.fitCheck.color} {ai.color_score}</span>
            <span className="rounded bg-muted px-1.5 py-0.5">{t.fitCheck.style} {ai.style_score}</span>
            <span className="rounded bg-muted px-1.5 py-0.5">פרימיום {ai.premium_score}</span>
            <span className="rounded bg-muted px-1.5 py-0.5">קלילות {ai.effortless_score}</span>
            {ai.weather_score !== null && (
              <span className="rounded bg-muted px-1.5 py-0.5">{t.fitCheck.weather} {ai.weather_score}</span>
            )}
          </div>
          {ai.styling_tip && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed">
              <span className="font-semibold">{t.dashboard.tip}</span>
              {ai.styling_tip}
            </p>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">{outfit.explanation}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{outfit.explanation}</p>
      )}

      <Button
        className="mt-4 w-full"
        variant="outline"
        onClick={() => onSave(outfit)}
        isLoading={isSaving}
      >
        {t.outfits.saveOutfit}
      </Button>
    </div>
  )
}
