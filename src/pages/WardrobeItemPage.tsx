import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Heart, Pencil, Shirt, Sparkles, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AnalysisReviewDialog } from '@/components/wardrobe/AnalysisReviewDialog'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useClaudeAnalysis, type ClothingAnalysis } from '@/hooks/useClaudeAnalysis'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { COLORS } from '@/lib/wardrobe-constants'
import { t, categoryLabel, subcategoryLabel, colorLabel } from '@/i18n'
import type { Json } from '@/types/database'
import type { WardrobeItemUpdate } from '@/types'

export function WardrobeItemPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, isLoaded, fetchItems, toggleFavorite, markAsWorn, deleteItem, saveAnalysis } =
    useWardrobe()
  const { analyze, isAnalyzing } = useClaudeAnalysis()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTogglingFav, setIsTogglingFav] = useState(false)
  const [isMarkingWorn, setIsMarkingWorn] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ClothingAnalysis | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false)

  useEffect(() => {
    if (!isLoaded) {
      void fetchItems()
    }
  }, [isLoaded, fetchItems])

  const item = items.find((i) => i.id === id)

  if (!isLoaded) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  if (!item) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <Shirt className="h-12 w-12 text-muted-foreground" strokeWidth={1.25} />
          <div>
            <p className="font-semibold">{t.wardrobe.notFound}</p>
            <p className="text-sm text-muted-foreground">{t.wardrobe.notFoundHint}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/wardrobe')}>
            {t.wardrobe.backToWardrobe}
          </Button>
        </div>
      </AppLayout>
    )
  }

  const handleToggleFavorite = async () => {
    setIsTogglingFav(true)
    await toggleFavorite(item.id)
    setIsTogglingFav(false)
  }

  const handleMarkAsWorn = async () => {
    setIsMarkingWorn(true)
    await markAsWorn(item.id)
    setIsMarkingWorn(false)
    toast({ title: t.wardrobe.markedWorn })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const { error } = await deleteItem(item.id)
    setIsDeleting(false)
    if (error) {
      toast({ title: t.wardrobe.deleteItem, description: error.message, variant: 'destructive' })
      setShowDeleteDialog(false)
    } else {
      toast({ title: t.wardrobe.deleted })
      navigate('/wardrobe')
    }
  }

  const handleAnalyze = async () => {
    if (!item.image_url) {
      toast({
        title: t.analysis.addPhotoFirst,
        description: t.fitCheck.addPhotoHint,
        variant: 'destructive',
      })
      return
    }
    if (!user) return

    const { data, error } = await analyze({
      image_url: item.image_url,
      item_id: item.id,
      user_id: user.id,
    })

    if (error) {
      toast({ title: t.analysis.failed, description: error, variant: 'destructive' })
      return
    }
    setAnalysisResult(data)
    setShowAnalysis(true)
  }

  const handleConfirmAnalysis = async (edited: ClothingAnalysis) => {
    if (!edited.category) {
      toast({
        title: t.analysis.categoryRequired,
        description: t.analysis.categoryRequired,
        variant: 'destructive',
      })
      return
    }

    const colors = [edited.primary_color, edited.secondary_color]
      .map((c) => c.trim())
      .filter(Boolean)

    const updates: WardrobeItemUpdate = {
      category: edited.category,
      subcategory: edited.subcategory || null,
      color: colors,
      style: edited.style || null,
      formality_level: Number.isFinite(edited.formality_level) ? edited.formality_level : null,
      season: edited.season || null,
      material: edited.material || null,
      pattern: edited.pattern || null,
      ai_analysis: edited as unknown as Json,
      ai_confidence: typeof edited.confidence === 'number' ? edited.confidence : null,
      ai_analyzed_at: new Date().toISOString(),
    }

    setIsSavingAnalysis(true)
    const { error } = await saveAnalysis(item.id, updates)
    setIsSavingAnalysis(false)

    if (error) {
      toast({ title: t.styleDna.saveFailed, description: error.message, variant: 'destructive' })
    } else {
      toast({ title: t.analysis.saved, description: item.name })
      setShowAnalysis(false)
      setAnalysisResult(null)
    }
  }

  const itemColors = item.color.map((name) => COLORS.find((c) => c.name === name)).filter(Boolean)

  return (
    <AppLayout hideHeader>
      {/* Header */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center justify-between bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isTogglingFav}
            onClick={handleToggleFavorite}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${item.favorite ? 'fill-rose-500 text-rose-500' : 'text-foreground'}`}
            />
          </button>
          <Link
            to={`/wardrobe/${item.id}/edit`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Link>
        </div>
      </div>

      {/* Hero image — full bleed */}
      <div className="-mx-4">
        {item.image_url ? (
          <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-b from-muted to-muted/60">
            <Shirt className="h-16 w-16 text-foreground/15" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-5 space-y-5 pb-6">
        {/* Name + brand */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight leading-tight">{item.name}</h2>
          {item.brand && <p className="mt-1 text-base text-muted-foreground">{item.brand}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {categoryLabel(item.category)}
            </Badge>
            {item.subcategory && (
              <Badge variant="outline" className="text-muted-foreground">
                {subcategoryLabel(item.subcategory)}
              </Badge>
            )}
            {item.size && <Badge variant="outline">{item.size}</Badge>}
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="space-y-3">
          {itemColors.length > 0 && (
            <div className="flex items-start gap-3">
              <p className="w-20 shrink-0 text-sm text-muted-foreground">{t.wardrobe.color}</p>
              <div className="flex flex-wrap gap-1.5">
                {itemColors.map((c) => (
                  <div key={c!.name} className="flex items-center gap-1 text-sm">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: c!.hex }}
                    />
                    <span>{colorLabel(c!.name)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.notes && (
            <div className="flex items-start gap-3">
              <p className="w-20 shrink-0 text-sm text-muted-foreground">{t.wardrobe.notes}</p>
              <p className="text-sm leading-relaxed">{item.notes}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Wear stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/60 p-4 text-center">
            <p className="text-2xl font-bold">{item.worn_count}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.wardrobe.timesWorn}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-4 text-center">
            <p className="text-sm font-semibold">
              {item.last_worn_at ? formatDate(item.last_worn_at) : '—'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.wardrobe.lastWorn}</p>
          </div>
        </div>

        {/* AI analysis */}
        <Button
          className="w-full"
          onClick={handleAnalyze}
          isLoading={isAnalyzing}
          disabled={isAnalyzing}
        >
          <Sparkles className="h-4 w-4" />
          {isAnalyzing
            ? t.wardrobe.analyzing
            : item.ai_analyzed_at
              ? t.wardrobe.reanalyzeAI
              : t.wardrobe.analyzeAI}
        </Button>

        {/* Actions */}
        <Button
          className="w-full"
          variant="outline"
          onClick={handleMarkAsWorn}
          isLoading={isMarkingWorn}
        >
          {t.wardrobe.wornToday}
        </Button>

        <Separator />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t.wardrobe.added} {formatDate(item.created_at)}</span>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          {t.wardrobe.deleteItem}
        </button>
      </div>

      {/* Delete confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogTitle>{t.wardrobe.deleteConfirm}</DialogTitle>
          <DialogDescription>
            <strong>{item.name}</strong> — {t.wardrobe.deleteWarn}
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t.common.cancel}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              {t.common.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI analysis review */}
      <AnalysisReviewDialog
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
        analysis={analysisResult}
        isSaving={isSavingAnalysis}
        onConfirm={handleConfirmAnalysis}
      />
    </AppLayout>
  )
}
