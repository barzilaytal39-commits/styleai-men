import { Link } from 'react-router-dom'
import { Heart, Shirt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { categoryLabel, subcategoryLabel } from '@/i18n'
import type { WardrobeItem } from '@/types'

interface ItemCardProps {
  item: WardrobeItem
}

const CATEGORY_COLORS: Record<string, string> = {
  tops: 'from-blue-100 to-blue-50',
  bottoms: 'from-stone-100 to-stone-50',
  outerwear: 'from-slate-100 to-slate-50',
  shoes: 'from-amber-100 to-amber-50',
  accessories: 'from-purple-100 to-purple-50',
}

export function ItemCard({ item }: ItemCardProps) {
  const gradient = CATEGORY_COLORS[item.category] ?? 'from-muted to-muted/50'

  return (
    <Link to={`/wardrobe/${item.id}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl bg-muted shadow-sm transition-all duration-200 group-active:scale-[0.97]">
        {/* Image / placeholder */}
        <div className={cn('aspect-[3/4] w-full', !item.image_url && `bg-gradient-to-b ${gradient}`)}>
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Shirt className="h-10 w-10 text-foreground/20" strokeWidth={1.25} />
            </div>
          )}
        </div>

        {/* Favorite badge */}
        {item.favorite && (
          <div className="absolute right-2 top-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm shadow-sm">
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
            </div>
          </div>
        )}
      </div>

      {/* Item info */}
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {item.brand || subcategoryLabel(item.subcategory) || categoryLabel(item.category)}
        </p>
      </div>
    </Link>
  )
}
