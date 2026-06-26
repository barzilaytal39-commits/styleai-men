import { useEffect, useState } from 'react'
import { Brain, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useStyleMemory } from '@/hooks/useStyleMemory'
import { useToast } from '@/components/ui/toaster'
import { formatDate } from '@/lib/utils'
import { t, styleLabel, colorLabel, formalityLabel } from '@/i18n'
import type { StyleMemory } from '@/types'

function Chips({
  title,
  values,
  labelFn,
}: {
  title: string
  values: string[]
  labelFn?: (v: string) => string
}) {
  if (!values || values.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium">
            {labelFn ? labelFn(v) : v}
          </span>
        ))}
      </div>
    </div>
  )
}

export function MemoryInspectorPage() {
  const { fetchMemory, resetMemory } = useStyleMemory()
  const { toast } = useToast()
  const [memory, setMemory] = useState<StyleMemory | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error } = await fetchMemory()
      if (!active) return
      if (error) toast({ title: t.memory.loadFailed, description: error.message, variant: 'destructive' })
      setMemory(data)
      setLoaded(true)
    })()
    return () => {
      active = false
    }
  }, [fetchMemory, toast])

  const handleReset = async () => {
    setIsResetting(true)
    const { error } = await resetMemory()
    setIsResetting(false)
    setShowReset(false)
    if (error) {
      toast({ title: t.memory.resetFailed, description: error.message, variant: 'destructive' })
    } else {
      setMemory(null)
      toast({ title: t.memory.resetDone })
    }
  }

  const hasAny =
    !!memory &&
    (memory.favorite_styles.length ||
      memory.favorite_colors.length ||
      memory.favorite_brands.length ||
      memory.favorite_fragrances.length ||
      memory.favorite_watches.length ||
      memory.favorite_accessories.length ||
      memory.learned_preferences.length ||
      memory.learned_avoids.length ||
      memory.preferred_formality !== null)

  if (!loaded) {
    return (
      <AppLayout title={t.memory.title}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={t.memory.title}>
      <div className="space-y-5 pb-6">
        {!hasAny ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Brain className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">{t.memory.empty}</p>
              <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">{t.memory.emptyHint}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Confidence */}
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t.memory.confidence}</span>
                <span className="font-bold">{Math.round((memory!.confidence ?? 0) * 100)}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${Math.round((memory!.confidence ?? 0) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t.memory.lastUpdated}: {formatDate(memory!.updated_at)}
              </p>
            </section>

            <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
              <Chips title={t.memory.favStyles} values={memory!.favorite_styles} labelFn={styleLabel} />
              <Chips title={t.memory.favColors} values={memory!.favorite_colors} labelFn={colorLabel} />
              <Chips title={t.memory.favBrands} values={memory!.favorite_brands} />
              <Chips title={t.memory.favFragrances} values={memory!.favorite_fragrances} />
              <Chips title={t.memory.favWatches} values={memory!.favorite_watches} />
              <Chips title={t.memory.favAccessories} values={memory!.favorite_accessories} />
              {memory!.preferred_formality !== null && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t.memory.preferredFormality}
                  </p>
                  <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium">
                    {formalityLabel(memory!.preferred_formality)}
                  </span>
                </div>
              )}
              <Chips title={t.memory.learnedPrefs} values={memory!.learned_preferences} />
              <Chips title={t.memory.learnedAvoids} values={memory!.learned_avoids} />
            </section>
          </>
        )}

        <button
          type="button"
          onClick={() => setShowReset(true)}
          disabled={!memory}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {t.memory.reset}
        </button>
      </div>

      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent>
          <DialogTitle>{t.memory.resetConfirm}</DialogTitle>
          <DialogDescription>{t.memory.resetWarn}</DialogDescription>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowReset(false)} disabled={isResetting}>
              {t.common.cancel}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleReset} isLoading={isResetting}>
              {t.memory.reset}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
