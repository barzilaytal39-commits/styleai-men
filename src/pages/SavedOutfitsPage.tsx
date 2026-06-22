import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { SavedOutfitCard } from '@/components/outfits/SavedOutfitCard'
import { useOutfits, type SavedOutfit } from '@/hooks/useOutfits'
import { useToast } from '@/components/ui/toaster'
import { t } from '@/i18n'

export function SavedOutfitsPage() {
  const navigate = useNavigate()
  const { fetchOutfits } = useOutfits()
  const { toast } = useToast()
  const [outfits, setOutfits] = useState<SavedOutfit[] | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error } = await fetchOutfits()
      if (!active) return
      if (error) {
        toast({ title: t.saved.title, description: error.message, variant: 'destructive' })
        setOutfits([])
      } else {
        setOutfits(data)
      }
    })()
    return () => {
      active = false
    }
  }, [fetchOutfits, toast])

  return (
    <AppLayout hideHeader>
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          type="button"
          onClick={() => navigate('/outfits')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">{t.common.back}</span>
        </button>
        <h1 className="text-lg font-semibold">{t.saved.title}</h1>
      </div>

      {!outfits ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      ) : outfits.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">{t.saved.empty}</p>
            <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">{t.saved.emptyHint}</p>
          </div>
          <Button asChild>
            <Link to="/outfits">{t.saved.build}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4 pt-4 pb-6">
          {outfits.map((outfit) => (
            <SavedOutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
