import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { normalizeToWebp, ImageConversionError } from '@/lib/image'
import type { FitCheck, FitCheckInsert } from '@/types'
import type { Json } from '@/types/database'

export interface ItemRecommendation {
  type: string
  recommendation: string
}

// Mirrors the JSON returned by the fit-check Edge Function.
export interface FitCheckResult {
  overall_score: number
  fit_score: number
  style_score: number
  color_score: number
  occasion_score: number
  weather_score: number | null
  strengths: string[]
  issues: string[]
  recommendations: string[]
  item_recommendations: ItemRecommendation[]
  fragrance_recommendation: string
  final_verdict: string
}

interface AnalyzeArgs {
  photo_url: string
  user_profile?: Record<string, unknown> | null
  selected_outfit?: Record<string, unknown> | null
  weather?: Record<string, unknown> | null
  occasion?: string | null
  desired_style?: string | null
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
      return 'Your session has expired. Please sign in again and retry.'
    case 415:
      return serverMessage ?? 'Unsupported image format. Please upload JPG, PNG, or WEBP.'
    case 429:
      return 'The AI is busy right now (rate limited). Please try again in a moment.'
    case 422:
      return serverMessage ?? 'The AI could not analyze this photo. Try a clearer, full-length shot.'
    case 500:
      return serverMessage ?? 'Fit Check is unavailable right now. Please try again later.'
    case 502:
      return 'The AI provider failed to respond. Please try again.'
    default:
      if (status) return serverMessage ?? `Fit Check failed (HTTP ${status}).`
      return 'Could not reach the Fit Check service. Check your connection and try again.'
  }
}

export function useFitCheck() {
  const { user } = useAuthStore()
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Convert to WebP and upload to the outfit-photos bucket; return a public URL.
  const uploadPhoto = useCallback(
    async (file: File): Promise<{ url: string | null; error: string | null }> => {
      if (!user) return { url: null, error: 'Not authenticated' }
      setIsUploading(true)
      try {
        const webp = await normalizeToWebp(file)
        const path = `${user.id}/fitcheck/${Date.now()}.webp`
        const { error: uploadError } = await supabase.storage
          .from('outfit-photos')
          .upload(path, webp, { upsert: true, contentType: 'image/webp' })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('outfit-photos').getPublicUrl(path)
        return { url: `${data.publicUrl}?t=${Date.now()}`, error: null }
      } catch (err) {
        const msg =
          err instanceof ImageConversionError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Could not upload photo.'
        return { url: null, error: msg }
      } finally {
        setIsUploading(false)
      }
    },
    [user],
  )

  const analyze = useCallback(
    async (args: AnalyzeArgs): Promise<{ data: FitCheckResult | null; error: string | null }> => {
      setIsAnalyzing(true)
      try {
        const { data, error } = await supabase.functions.invoke<FitCheckResult>('fit-check', {
          body: args,
        })
        if (error) return { data: null, error: await mapInvokeError(error) }
        if (!data) return { data: null, error: 'Fit Check returned no result. Please try again.' }
        return { data, error: null }
      } finally {
        setIsAnalyzing(false)
      }
    },
    [],
  )

  const saveFitCheck = useCallback(
    async (record: Omit<FitCheckInsert, 'user_id'>): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      setIsSaving(true)
      try {
        const { error } = await supabase.from('fit_checks').insert({ ...record, user_id: user.id })
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

  const fetchFitChecks = useCallback(async (): Promise<{ data: FitCheck[]; error: Error | null }> => {
    if (!user) return { data: [], error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('fit_checks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return { data: [], error }
    return { data: data ?? [], error: null }
  }, [user])

  const fetchFitCheck = useCallback(
    async (id: string): Promise<{ data: FitCheck | null; error: Error | null }> => {
      if (!user) return { data: null, error: new Error('Not authenticated') }
      const { data, error } = await supabase
        .from('fit_checks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (error) return { data: null, error }
      return { data, error: null }
    },
    [user],
  )

  // Helper to coerce the stored JSON result back into a typed object.
  const asResult = useCallback((value: Json | null): FitCheckResult | null => {
    return value ? (value as unknown as FitCheckResult) : null
  }, [])

  return {
    isUploading,
    isAnalyzing,
    isSaving,
    uploadPhoto,
    analyze,
    saveFitCheck,
    fetchFitChecks,
    fetchFitCheck,
    asResult,
  }
}
