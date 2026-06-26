import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Sparkles, Shirt, Wand2, Lightbulb, AlertTriangle, RotateCcw } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWardrobe } from '@/hooks/useWardrobe'
import { useStyleProfile } from '@/hooks/useStyleProfile'
import { useWeather } from '@/hooks/useWeather'
import { useOutfits, type SavedOutfit } from '@/hooks/useOutfits'
import { useFitCheck } from '@/hooks/useFitCheck'
import { usePlanner, type PlanDayWithOutfit } from '@/hooks/usePlanner'
import { useStylistChat, type StylistResponse } from '@/hooks/useStylistChat'
import { useAuthStore } from '@/store/authStore'
import { buildPersonalContext } from '@/lib/personal-context'
import type { StyleProfile, WardrobeItem, FitCheck } from '@/types'

const SUGGESTED = ['מה כדאי ללבוש היום?', 'איזה בושם מתאים לי?', 'מה חסר לי בארון?']

type ChatMsg =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'assistant'; data: StylistResponse }
  | { id: number; role: 'error'; text: string; retryOf: string }

export function StylistPage() {
  const { items, isLoaded, fetchItems } = useWardrobe()
  const { fetchStyleProfile } = useStyleProfile()
  const { weather } = useWeather()
  const { fetchOutfits } = useOutfits()
  const { fetchFitChecks } = useFitCheck()
  const { fetchPlans, fetchPlan } = usePlanner()
  const { ask, isAsking } = useStylistChat()
  const profile = useAuthStore((s) => s.profile)

  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null)
  const [recentOutfits, setRecentOutfits] = useState<SavedOutfit[]>([])
  const [recentFitChecks, setRecentFitChecks] = useState<FitCheck[]>([])
  const [todayPlanDay, setTodayPlanDay] = useState<PlanDayWithOutfit | null>(null)

  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const idRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isLoaded) void fetchItems()
  }, [isLoaded, fetchItems])

  // Gather compact context once.
  useEffect(() => {
    let active = true
    void (async () => {
      const [profileRes, outfitsRes, fitRes, plansRes] = await Promise.all([
        fetchStyleProfile(),
        fetchOutfits(),
        fetchFitChecks(),
        fetchPlans(),
      ])
      if (!active) return
      if (profileRes.data) setStyleProfile(profileRes.data)
      setRecentOutfits(outfitsRes.data)
      setRecentFitChecks(fitRes.data)
      if (plansRes.data.length > 0) {
        const { data: full } = await fetchPlan(plansRes.data[0].id)
        if (active && full) {
          const today = new Date().toISOString().slice(0, 10)
          setTodayPlanDay(full.days.find((d) => d.day === today) ?? null)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [fetchStyleProfile, fetchOutfits, fetchFitChecks, fetchPlans, fetchPlan])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAsking])

  const buildContext = () =>
    buildPersonalContext({
      profile,
      styleProfile,
      weather,
      items,
      recentOutfits,
      recentFitChecks,
      todayPlanDay,
    })

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isAsking) return
    setInput('')
    setMessages((m) => [...m, { id: idRef.current++, role: 'user', text: trimmed }])

    const { data, error } = await ask(trimmed, buildContext())
    if (error || !data) {
      setMessages((m) => [
        ...m,
        { id: idRef.current++, role: 'error', text: error ?? 'שגיאה', retryOf: trimmed },
      ])
      inputRef.current?.focus()
      return
    }
    setMessages((m) => [...m, { id: idRef.current++, role: 'assistant', data }])
    inputRef.current?.focus()
  }

  const itemById = (id: string) => items.find((i) => i.id === id)

  return (
    <AppLayout title="סטייליסט אישי">
      <div className="flex flex-col gap-4 pb-4">
        {/* Suggestion chips — always at the top; tap sends immediately */}
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              disabled={isAsking}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-foreground/40 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Empty-state intro */}
        {messages.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <p className="text-sm font-semibold">שאל אותי כל דבר על הסטייל שלך</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              אני מכיר את הארון, ה-DNA הסגנוני ומזג האוויר שלך.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-foreground px-3.5 py-2 text-sm text-background">
                  {msg.text}
                </div>
              </div>
            )
          }
          if (msg.role === 'error') {
            return (
              <div key={msg.id} className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {msg.text}
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => void send(msg.retryOf)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  נסה שוב
                </Button>
              </div>
            )
          }
          const { data } = msg
          const recommended = data.recommended_item_ids.map(itemById).filter(Boolean) as WardrobeItem[]
          return (
            <div key={msg.id} className="space-y-3">
              {/* Answer bubble */}
              <div className="flex justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed">
                  {data.answer}
                </div>
              </div>

              {/* Recommended items */}
              {recommended.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {recommended.map((item) => (
                    <Link key={item.id} to={`/wardrobe/${item.id}`} className="w-20 shrink-0">
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Shirt className="h-5 w-5 text-foreground/20" />
                          </div>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs">{item.name}</p>
                    </Link>
                  ))}
                </div>
              )}

              {/* Fragrance */}
              {data.fragrance_recommendation && (
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <Wand2 className="h-3.5 w-3.5" /> בושם
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{data.fragrance_recommendation}</p>
                </div>
              )}

              {/* Styling tips */}
              {data.styling_tips.length > 0 && (
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" /> טיפים
                  </p>
                  <ul className="mt-1 space-y-1">
                    {data.styling_tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span>•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Avoid */}
              {data.avoid.length > 0 && (
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-xs font-semibold">עדיף להימנע</p>
                  <ul className="mt-1 space-y-1">
                    {data.avoid.map((a, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                        <span>•</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}

        {isAsking && (
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-foreground/40 [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />

        {/* Input */}
        <div className="sticky bottom-[4.5rem] z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send(input)
              }}
              placeholder="כתוב הודעה לסטייליסט…"
              disabled={isAsking}
            />
            <Button className="shrink-0" onClick={() => void send(input)} isLoading={isAsking} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
