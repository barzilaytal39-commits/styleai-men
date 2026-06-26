import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { applyFeedback, type FeedbackKind } from '@/lib/style-memory'
import type { StyleMemory, WardrobeItem } from '@/types'

export function useStyleMemory() {
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)

  const fetchMemory = useCallback(async (): Promise<{
    data: StyleMemory | null
    error: Error | null
  }> => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('style_memory')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return { data: null, error }
    return { data: data ?? null, error: null }
  }, [user])

  // Applies a feedback event to persistent memory (upsert on user_id) and returns
  // the updated row so the caller can refresh its state.
  const recordFeedback = useCallback(
    async (
      current: StyleMemory | null,
      kind: FeedbackKind,
      items: WardrobeItem[],
      savedText?: string,
    ): Promise<{ data: StyleMemory | null; error: Error | null }> => {
      if (!user) return { data: null, error: new Error('Not authenticated') }
      setIsSaving(true)
      try {
        const update = applyFeedback(current, kind, items, savedText)
        const { data, error } = await supabase
          .from('style_memory')
          .upsert({ user_id: user.id, ...update }, { onConflict: 'user_id' })
          .select()
          .single()
        if (error) throw error
        return { data, error: null }
      } catch (err) {
        return { data: null, error: err as Error }
      } finally {
        setIsSaving(false)
      }
    },
    [user],
  )

  const resetMemory = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') }
    const { error } = await supabase.from('style_memory').delete().eq('user_id', user.id)
    return { error: error ?? null }
  }, [user])

  return { isSaving, fetchMemory, recordFeedback, resetMemory }
}
