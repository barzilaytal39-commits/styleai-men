import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PersonalContext } from '@/lib/personal-context'

export interface StylistResponse {
  answer: string
  recommended_item_ids: string[]
  fragrance_recommendation: string
  styling_tips: string[]
  avoid: string[]
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
  // User-facing fallback messages are Hebrew.
  switch (status) {
    case 401:
      return 'פג תוקף ההתחברות. התחבר מחדש ונסה שוב.'
    case 429:
      return 'הסטייליסט עמוס כרגע. נסה שוב בעוד רגע.'
    case 422:
      return 'לא הצלחתי לנסח תשובה. נסה לנסח את השאלה אחרת.'
    case 500:
      return 'שירות הסטייליסט אינו זמין כרגע. נסה שוב מאוחר יותר.'
    case 502:
      return 'ספק ה-AI לא הגיב. נסה שוב.'
    default:
      if (status) return serverMessage ?? `הבקשה נכשלה (שגיאה ${status}).`
      return 'לא ניתן להתחבר לסטייליסט. בדוק את החיבור ונסה שוב.'
  }
}

export function useStylistChat() {
  const [isAsking, setIsAsking] = useState(false)

  const ask = async (
    message: string,
    ctx: PersonalContext,
  ): Promise<{ data: StylistResponse | null; error: string | null }> => {
    setIsAsking(true)
    try {
      const { data, error } = await supabase.functions.invoke<StylistResponse>('stylist-chat', {
        body: { message, ...ctx },
      })
      if (error) return { data: null, error: await mapInvokeError(error) }
      if (!data?.answer) {
        return { data: null, error: 'לא התקבלה תשובה מהסטייליסט. נסה שוב.' }
      }
      return { data, error: null }
    } finally {
      setIsAsking(false)
    }
  }

  return { isAsking, ask }
}
