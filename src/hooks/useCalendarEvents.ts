import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { CalendarEvent } from '@/lib/calendar-intelligence'
import type { CalendarEventRow } from '@/types'

export interface CalendarEventForm {
  title: string
  description: string
  start_at: string // ISO
  end_at: string | null // ISO or null
  location: string
}

// Maps DB rows → the engine's CalendarEvent shape (decouples storage from logic).
export function toEngineEvents(rows: CalendarEventRow[]): CalendarEvent[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    start: r.start_at,
    end: r.end_at,
    location: r.location,
    notes: r.description,
  }))
}

export function useCalendarEvents() {
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)

  const fetchEvents = useCallback(async (): Promise<{
    data: CalendarEventRow[]
    error: Error | null
  }> => {
    if (!user) return { data: [], error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .order('start_at', { ascending: true })
    if (error) return { data: [], error }
    return { data: data ?? [], error: null }
  }, [user])

  const createEvent = useCallback(
    async (form: CalendarEventForm): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      setIsSaving(true)
      try {
        const { error } = await supabase.from('calendar_events').insert({
          user_id: user.id,
          title: form.title,
          description: form.description || null,
          start_at: form.start_at,
          end_at: form.end_at,
          location: form.location || null,
          source: 'manual',
        })
        if (error) throw error
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      } finally {
        setIsSaving(false)
      }
    },
    [user],
  )

  const updateEvent = useCallback(
    async (id: string, form: CalendarEventForm): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      setIsSaving(true)
      try {
        const { error } = await supabase
          .from('calendar_events')
          .update({
            title: form.title,
            description: form.description || null,
            start_at: form.start_at,
            end_at: form.end_at,
            location: form.location || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
        if (error) throw error
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      } finally {
        setIsSaving(false)
      }
    },
    [user],
  )

  const deleteEvent = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      return { error: error ?? null }
    },
    [user],
  )

  return { isSaving, fetchEvents, createEvent, updateEvent, deleteEvent }
}
