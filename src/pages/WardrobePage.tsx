import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingBag, TrendingUp } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryFilter } from '@/components/wardrobe/CategoryFilter'
import { ItemCard } from '@/components/wardrobe/ItemCard'
import { useWardrobe } from '@/hooks/useWardrobe'
import { CATEGORIES } from '@/lib/wardrobe-constants'
import { t } from '@/i18n'

export function WardrobePage() {
  const { items, filteredItems, isLoaded, activeCategory, setActiveCategory, fetchItems } =
    useWardrobe()

  useEffect(() => {
    if (!isLoaded) {
      void fetchItems()
    }
  }, [isLoaded, fetchItems])

  const counts = Object.fromEntries(
    CATEGORIES.map(({ id }) => [id, items.filter((i) => i.category === id).length])
  )

  return (
    <AppLayout hideHeader>
      {/* Sticky header + filter */}
      <div className="sticky top-0 z-30 -mx-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.wardrobe.title}</h1>
            {isLoaded && (
              <p className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? t.wardrobe.item : t.wardrobe.items}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/wardrobe/insights"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
            >
              <TrendingUp className="h-5 w-5" />
              <span className="sr-only">{t.wardrobe.insights}</span>
            </Link>
            <Link
              to="/wardrobe/add"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90 active:scale-95 transition-all"
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">{t.wardrobe.addItem}</span>
            </Link>
          </div>
        </div>

        <div className="pb-3">
          <CategoryFilter active={activeCategory} counts={counts} onChange={setActiveCategory} />
        </div>
      </div>

      {/* Content */}
      <div className="pt-2">
        {!isLoaded ? (
          /* Skeleton grid */
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
            </div>
            <div>
              <p className="font-semibold">
                {activeCategory === 'all' ? t.wardrobe.empty : t.wardrobe.emptyCategory}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeCategory === 'all' ? t.wardrobe.emptyHint : t.wardrobe.emptyCategory}
              </p>
            </div>
            <Link
              to="/wardrobe/add"
              className="flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4" />
              {t.wardrobe.addFirst}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
