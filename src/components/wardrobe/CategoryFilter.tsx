import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/wardrobe-constants'
import { t, categoryLabel } from '@/i18n'
import type { WardrobeCategory } from '@/types'

interface CategoryFilterProps {
  active: WardrobeCategory | 'all'
  counts: Record<string, number>
  onChange: (cat: WardrobeCategory | 'all') => void
}

export function CategoryFilter({ active, counts, onChange }: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const pills: { id: WardrobeCategory | 'all'; label: string }[] = [
    { id: 'all', label: t.wardrobe.all },
    ...CATEGORIES.map(({ id }) => ({ id, label: categoryLabel(id) })),
  ]

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none"
      style={{ scrollbarWidth: 'none' }}
    >
      {pills.map(({ id, label }) => {
        const isActive = active === id
        const count = id === 'all' ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[id] ?? 0)
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            {label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                isActive ? 'bg-background/20 text-background' : 'bg-foreground/10 text-foreground/60'
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
