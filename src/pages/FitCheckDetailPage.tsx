import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FitCheckResultView } from '@/components/fitcheck/FitCheckResultView'
import { useFitCheck, type FitCheckResult } from '@/hooks/useFitCheck'
import { formatDate } from '@/lib/utils'
import { t, occasionLabel } from '@/i18n'

export function FitCheckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchFitCheck, asResult } = useFitCheck()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [occasion, setOccasion] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [result, setResult] = useState<FitCheckResult | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    void (async () => {
      const { data, error } = await fetchFitCheck(id)
      if (!active) return
      if (error || !data) {
        setNotFound(true)
        return
      }
      setPhotoUrl(data.photo_url)
      setOccasion(data.occasion)
      setCreatedAt(data.created_at)
      setResult(asResult(data.result))
    })()
    return () => {
      active = false
    }
  }, [id, fetchFitCheck, asResult])

  if (notFound) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <ScanLine className="h-12 w-12 text-muted-foreground" strokeWidth={1.25} />
          <div>
            <p className="font-semibold">{t.fitCheck.notFound}</p>
            <p className="text-sm text-muted-foreground">{t.wardrobe.notFoundHint}</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/fit-check')}>
            {t.fitCheck.backToFitCheck}
          </Button>
        </div>
      </AppLayout>
    )
  }

  if (!photoUrl) {
    return (
      <AppLayout hideHeader>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout hideHeader>
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          type="button"
          onClick={() => navigate('/fit-check')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back</span>
        </button>
        <h1 className="text-lg font-semibold">{t.fitCheck.title}</h1>
      </div>

      <div className="space-y-5 pt-3 pb-6">
        <div className="-mx-4">
          <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
            <img src={photoUrl} alt="Fit check" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {occasion && <Badge variant="secondary">{occasionLabel(occasion)}</Badge>}
          {createdAt && <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>}
        </div>

        {result ? (
          <FitCheckResultView result={result} />
        ) : (
          <p className="text-sm text-muted-foreground">{t.fitCheck.noStored}</p>
        )}
      </div>
    </AppLayout>
  )
}
