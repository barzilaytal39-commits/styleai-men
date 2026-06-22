import { Check, AlertTriangle, Lightbulb, Wand2 } from 'lucide-react'
import { t } from '@/i18n'
import type { FitCheckResult } from '@/hooks/useFitCheck'

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600'
  if (score >= 6) return 'text-amber-600'
  return 'text-rose-600'
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3 text-center">
      <p className={`text-xl font-bold ${value === null ? 'text-muted-foreground' : scoreColor(value)}`}>
        {value === null ? '—' : `${value}`}
        {value !== null && <span className="text-xs font-medium text-muted-foreground">/10</span>}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

export function FitCheckResultView({ result }: { result: FitCheckResult }) {
  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t.fitCheck.overall}
        </p>
        <p className={`mt-1 text-4xl font-bold ${scoreColor(result.overall_score)}`}>
          {result.overall_score}
          <span className="text-lg font-medium text-muted-foreground">/10</span>
        </p>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-3 gap-2">
        <ScoreCard label={t.fitCheck.fit} value={result.fit_score} />
        <ScoreCard label={t.fitCheck.style} value={result.style_score} />
        <ScoreCard label={t.fitCheck.color} value={result.color_score} />
        <ScoreCard label={t.fitCheck.occasionScore} value={result.occasion_score} />
        <ScoreCard label={t.fitCheck.weather} value={result.weather_score} />
      </div>

      {/* Strengths */}
      {result.strengths.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Check className="h-4 w-4 text-emerald-600" /> {t.fitCheck.strengths}
          </h3>
          <ul className="space-y-1.5">
            {result.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-emerald-600">•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Issues */}
      {result.issues.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> {t.fitCheck.issues}
          </h3>
          <ul className="space-y-1.5">
            {result.issues.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-amber-600">•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-foreground" /> {t.fitCheck.recommendations}
          </h3>
          <ul className="space-y-1.5">
            {result.recommendations.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span>•</span>
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Item recommendations */}
      {result.item_recommendations.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t.fitCheck.itemSuggestions}</h3>
          <div className="space-y-2">
            {result.item_recommendations.map((r, i) => (
              <div key={i} className="rounded-lg bg-muted/60 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {r.type}
                </p>
                <p className="text-sm">{r.recommendation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fragrance */}
      {result.fragrance_recommendation && (
        <section className="rounded-xl bg-muted/60 px-3 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Wand2 className="h-4 w-4" /> {t.fitCheck.fragrance}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{result.fragrance_recommendation}</p>
        </section>
      )}

      {/* Final verdict */}
      {result.final_verdict && (
        <section className="rounded-2xl border border-foreground/15 bg-foreground/5 p-4">
          <h3 className="text-sm font-semibold">{t.fitCheck.finalVerdict}</h3>
          <p className="mt-1 text-sm leading-relaxed">{result.final_verdict}</p>
        </section>
      )}
    </div>
  )
}
