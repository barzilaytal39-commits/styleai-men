import type { WardrobeCategory } from '@/types'

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
  accessories: ['Watch', 'Belt', 'Bag', 'Hat', 'Tie', 'Scarf', 'Sunglasses', 'Wallet'],
}

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
