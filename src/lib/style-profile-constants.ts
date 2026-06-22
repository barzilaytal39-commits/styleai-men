// Personal Style DNA — option lists, form model, preset, and helpers.
// All stored values are English (UI may localize later).

import type { StyleProfile, StyleProfileInsert } from '@/types'

export const BODY_TYPES = ['Slim', 'Athletic', 'Average', 'Muscular', 'Broad', 'Heavyset']
export const SKIN_TONES = ['Fair', 'Light', 'Medium', 'Olive', 'Tan', 'Dark', 'Deep']
export const HAIR_COLORS = ['Black', 'Brown', 'Dark Blonde', 'Blonde', 'Red', 'Grey', 'Bald']

export const FREQUENCY_OPTIONS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Daily']

export const DAY_TYPES = [
  'Office',
  'Field',
  'Office + Field',
  'Executive Meeting',
  'Casual',
  'Date',
  'Evening Event',
]

export const PREFERRED_STYLES = [
  'Casual',
  'Smart Casual',
  'Smart Casual Premium',
  'Business',
  'Formal',
  'Streetwear',
  'Athletic',
  'Minimal',
]

export const FORMALITY_OPTIONS = [
  { value: 1, label: '1 — Very casual' },
  { value: 2, label: '2 — Casual' },
  { value: 3, label: '3 — Smart-casual' },
  { value: 4, label: '4 — Business' },
  { value: 5, label: '5 — Formal' },
]

export const SHIRT_FITS = ['Slim', 'Tailored', 'Regular', 'Relaxed']
export const PANTS_FITS = ['Skinny', 'Slim', 'Straight', 'Relaxed', 'Tapered']
export const SHOE_STYLES = ['Sneakers', 'Loafers', 'Boots', 'Dress Shoes', 'Minimal']
export const TUCK_OPTIONS = ['Always', 'Sometimes', 'Situational', 'Never']
export const CUFFING_OPTIONS = ['Always', 'Sometimes', 'Never']
export const CLIMATE_OPTIONS = ['Runs cold', 'Neutral', 'Runs hot']
export const FRAGRANCE_OPTIONS = ['Fresh', 'Woody', 'Spicy', 'Citrus', 'Signature only', 'None']
export const ACCESSORY_OPTIONS = ['Minimal', 'Moderate', 'Statement']

// The shape the form edits (a flat, non-null view over the DB row).
export interface StyleProfileFormData {
  height_cm: number | null
  body_type: string
  skin_tone: string
  hair_color: string
  profession: string
  work_environment: string
  field_work_frequency: string
  office_work_frequency: string
  typical_day_types: string[]
  preferred_style: string
  preferred_formality: number | null
  wants_premium_look: boolean
  wants_effortless_look: boolean
  wants_head_turning_look: boolean
  favorite_colors: string[]
  avoid_colors: string[]
  preferred_brands: string[]
  disliked_styles: string[]
  shirt_fit_preference: string
  pants_fit_preference: string
  shoe_style_preference: string
  tuck_preference: string
  cuffing_preference: string
  climate_sensitivity: string
  fragrance_preference: string
  accessory_preference: string
}

export const EMPTY_STYLE_PROFILE: StyleProfileFormData = {
  height_cm: null,
  body_type: '',
  skin_tone: '',
  hair_color: '',
  profession: '',
  work_environment: '',
  field_work_frequency: '',
  office_work_frequency: '',
  typical_day_types: [],
  preferred_style: '',
  preferred_formality: null,
  wants_premium_look: false,
  wants_effortless_look: false,
  wants_head_turning_look: false,
  favorite_colors: [],
  avoid_colors: [],
  preferred_brands: [],
  disliked_styles: [],
  shirt_fit_preference: '',
  pants_fit_preference: '',
  shoe_style_preference: '',
  tuck_preference: '',
  cuffing_preference: '',
  climate_sensitivity: '',
  fragrance_preference: '',
  accessory_preference: '',
}

// "Personal Mode" default preset for the main user.
export const PERSONAL_MODE_PRESET: StyleProfileFormData = {
  ...EMPTY_STYLE_PROFILE,
  profession: 'Electrical project manager',
  work_environment: 'Construction site + company headquarters',
  field_work_frequency: 'Often',
  office_work_frequency: 'Often',
  typical_day_types: ['Office', 'Field', 'Office + Field', 'Executive Meeting'],
  preferred_style: 'Smart Casual Premium',
  preferred_formality: 3,
  wants_premium_look: true,
  wants_effortless_look: true,
  wants_head_turning_look: true,
  shirt_fit_preference: 'Tailored',
  pants_fit_preference: 'Slim',
  shoe_style_preference: 'Loafers',
  tuck_preference: 'Situational',
  cuffing_preference: 'Sometimes',
  climate_sensitivity: 'Neutral',
  fragrance_preference: 'Woody',
  accessory_preference: 'Moderate',
}

