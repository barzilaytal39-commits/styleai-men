import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { LoginFormData, SignupFormData } from '@/lib/validations'

export function useAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, isLoading, isInitialized, setLoading, reset } = useAuthStore()

  const signIn = useCallback(
    async ({ email, password }: LoginFormData) => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
        navigate(from, { replace: true })
      } finally {
        setLoading(false)
      }
    },
    [navigate, location, setLoading]
  )

  const signUp = useCallback(
    async ({ email, password, fullName }: SignupFormData) => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          })
        }

        navigate('/')
      } finally {
        setLoading(false)
      }
    },
    [navigate, setLoading]
  )

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      reset()
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }, [navigate, reset, setLoading])

  return { user, profile, isLoading, isInitialized, signIn, signUp, signOut }
}
