import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PersonalContext } from '@/lib/personal-context'

export interface MorningBriefing {
  greeting: string
  summary: string
  recommended_item_ids: string[]
  fragrance_recommendation: string
  watch_or_accessory_recommendation: string
  why_this_look: string[]
  rotation_note: string
  wardrobe_tip: string
  shopping_gap_tip: string
  confidence: number
}

async function mapInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context
  const status = context?.status
  let serverMessage: string | undefined
  if (context && typeof context.clone === 'function') {
    try {
      const b = await context.clone().json()
      if (b && typeof b.error === 'string') serverMessage = b.error
    } catch {
      // not JSON
    }
  }
  switch (status) {
    case 401:
      return 'פג תוקף ההתחברות. התחבר מחדש.'
    case 429:
      return 'השירות עמוס כרגע. מציג הצעה לפי כללים.'
    case 500:
      return serverMessage ?? 'הבריף היומי אינו זמין כרגע. מציג הצעה לפי כללים.'
    case 502:
      return 'ספק ה-AI לא הגיב. מציג הצעה לפי כללים.'
    default:
      if (status) return serverMessage ?? `הבריף נכשל (שגיאה ${status}).`
      return 'לא ניתן להפיק בריף יומי. מציג הצעה לפי כללים.'
  }
}

export function useMorningBriefing() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = async (
    context: PersonalContext,
  ): Promise<{ data: MorningBriefing | null; error: string | null }> => {
    setIsGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke<MorningBriefing>('morning-briefing', {
        body: { context },
      })
      if (error) return { data: null, error: await mapInvokeError(error) }
      if (!data?.summary) return { data: null, error: 'לא התקבל בריף. מציג הצעה לפי כללים.' }
      return { data, error: null }
    } finally {
      setIsGenerating(false)
    }
  }

  return { isGenerating, generate }
}