// ---- mapping helpers (DB row <-> form) ----

const str = (v: string | null | undefined) => v ?? ''
const arr = (v: string[] | null | undefined) => v ?? []

export function rowToForm(row: StyleProfile): StyleProfileFormData {
  return {
    height_cm: row.height_cm,
    body_type: str(row.body_type),
    skin_tone: str(row.skin_tone),
    hair_color: str(row.hair_color),
    profession: str(row.profession),
    work_environment: str(row.work_environment),
    field_work_frequency: str(row.field_work_frequency),
    office_work_frequency: str(row.office_work_frequency),
    typical_day_types: arr(row.typical_day_types),
    preferred_style: str(row.preferred_style),
    preferred_formality: row.preferred_formality,
    wants_premium_look: row.wants_premium_look ?? false,
    wants_effortless_look: row.wants_effortless_look ?? false,
    wants_head_turning_look: row.wants_head_turning_look ?? false,
    favorite_colors: arr(row.favorite_colors),
    avoid_colors: arr(row.avoid_colors),
    preferred_brands: arr(row.preferred_brands),
    disliked_styles: arr(row.disliked_styles),
    shirt_fit_preference: str(row.shirt_fit_preference),
    pants_fit_preference: str(row.pants_fit_preference),
    shoe_style_preference: str(row.shoe_style_preference),
    tuck_preference: str(row.tuck_preference),
    cuffing_preference: str(row.cuffing_preference),
    climate_sensitivity: str(row.climate_sensitivity),
    fragrance_preference: str(row.fragrance_preference),
    accessory_preference: str(row.accessory_preference),
  }
}

const nullIfEmpty = (v: string) => (v.trim() === '' ? null : v.trim())

export function formToRow(
  form: StyleProfileFormData,
  userId: string,
): StyleProfileInsert {
  return {
    user_id: userId,
    height_cm: form.height_cm,
    body_type: nullIfEmpty(form.body_type),
    skin_tone: nullIfEmpty(form.skin_tone),
    hair_color: nullIfEmpty(form.hair_color),
    profession: nullIfEmpty(form.profession),
    work_environment: nullIfEmpty(form.work_environment),
    field_work_frequency: nullIfEmpty(form.field_work_frequency),
    office_work_frequency: nullIfEmpty(form.office_work_frequency),
    typical_day_types: form.typical_day_types,
    preferred_style: nullIfEmpty(form.preferred_style),
    preferred_formality: form.preferred_formality,
    wants_premium_look: form.wants_premium_look,
    wants_effortless_look: form.wants_effortless_look,
    wants_head_turning_look: form.wants_head_turning_look,
    favorite_colors: form.favorite_colors,
    avoid_colors: form.avoid_colors,
    preferred_brands: form.preferred_brands,
    disliked_styles: form.disliked_styles,
    shirt_fit_preference: nullIfEmpty(form.shirt_fit_preference),
    pants_fit_preference: nullIfEmpty(form.pants_fit_preference),
    shoe_style_preference: nullIfEmpty(form.shoe_style_preference),
    tuck_preference: nullIfEmpty(form.tuck_preference),
    cuffing_preference: nullIfEmpty(form.cuffing_preference),
    climate_sensitivity: nullIfEmpty(form.climate_sensitivity),
    fragrance_preference: nullIfEmpty(form.fragrance_preference),
    accessory_preference: nullIfEmpty(form.accessory_preference),
  }
}

// Concise, English summary sent to the AI ranker (preferences only — never a
// hard constraint; the rule engine still owns occasion/formality/availability).
export function buildProfileSummary(row: StyleProfile): Record<string, unknown> {
  const compact = (o: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(o).filter(([, v]) =>
        Array.isArray(v) ? v.length > 0 : v !== null && v !== '' && v !== undefined,
      ),
    )
  return compact({
    profession: row.profession,
    work_environment: row.work_environment,
    typical_day_types: row.typical_day_types,
    preferred_style: row.preferred_style,
    preferred_formality: row.preferred_formality,
    wants_premium_look: row.wants_premium_look,
    wants_effortless_look: row.wants_effortless_look,
    wants_head_turning_look: row.wants_head_turning_look,
    favorite_colors: row.favorite_colors,
    avoid_colors: row.avoid_colors,
    preferred_brands: row.preferred_brands,
    disliked_styles: row.disliked_styles,
    shirt_fit_preference: row.shirt_fit_preference,
    pants_fit_preference: row.pants_fit_preference,
    shoe_style_preference: row.shoe_style_preference,
    tuck_preference: row.tuck_preference,
    cuffing_preference: row.cuffing_preference,
    climate_sensitivity: row.climate_sensitivity,
    fragrance_preference: row.fragrance_preference,
    accessory_preference: row.accessory_preference,
    body_type: row.body_type,
  })
}
