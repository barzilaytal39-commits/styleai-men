import { create } from 'zustand'
import type { WardrobeItem, WardrobeCategory } from '@/types'

interface WardrobeState {
  items: WardrobeItem[]
  isLoaded: boolean
  activeCategory: WardrobeCategory | 'all'
  setItems: (items: WardrobeItem[]) => void
  addItem: (item: WardrobeItem) => void
  updateItem: (id: string, updated: WardrobeItem) => void
  removeItem: (id: string) => void
  setActiveCategory: (category: WardrobeCategory | 'all') => void
  reset: () => void
}

export const useWardrobeStore = create<WardrobeState>((set) => ({
  items: [],
  isLoaded: false,
  activeCategory: 'all',
  setItems: (items) => set({ items, isLoaded: true }),
  addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
  updateItem: (id, updated) =>
    set((state) => ({ items: state.items.map((i) => (i.id === id ? updated : i)) })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  reset: () => set({ items: [], isLoaded: false, activeCategory: 'all' }),
}))
