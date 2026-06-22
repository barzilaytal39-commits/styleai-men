import { useState } from 'react'
import { supabase } from '@/lib/supabase'

// Mirrors the JSON returned by the analyze-wardrobe-item Edge Function.
export interface ClothingAnalysis {
  category: string
  subcategory: string
  primary_color: string
  secondary_color: string
  style: string
  formality_level: number
  season: string
  material: string
  pattern: string
  ai_notes: string
  confidence: number
}

interface AnalyzeResponse {
  item_id: string
  analysis: ClothingAnalysis
}

interface AnalyzeArgs {
  image_url: string
  item_id: string
  user_id: string
}

// Turns a Supabase Functions error into a clear, user-facing message based on
// the HTTP status returned by the Edge Function.
async function mapInvokeError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context
  const status = context?.status

  // The function returns { error: "..." }; surface it when present.
  let serverMessage: string | undefined
  if (context && typeof context.clone === 'function') {
    try {
      const body = await context.clone().json()
      if (body && typeof body.error === 'string') serverMessage = body.error
    } catch {
      // body wasn't JSON — fall back to status-based messages
    }
  }

  switch (status) {
    case 415:
      return (
        serverMessage ??
        'Unsupported image format. Please upload JPG, PNG, or WEBP.'
      )
    case 401:
      return 'Your session has expired. Please sign in again and retry.'
    case 429:
      return 'The AI is busy right now (rate limited). Please try again in a moment.'
    case 422:
      return (
        serverMessage ??
        'The AI could not analyze this image. Try a clearer, well-lit photo.'
      )
    case 500:
      return serverMessage ?? 'AI analysis is unavailable right now. Please try again later.'
    case 502:
      return 'The AI provider failed to respond. Please try again.'
    default:
      if (status) return serverMessage ?? `Analysis failed (HTTP ${status}).`
      // No status → network/fetch failure invoking the function.
      return 'Could not reach the AI service. Check your connection and try again.'
  }
}

export function useClaudeAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyze = async (
    args: AnalyzeArgs,
  ): Promise<{ data: ClothingAnalysis | null; error: string | null }> => {
    setIsAnalyzing(true)
    try {
      const { data, error } = await supabase.functions.invoke<AnalyzeResponse>(
        'analyze-wardrobe-item',
        { body: args },
      )

      if (error) {
        return { data: null, error: await mapInvokeError(error) }
      }
      if (!data?.analysis) {
        return { data: null, error: 'The AI returned no analysis. Please try again.' }
      }
      return { data: data.analysis, error: null }
    } finally {
      setIsAnalyzing(false)
    }
  }

  return { isAnalyzing, analyze }
}
