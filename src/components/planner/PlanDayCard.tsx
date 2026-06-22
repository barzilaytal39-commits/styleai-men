import type { ReactNode } from 'react'
import { Shirt, CloudSun } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'

export interface DayThumb {
  key: string
  imageUrl: string | null
  label: string
}

interface PlanDayCardProps {
  weekday: string
  date: string
  occasion?: string | null
  weatherText?: string | null
  thumbnails: DayThumb[]
  explanation?: string | null
  badge?: string | null
  children?: ReactNode
}

export function PlanDayCard({
  weekday,
  date,
  occasion,
  weatherText,
  thumbnails,
  explanation,
  badge,
  children,
}: PlanDayCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {weekday} <span className="font-normal text-muted-foreground">{date}</span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {occasion && (
              <Badge variant="secondary" className="capitalize">
                {occasion}
              </Badge>
            )}
            {weatherText && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CloudSun className="h-3.5 w-3.5" />
                {weatherText}
              </span>
            )}
          </div>
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
            {badge}
          </span>
        )}
      </div>

      {thumbnails.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {thumbnails.map((t) => (
            <div key={t.key} className="w-16 shrink-0">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                {t.imageUrl ? (
                  <img src={t.imageUrl} alt={t.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Shirt className="h-5 w-5 text-foreground/20" strokeWidth={1.25} />
                  </div>
                )}
              </div>
              <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                {t.label}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.planner.noOutfit}</p>
      )}

      {explanation && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{explanation}</p>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
