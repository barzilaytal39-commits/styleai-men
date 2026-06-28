import type { WardrobeCategory, WardrobeItem } from '@/types'

export const CATEGORIES: { id: WardrobeCategory; label: string }[] = [
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'accessories', label: 'Accessories' },
]

export const SUBCATEGORIES: Record<WardrobeCategory, string[]> = {
  tops: ['T-Shirt', 'Shirt', 'Polo', 'Sweater', 'Hoodie', 'Tank Top', 'Henley'],
  bottoms: ['Jeans', 'Chinos', 'Trousers', 'Shorts', 'Sweatpants', 'Cargos'],
  outerwear: ['Jacket', 'Blazer', 'Coat', 'Puffer', 'Raincoat', 'Bomber', 'Cardigan'],
  shoes: ['Sneakers', 'Boots', 'Loafers', 'Dress Shoes', 'Sandals', 'Slip-Ons'],
  // Watch / Fragrance / Belt live here as subcategories — the DB has only the five
  // broad categories above (CHECK constraint). The wardrobe UI splits them into their
  // own filter chips (see WARDROBE_FILTERS) without needing new DB categories.
  accessories: ['Watch', 'Fragrance', 'Belt', 'Bag', 'Hat', 'Tie', 'Scarf', 'Sunglasses', 'Wallet'],
}

// Accessory subcategories that get their own user-facing filter chip.
const ACCESSORY_SPECIAL = ['Watch', 'Fragrance', 'Belt']
const subEquals = (item: WardrobeItem, sub: string) =>
  item.category === 'accessories' && (item.subcategory ?? '').toLowerCase() === sub.toLowerCase()

export type WardrobeFilterId =
  | 'all'
  | 'tops'
  | 'bottoms'
  | 'shoes'
  | 'outerwear'
  | 'watches'
  | 'fragrances'
  | 'belts'
  | 'accessories'

// Single source of truth for the wardrobe filter chips. Maps the broad DB categories
// (+ accessory subcategories) to the richer user-facing set. Labels are localized in
// the UI via t.wardrobe.filters[id]; predicates run against stored English values.
export const WARDROBE_FILTERS: {
  id: WardrobeFilterId
  emoji: string
  predicate: (item: WardrobeItem) => boolean
}[] = [
  { id: 'all', emoji: '', predicate: () => true },
  { id: 'tops', emoji: '👕', predicate: (i) => i.category === 'tops' },
  { id: 'bottoms', emoji: '👖', predicate: (i) => i.category === 'bottoms' },
  { id: 'shoes', emoji: '👟', predicate: (i) => i.category === 'shoes' },
  { id: 'outerwear', emoji: '🧥', predicate: (i) => i.category === 'outerwear' },
  { id: 'watches', emoji: '⌚', predicate: (i) => subEquals(i, 'Watch') },
  { id: 'fragrances', emoji: '🧴', predicate: (i) => subEquals(i, 'Fragrance') },
  { id: 'belts', emoji: '🧵', predicate: (i) => subEquals(i, 'Belt') },
  {
    id: 'accessories',
    emoji: '🎒',
    predicate: (i) =>
      i.category === 'accessories' &&
      !ACCESSORY_SPECIAL.some((s) => (i.subcategory ?? '').toLowerCase() === s.toLowerCase()),
  },
]

export const filterPredicate = (id: WardrobeFilterId) =>
  (WARDROBE_FILTERS.find((f) => f.id === id) ?? WARDROBE_FILTERS[0]).predicate

export const SIZES_BY_CATEGORY: Record<WardrobeCategory, string[]> = {
  tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  bottoms: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
  outerwear: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  shoes: ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'],
  accessories: ['One Size'],
}

export const COLORS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f0ede8' },
  { name: 'Grey', hex: '#9ca3af' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Light Blue', hex: '#93c5fd' },
  { name: 'Green', hex: '#166534' },
  { name: 'Olive', hex: '#6b7c3e' },
  { name: 'Khaki', hex: '#c3a882' },
  { name: 'Beige', hex: '#d4c5a9' },
  { name: 'Brown', hex: '#7c5c3a' },
  { name: 'Burgundy', hex: '#6b1f2a' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Yellow', hex: '#ca8a04' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Pink', hex: '#db2777' },
]
