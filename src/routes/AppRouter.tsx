import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute } from './ProtectedRoute'

import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WardrobePage } from '@/pages/WardrobePage'
import { WardrobeInsightsPage } from '@/pages/WardrobeInsightsPage'
import { WardrobeAddPage } from '@/pages/WardrobeAddPage'
import { WardrobeItemPage } from '@/pages/WardrobeItemPage'
import { WardrobeEditPage } from '@/pages/WardrobeEditPage'
import { OutfitBuilderPage } from '@/pages/OutfitBuilderPage'
import { SavedOutfitsPage } from '@/pages/SavedOutfitsPage'
import { SavedOutfitDetailPage } from '@/pages/SavedOutfitDetailPage'
import { StyleProfilePage } from '@/pages/StyleProfilePage'
import { StylistPage } from '@/pages/StylistPage'
import { MemoryInspectorPage } from '@/pages/MemoryInspectorPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { FitCheckPage } from '@/pages/FitCheckPage'
import { FitCheckDetailPage } from '@/pages/FitCheckDetailPage'
import { WeeklyPlannerPage } from '@/pages/WeeklyPlannerPage'
import { WeeklyPlanDetailPage } from '@/pages/WeeklyPlanDetailPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AppRouter() {
  const { setUser, setProfile, setInitialized } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data)
      }

      setInitialized(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data)
      }

      if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setInitialized])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/style-profile" element={<StyleProfilePage />} />
        <Route path="/stylist" element={<StylistPage />} />
        <Route path="/memory" element={<MemoryInspectorPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/wardrobe" element={<WardrobePage />} />
        <Route path="/wardrobe/insights" element={<WardrobeInsightsPage />} />
        <Route path="/wardrobe/add" element={<WardrobeAddPage />} />
        <Route path="/wardrobe/:id" element={<WardrobeItemPage />} />
        <Route path="/wardrobe/:id/edit" element={<WardrobeEditPage />} />
        <Route path="/outfits" element={<OutfitBuilderPage />} />
        <Route path="/outfits/saved" element={<SavedOutfitsPage />} />
        <Route path="/outfits/:id" element={<SavedOutfitDetailPage />} />
        <Route path="/fit-check" element={<FitCheckPage />} />
        <Route path="/fit-check/:id" element={<FitCheckDetailPage />} />
        <Route path="/planner" element={<WeeklyPlannerPage />} />
        <Route path="/planner/:id" element={<WeeklyPlanDetailPage />} />
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  )
}
