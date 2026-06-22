import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shirt } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { parseScore, orderedItems } from '@/components/outfits/SavedOutfitCard'
import { useOutfits, type SavedOutfit } from '@/hooks/useOutfits'
import { useToast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { t, occasionLabel, slotLabel } from '@/i18n'

export function SavedOutfitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchOutfit, markOutfitWorn } = useOutfits()
  const { toast } = useToast()
  const [outfit, setOutfit] = useState<SavedOutfit | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isMarking, setIsMarking] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    void (async () => {
      const { data, error } = await fetchOutfit(id)
      if (!active) return
      if (error || !data) setNotFound(true)
      else setOutfit(data)
    })()
    return () => {
      active = false
    }
  }, [id, fetchOutfit])

  const handleMarkWorn = async () => {
    if (!outfit) return
    setIsMarking(true)
    const { error } = await markOutfitWorn(outfit)
    setIsMarking(false)
    if (error) {
      toast({ title: t.profile.updateFailed, description: error.message, variant: 'destructive' })
      return
    }
    // Refresh so the UI reflects the new wear stats.
    const { data } = await fetchOutfit(outfit.id)
    if (data) setOutfit(data)
    toast({ title: t.saved.markedWorn })
  }

  if (notFound) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <Shirt className="h-12 w-12 text-muted-foreground" strokeWidth={1.25} />
          <div>
            <p className="font-semibold">{t.saved.notFound}</p>
            <p className="text-sm text-muted-foreground">{t.wardrobe.notFoundHint}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/outfits/saved')}>
            {t.saved.title}
          </Button>
        </div>
      </AppLayout>
    )
  }

  if (!outfit) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  const score = parseScore(outfit.notes)
  const items = orderedItems(outfit)

  return (
    <AppLayout hideHeader>
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center justify-between bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          type="button"
          onClick={() => navigate('/outfits/saved')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </button>
        {score !== null && (
          <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
            {score.toFixed(1)}/10
          </span>
        )}
      </div>

      <div className="space-y-5 pt-3 pb-6">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold leading-tight tracking-tight">{outfit.name}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {outfit.occasion && <Badge variant="secondary">{occasionLabel(outfit.occasion)}</Badge>}
          </div>
        </div>

        {outfit.notes && (
          <p className="text-sm leading-relaxed text-muted-foreground">{outfit.notes}</p>
        )}

        <Separator />

        {/* Items by slot */}
        <div className="space-y-3">
          {items.map((oi) => {
            const item = oi.wardrobe_items
            return (
              <div key={oi.id} className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item?.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Shirt className="h-5 w-5 text-foreground/20" strokeWidth={1.25} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {slotLabel(oi.slot)}
                  </p>
                  <p className="truncate text-sm font-medium">{item?.name ?? '—'}</p>
                  {item?.brand && (
                    <p className="truncate text-xs text-muted-foreground">{item.brand}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <Separator />

        {/* Wear stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/60 p-4 text-center">
            <p className="text-2xl font-bold">{outfit.worn_count}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.saved.timesWorn}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-4 text-center">
            <p className="text-sm font-semibold">
              {outfit.last_worn_at ? formatDate(outfit.last_worn_at) : '—'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.saved.lastWorn}</p>
          </div>
        </div>

        <Button className="w-full" onClick={handleMarkWorn} isLoading={isMarking}>
          {t.saved.markWorn}
        </Button>

        <div className="text-xs text-muted-foreground">Saved {formatDate(outfit.created_at)}</div>
      </div>
    </AppLayout>
  )
}
