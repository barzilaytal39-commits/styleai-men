import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CATEGORIES } from '@/lib/wardrobe-constants'
import { cn } from '@/lib/utils'
import { t, categoryLabel, seasonLabel, formalityLabel as fmtFormality } from '@/i18n'
import type { ClothingAnalysis } from '@/hooks/useClaudeAnalysis'

const SEASONS = ['spring', 'summer', 'fall', 'winter', 'all-season']
const FORMALITY = [
  { value: 1, label: '1 — Very casual' },
  { value: 2, label: '2 — Casual' },
  { value: 3, label: '3 — Smart-casual' },
  { value: 4, label: '4 — Business' },
  { value: 5, label: '5 — Formal' },
]

const selectClass =
  'h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface AnalysisReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  analysis: ClothingAnalysis | null
  isSaving: boolean
  onConfirm: (edited: ClothingAnalysis) => void
}

export function AnalysisReviewDialog({
  open,
  onOpenChange,
  analysis,
  isSaving,
  onConfirm,
}: AnalysisReviewDialogProps) {
  const [draft, setDraft] = useState<ClothingAnalysis | null>(analysis)

  // Re-seed the editable draft whenever a fresh analysis arrives.
  useEffect(() => {
    setDraft(analysis)
  }, [analysis])

  if (!draft) return null

  const set = <K extends keyof ClothingAnalysis>(key: K, value: ClothingAnalysis[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))

  const confidencePct = Math.round((draft.confidence ?? 0) * 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-foreground" />
          <DialogTitle>{t.analysis.reviewTitle}</DialogTitle>
        </div>
        <DialogDescription>
          {t.analysis.reviewHint}
          <span className="font-medium text-foreground">{confidencePct}%</span>
        </DialogDescription>

        <div className="mt-4 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          {/* Category + Subcategory */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-category">{t.analysis.category}</Label>
              <div className="relative">
                <select
                  id="ai-category"
                  className={selectClass}
                  value={draft.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  <option value="">{t.itemForm.select}</option>
                  {CATEGORIES.map(({ id }) => (
                    <option key={id} value={id}>
                      {categoryLabel(id)}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ▾
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-subcategory">{t.analysis.type}</Label>
              <Input
                id="ai-subcategory"
                value={draft.subcategory}
                onChange={(e) => set('subcategory', e.target.value)}
              />
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-primary">{t.analysis.primaryColor}</Label>
              <Input
                id="ai-primary"
                value={draft.primary_color}
                onChange={(e) => set('primary_color', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-secondary">{t.analysis.secondaryColor}</Label>
              <Input
                id="ai-secondary"
                value={draft.secondary_color}
                onChange={(e) => set('secondary_color', e.target.value)}
              />
            </div>
          </div>

          {/* Style + Formality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-style">{t.analysis.style}</Label>
              <Input
                id="ai-style"
                value={draft.style}
                onChange={(e) => set('style', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-formality">{t.analysis.formality}</Label>
              <div className="relative">
                <select
                  id="ai-formality"
                  className={selectClass}
                  value={draft.formality_level}
                  onChange={(e) => set('formality_level', Number(e.target.value))}
                >
                  {FORMALITY.map(({ value }) => (
                    <option key={value} value={value}>
                      {fmtFormality(value)}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ▾
                </span>
              </div>
            </div>
          </div>

          {/* Season + Material */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ai-season">{t.analysis.season}</Label>
              <div className="relative">
                <select
                  id="ai-season"
                  className={selectClass}
                  value={draft.season}
                  onChange={(e) => set('season', e.target.value)}
                >
                  <option value="">{t.itemForm.select}</option>
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>
                      {seasonLabel(s)}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ▾
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-material">{t.analysis.material}</Label>
              <Input
                id="ai-material"
                value={draft.material}
                onChange={(e) => set('material', e.target.value)}
              />
            </div>
          </div>

          {/* Pattern */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-pattern">{t.analysis.pattern}</Label>
            <Input
              id="ai-pattern"
              value={draft.pattern}
              onChange={(e) => set('pattern', e.target.value)}
            />
          </div>

          {/* AI notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-notes">{t.analysis.notes}</Label>
            <Textarea
              id="ai-notes"
              value={draft.ai_notes}
              onChange={(e) => set('ai_notes', e.target.value)}
            />
          </div>
        </div>

        <div className={cn('mt-6 flex gap-3')}>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t.common.cancel}
          </Button>
          <Button
            className="flex-1"
            onClick={() => draft && onConfirm(draft)}
            isLoading={isSaving}
          >
            {isSaving ? t.common.saving : t.analysis.saveAnalysis}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
