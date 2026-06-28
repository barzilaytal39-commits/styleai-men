import { cn } from '@/lib/utils'
import { WARDROBE_FILTERS, type WardrobeFilterId } from '@/lib/wardrobe-constants'
import { t } from '@/i18n'

interface CategoryFilterProps {
  active: WardrobeFilterId
  counts: Record<WardrobeFilterId, number>
  onChange: (cat: WardrobeFilterId) => void
}

export function CategoryFilter({ active, counts, onChange }: CategoryFilterProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none"
      style={{ scrollbarWidth: 'none' }}
    >
      {WARDROBE_FILTERS.map(({ id, emoji }) => {
        const isActive = active === id
        const count = counts[id] ?? 0
        // Always show every filter — empty ones are muted but clickable, nudging the
        // user to complete the look (watches, fragrances, belts, accessories…).
        const isEmpty = count === 0 && !isActive
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              isEmpty && 'opacity-45',
            )}
          >
            {emoji && <span aria-hidden>{emoji}</span>}
            {t.wardrobe.filters[id]}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                isActive ? 'bg-background/20 text-background' : 'bg-foreground/10 text-foreground/60',
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
