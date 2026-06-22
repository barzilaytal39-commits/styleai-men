import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useWardrobeStore } from '@/store/wardrobeStore'
import type { WardrobeItemInsert, WardrobeItemUpdate } from '@/types'

export function useWardrobe() {
  const { user } = useAuthStore()
  const { items, isLoaded, activeCategory, setItems, addItem, updateItem, removeItem, setActiveCategory } =
    useWardrobeStore()

  const fetchItems = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!error && data) setItems(data)
  }, [user, setItems])

  const createItem = useCallback(
    async (
      fields: Omit<WardrobeItemInsert, 'user_id'>,
      imageFile?: File
    ): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      try {
        const { data: newItem, error } = await supabase
          .from('wardrobe_items')
          .insert({ ...fields, user_id: user.id })
          .select()
          .single()
        if (error) throw error

        if (imageFile) {
          const ext = imageFile.name.split('.').pop() ?? 'jpg'
          const path = `${user.id}/${newItem.id}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('wardrobe-items')
            .upload(path, imageFile, { upsert: true })

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('wardrobe-items').getPublicUrl(path)
            const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`
            await supabase
              .from('wardrobe_items')
              .update({ image_url: imageUrl })
              .eq('id', newItem.id)
            newItem.image_url = imageUrl
          }
        }

        addItem(newItem)
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      }
    },
    [user, addItem]
  )

  const editItem = useCallback(
    async (
      id: string,
      updates: WardrobeItemUpdate,
      imageFile?: File
    ): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      try {
        let imageUrl = updates.image_url

        if (imageFile) {
          const ext = imageFile.name.split('.').pop() ?? 'jpg'
          const path = `${user.id}/${id}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('wardrobe-items')
            .upload(path, imageFile, { upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('wardrobe-items').getPublicUrl(path)
            imageUrl = `${urlData.publicUrl}?t=${Date.now()}`
          }
        }

        const { data, error } = await supabase
          .from('wardrobe_items')
          .update({ ...updates, image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()
        if (error) throw error

        updateItem(id, data)
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      }
    },
    [user, updateItem]
  )

  // Focused update for AI-analysis fields. Unlike editItem it never touches
  // image_url, and updates only the columns passed in.
  const saveAnalysis = useCallback(
    async (id: string, fields: WardrobeItemUpdate): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      try {
        const { data, error } = await supabase
          .from('wardrobe_items')
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()
        if (error) throw error

        updateItem(id, data)
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      }
    },
    [user, updateItem],
  )

  const deleteItem = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      try {
        const item = items.find((i) => i.id === id)

        const { error } = await supabase
          .from('wardrobe_items')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
        if (error) throw error

        if (item?.image_url) {
          try {
            const url = new URL(item.image_url)
            const parts = url.pathname.split('/wardrobe-items/')
            if (parts.length > 1) {
              const storagePath = parts[1].split('?')[0]
              await supabase.storage.from('wardrobe-items').remove([storagePath])
            }
          } catch {
            // storage cleanup is best-effort
          }
        }

        removeItem(id)
        return { error: null }
      } catch (err) {
        return { error: err as Error }
      }
    },
    [user, items, removeItem]
  )

  const toggleFavorite = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((i) => i.id === id)
      if (!item || !user) return
      const newFav = !item.favorite
      updateItem(id, { ...item, favorite: newFav })
      await supabase
        .from('wardrobe_items')
        .update({ favorite: newFav, updated_at: new Date().toISOString() })
        .eq('id', id)
    },
    [user, items, updateItem]
  )

  const markAsWorn = useCallback(
    async (id: string): Promise<void> => {
      const item = items.find((i) => i.id === id)
      if (!item || !user) return
      const now = new Date().toISOString()
      const newCount = item.worn_count + 1
      updateItem(id, { ...item, worn_count: newCount, last_worn_at: now })
      await supabase
        .from('wardrobe_items')
        .update({ worn_count: newCount, last_worn_at: now, updated_at: now })
        .eq('id', id)
    },
    [user, items, updateItem]
  )

  const filteredItems =
    activeCategory === 'all' ? items : items.filter((i) => i.category === activeCategory)

  return {
    items,
    filteredItems,
    isLoaded,
    activeCategory,
    setActiveCategory,
    fetchItems,
    createItem,
    editItem,
    saveAnalysis,
    deleteItem,
    toggleFavorite,
    markAsWorn,
  }
}
