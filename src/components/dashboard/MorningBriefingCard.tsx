import { Link } from 'react-router-dom'
import {
  RefreshCw,
  Sparkles,
  Shirt,
  Wand2,
  Watch,
  Lightbulb,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react'
import type { MorningBriefing } from '@/hooks/useMorningBriefing'
import type { WardrobeItem } from '@/types'

interface MorningBriefingCardProps {
  briefing: MorningBriefing | null
  source: 'ai' | 'rule' | null
  isLoading: boolean
  items: WardrobeItem[]
  onRegenerate: () => void
}

function Note({ icon: Icon, text }: { icon: typeof Wand2; text: string }) {
  if (!text) return null
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </p>
  )
}

export function MorningBriefingCard({
  briefing,
  source,
  isLoading,
  items,
  onRegenerate,
}: MorningBriefingCardProps) {
  const recommended =
    briefing?.recommended_item_ids
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean) as WardrobeItem[] | undefined

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h3 className="text-sm font-semibold">
            {briefing?.greeting || 'הבריף היומי שלך'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {source === 'rule' && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
              לפי כללים
            </span>
          )}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">רענן בריף</span>
          </button>
        </div>
      </div>

      {isLoading && !briefing ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          מכין לך בריף ליום…
        </div>
      ) : briefing ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{briefing.summary}</p>

          {recommended && recommended.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recommended.map((item) => (
                <Link key={item.id} to={`/wardrobe/${item.id}`} className="w-16 shrink-0">
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Shirt className="h-5 w-5 text-foreground/20" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11px]">{item.name}</p>
                </Link>
              ))}
            </div>
          )}

          {briefing.why_this_look.length > 0 && (
            <ul className="space-y-1">
              {briefing.why_this_look.map((w, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span>•</span>
                  {w}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1.5">
            <Note icon={Wand2} text={briefing.fragrance_recommendation} />
            <Note icon={Watch} text={briefing.watch_or_accessory_recommendation} />
            <Note icon={RotateCcw} text={briefing.rotation_note} />
            <Note icon={Lightbulb} text={briefing.wardrobe_tip} />
            <Note icon={ShoppingBag} text={briefing.shopping_gap_tip} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
