import { Link } from 'react-router-dom'
import { Shirt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { t, occasionLabel } from '@/i18n'
import type { OutfitSlot } from '@/types'
import type { SavedOutfit } from '@/hooks/useOutfits'

const SLOT_ORDER: OutfitSlot[] = ['top', 'bottom', 'outerwear', 'shoes', 'belt', 'watch', 'fragrance']

// Score is recorded in the notes summary ("... score 8.5/10"); show it if present.
export function parseScore(notes: string | null): number | null {
  if (!notes) return null
  const m = notes.match(/score\s+(\d+(?:\.\d+)?)\s*\/\s*10/i)
  return m ? Number(m[1]) : null
}

function scoreColor(score: number): string {
  if (score >= 8) return 'bg-emerald-600 text-white'
  if (score >= 6) return 'bg-amber-500 text-white'
  return 'bg-muted text-foreground'
}

export function orderedItems(outfit: SavedOutfit) {
  return [...outfit.outfit_items].sort(
    (a, b) =>
      SLOT_ORDER.indexOf((a.slot ?? '') as OutfitSlot) -
      SLOT_ORDER.indexOf((b.slot ?? '') as OutfitSlot),
  )
}

export function SavedOutfitCard({ outfit }: { outfit: SavedOutfit }) {
  const score = parseScore(outfit.notes)
  const items = orderedItems(outfit)

  return (
    <Link
      to={`/outfits/${outfit.id}`}
      className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{outfit.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {outfit.occasion && (
              <Badge variant="secondary">{occasionLabel(outfit.occasion)}</Badge>
            )}
            {outfit.worn_count > 0 && (
              <span className="text-xs text-muted-foreground">{t.saved.wornCount} {outfit.worn_count}×</span>
            )}
          </div>
        </div>
        {score !== null && (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${scoreColor(score)}`}>
            {score.toFixed(1)}/10
          </span>
        )}
      </div>

      {/* Thumbnails by slot */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((oi) => {
          const item = oi.wardrobe_items
          return (
            <div key={oi.id} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item?.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Shirt className="h-5 w-5 text-foreground/20" strokeWidth={1.25} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{t.saved.savedOn} {formatDate(outfit.created_at)}</p>
    </Link>
  )
}
