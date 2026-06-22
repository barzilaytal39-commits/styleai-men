import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useWardrobeStore } from '@/store/wardrobeStore'
import type { OutfitItemInsert, OutfitSlot, Outfit, WardrobeItem } from '@/types'
import type { GeneratedOutfit, OutfitBrief } from '@/lib/outfit-engine'

const SLOT_ORDER: OutfitSlot[] = ['top', 'bottom', 'outerwear', 'shoes', 'belt', 'watch', 'fragrance']

// A saved outfit with its items and the related wardrobe item embedded.
export interface SavedOutfitItem {
  id: string
  slot: string | null
  wardrobe_item_id: string
  wardrobe_items: WardrobeItem | null
}
export interface SavedOutfit extends Outfit {
  outfit_items: SavedOutfitItem[]
}

const OUTFIT_SELECT =
  '*, outfit_items(id, slot, wardrobe_item_id, wardrobe_items(*))'

export function useOutfits() {
  const { user } = useAuthStore()
  const updateWardrobeItem = useWardrobeStore((s) => s.updateItem)
  const [isSaving, setIsSaving] = useState(false)

  // Persists a generated outfit: one `outfits` row + one `outfit_items` row
  // per filled slot.
  const saveOutfit = useCallback(
    async (
      outfit: GeneratedOutfit,
      brief: OutfitBrief,
      name: string,
    ): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      setIsSaving(true)
      try {
        const notes = `Generated · ${brief.occasion} · ${brief.locationType} · ${brief.desiredStyle} · formality ${brief.formalityLevel}/5 · score ${outfit.score}/10`

        const { data: created, error: outfitError } = await supabase
          .from('outfits')
          .insert({
            user_id: user.id,
            name: name.trim() || `${brief.occasion} look`,
            occasion: brief.occasion,
            notes,
          })
          .select()
          .single()
        if (outfitError) throw outfitError

        const rows: OutfitItemInsert[] = SLOT_ORDER.filter((slot) => outfit.slots[slot]).map(
          (slot) => ({
            outfit_id: created.id,
            wardrobe_item_id: outfit.slots[slot]!.id,
            slot,
          }),
        )

        if (rows.length > 0) {
          const { error: itemsError } = await supabase.from('outfit_items').insert(rows)
          if (itemsError) throw itemsError
        }

        return { error: null }
      } catch (err) {
        return { error: err as Error }
      } finally {
        setIsSaving(false)
      }
    },
    [user],
  )

  // Lists the user's saved outfits, newest first, with items + wardrobe data.
  const fetchOutfits = useCallback(async (): Promise<{
    data: SavedOutfit[]
    error: Error | null
  }> => {
    if (!user) return { data: [], error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('outfits')
      .select(OUTFIT_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return { data: [], error }
    return { data: (data ?? []) as unknown as SavedOutfit[], error: null }
  }, [user])

  // Fetches a single saved outfit by id.
  const fetchOutfit = useCallback(
    async (id: string): Promise<{ data: SavedOutfit | null; error: Error | null }> => {
      if (!user) return { data: null, error: new Error('Not authenticated') }
      const { data, error } = await supabase
        .from('outfits')
        .select(OUTFIT_SELECT)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (error) return { data: null, error }
      return { data: data as unknown as SavedOutfit, error: null }
    },
    [user],
  )

  // Marks an outfit as worn today: bumps the outfit's wear stats AND every
  // wardrobe item in it (so the rule engine's rotation logic stays accurate).
  const markOutfitWorn = useCallback(
    async (outfit: SavedOutfit): Promise<{ error: Error | null }> => {
      if (!user) return { error: new Error('Not authenticated') }
      const now = new Date().toISOString()
      try {
        const { error: outfitError } = await supabase
          .from('outfits')
          .update({
            last_worn_at: now,
            worn_count: (outfit.worn_count ?? 0) + 1,
            updated_at: now,
          })
          .eq('id', outfit.id)
          .eq('user_id', user.id)
        if (outfitError) throw outfitError

        for (const oi of outfit.outfit_items) {
          const item = oi.wardrobe_items
          if (!item) continue
          const newCount = (item.worn_count ?? 0) + 1
          const { error: itemError } = await supabase
            .from('wardrobe_items')
            .update({ worn_count: newCount, last_worn_at: now, updated_at: now })
            .eq('id', item.id)
            .eq('user_id', user.id)
          if (itemError) throw itemError
          // Keep the wardrobe store (used by the builder) in sync.
          updateWardrobeItem(item.id, { ...item, worn_count: newCount, last_worn_at: now })
        }

        return { error: null }
      } catch (err) {
        return { error: err as Error }
      }
    },
    [user, updateWardrobeItem],
  )

  return { isSaving, saveOutfit, fetchOutfits, fetchOutfit, markOutfitWorn }
}
