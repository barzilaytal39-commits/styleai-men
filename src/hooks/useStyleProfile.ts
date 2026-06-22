import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formToRow, type StyleProfileFormData } from '@/lib/style-profile-constants'
import type { StyleProfile } from '@/types'

export function useStyleProfile() {
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)

  // Returns the user's style profile, or null if none saved yet.
  const fetchStyleProfile = useCallback(async (): Promise<{
    data: StyleProfile | null
    error: Error | null
  }> => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('style_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return { data: null, error }
    return { data: data ?? null, error: null }
  }, [user])

  // Upserts the profile (one row per user via the user_id UNIQUE constraint).
  const saveStyleProfile = useCallback(
    async (form: StyleProfileFormData): Promise<{ data: StyleProfile | null; error: Error | null }> => {
      if (!user) return { data: null, error: new Error('Not authenticated') }
      setIsSaving(true)
      try {
        const { data, error } = await supabase
          .from('style_profiles')
          .upsert({ ...formToRow(form, user.id), updated_at: new Date().toISOString() }, {
            onConflict: 'user_id',
          })
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

  return { isSaving, fetchStyleProfile, saveStyleProfile }
}
