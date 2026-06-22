import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { ProfileUpdate } from '@/types'

export function useProfile() {
  const { user, profile, setProfile } = useAuthStore()
  const [isUpdating, setIsUpdating] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      setProfile(data)
    }
  }, [user, setProfile])

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      setIsUpdating(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', user.id)
          .select()
          .single()

        if (error) throw error
        setProfile(data)
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      } finally {
        setIsUpdating(false)
      }
    },
    [user, setProfile]
  )

  const uploadAvatar = useCallback(
    async (file: File): Promise<{ url: string | null; error: Error | null }> => {
      if (!user) return { url: null, error: new Error('Not authenticated') }
      setIsUpdating(true)
      try {
        const ext = file.name.split('.').pop()
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        const url = `${data.publicUrl}?t=${Date.now()}`

        await updateProfile({ avatar_url: url })
        return { url, error: null }
      } catch (err) {
        return { url: null, error: err as Error }
      } finally {
        setIsUpdating(false)
      }
    },
    [user, updateProfile]
  )

  return { profile, isUpdating, fetchProfile, updateProfile, uploadAvatar }
}
