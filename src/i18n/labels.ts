// Display-label maps (Phase 5). The KEYS are the internal English values stored
// in the DB / sent to the AI — they never change. Only the Hebrew display label
// is localized. Each helper falls back to the raw value if unmapped.

export const OCCASION_LABELS: Record<string, string> = {
  Office: 'משרד',
  Field: 'שטח',
  'Office + Field': 'משרד + שטח',
  'Executive Meeting': 'פגישת הנהלה',
  Casual: 'קז׳ואל',
  Date: 'דייט',
  'Evening Event': 'אירוע ערב',
}

export const CATEGORY_LABELS: Record<string, string> = {
  tops: 'חולצות',
  bottoms: 'מכנסיים',
  outerwear: 'שכבות עליונות',
  shoes: 'נעליים',
  accessories: 'אקססוריז',
}

export const STYLE_LABELS: Record<string, string> = {
  Casual: 'קז׳ואל',
  'Smart Casual': 'סמארט קז׳ואל',
  'Smart Casual Premium': 'סמארט קז׳ואל פרימיום',
  Business: 'עסקי',
  Formal: 'רשמי',
  Streetwear: 'סטריטוור',
  Athletic: 'ספורטיבי',
  Minimal: 'מינימליסטי',
}

export const LOCATION_LABELS: Record<string, string> = {
  Indoor: 'מקורה',
  Outdoor: 'חוץ',
  Mixed: 'מעורב',
}

export const SEASON_LABELS: Record<string, string> = {
  spring: 'אביב',
  summer: 'קיץ',
  fall: 'סתיו',
  winter: 'חורף',
  'all-season': 'כל העונות',
}

export const SLOT_LABELS: Record<string, string> = {
  top: 'עליון',
  bottom: 'תחתון',
  outerwear: 'שכבה עליונה',
  shoes: 'נעליים',
  belt: 'חגורה',
  watch: 'שעון',
  fragrance: 'בושם',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  Never: 'אף פעם',
  Rarely: 'לעיתים רחוקות',
  Sometimes: 'לפעמים',
  Often: 'לעיתים קרובות',
  Daily: 'יומיומי',
}

const FORMALITY_LABELS: Record<number, string> = {
  1: '1 — מאוד יומיומי',
  2: '2 — יומיומי',
  3: '3 — סמארט קז׳ואל',
  4: '4 — עסקי',
  5: '5 — רשמי',
}

export const BODY_TYPE_LABELS: Record<string, string> = {
  Slim: 'רזה', Athletic: 'אתלטי', Average: 'ממוצע', Muscular: 'שרירי', Broad: 'רחב', Heavyset: 'כבד',
}
export const SKIN_TONE_LABELS: Record<string, string> = {
  Fair: 'בהיר מאוד', Light: 'בהיר', Medium: 'בינוני', Olive: 'זיתני', Tan: 'שזוף', Dark: 'כהה', Deep: 'כהה מאוד',
}
export const HAIR_COLOR_LABELS: Record<string, string> = {
  Black: 'שחור', Brown: 'חום', 'Dark Blonde': 'בלונד כהה', Blonde: 'בלונדיני', Red: 'ג׳ינג׳י', Grey: 'אפור', Bald: 'קירח',
}
export const SHIRT_FIT_LABELS: Record<string, string> = {
  Slim: 'צמוד', Tailored: 'מחויט', Regular: 'רגיל', Relaxed: 'רפוי',
}
export const PANTS_FIT_LABELS: Record<string, string> = {
  Skinny: 'סקיני', Slim: 'צמוד', Straight: 'ישר', Relaxed: 'רפוי', Tapered: 'מתחדד',
}
export const SHOE_STYLE_LABELS: Record<string, string> = {
  Sneakers: 'סניקרס', Loafers: 'מוקסינים', Boots: 'מגפיים', 'Dress Shoes': 'נעלי אלגנט', Minimal: 'מינימליסטי',
}
export const TUCK_LABELS: Record<string, string> = {
  Always: 'תמיד', Sometimes: 'לפעמים', Situational: 'לפי המצב', Never: 'אף פעם',
}
export const CUFFING_LABELS: Record<string, string> = {
  Always: 'תמיד', Sometimes: 'לפעמים', Never: 'אף פעם',
}
export const CLIMATE_LABELS: Record<string, string> = {
  'Runs cold': 'סובל מקור', Neutral: 'ניטרלי', 'Runs hot': 'סובל מחום',
}
export const FRAGRANCE_LABELS: Record<string, string> = {
  Fresh: 'רענן', Woody: 'עצי', Spicy: 'חריף', Citrus: 'הדרים', 'Signature only': 'חתימה אישית בלבד', None: 'ללא',
}
export const ACCESSORY_LABELS: Record<string, string> = {
  Minimal: 'מינימלי', Moderate: 'מתון', Statement: 'בולט',
}

export const SUBCATEGORY_LABELS: Record<string, string> = {
  'T-Shirt': 'טי-שירט', Shirt: 'חולצה מכופתרת', Polo: 'פולו', 'Knit Polo': 'פולו סרוג',
  Sweater: 'סוודר', Hoodie: 'קפוצ׳ון', 'Tank Top': 'גופייה', Henley: 'הנלי',
  Jeans: 'ג׳ינס', Chinos: 'צ׳ינוס', Trousers: 'מכנסיים מחויטים', Shorts: 'מכנסיים קצרים',
  Sweatpants: 'מכנסי טרנינג', Cargos: 'דגמ״ח',
  Jacket: 'ז׳קט', Blazer: 'בלייזר', Coat: 'מעיל', Puffer: 'מעיל פוך', Raincoat: 'מעיל גשם',
  Bomber: 'בומבר', Cardigan: 'קרדיגן',
  Sneakers: 'סניקרס', Boots: 'מגפיים', Loafers: 'מוקסינים', 'Dress Shoes': 'נעלי אלגנט',
  Sandals: 'סנדלים', 'Slip-Ons': 'סליפ-און',
  Watch: 'שעון', Belt: 'חגורה', Bag: 'תיק', Hat: 'כובע', Tie: 'עניבה', Scarf: 'צעיף',
  Sunglasses: 'משקפי שמש', Wallet: 'ארנק', Fragrance: 'בושם',
}

export const COLOR_LABELS: Record<string, string> = {
  Black: 'שחור', White: 'לבן', Grey: 'אפור', Gray: 'אפור', Navy: 'כחול נייבי', Blue: 'כחול',
  'Light Blue': 'תכלת', Green: 'ירוק', Olive: 'ירוק זית', Khaki: 'חאקי', Beige: 'בז׳',
  Brown: 'חום', Burgundy: 'בורדו', Red: 'אדום', Orange: 'כתום', Yellow: 'צהוב',
  Purple: 'סגול', Pink: 'ורוד', Cream: 'קרם',
}

// Calendar event types + dress codes (Phase 8B). Keys = internal English values.
export const EVENT_TYPE_LABELS_HE: Record<string, string> = {
  office: 'משרד',
  executive_meeting: 'ישיבת הנהלה',
  presentation: 'מצגת',
  client_meeting: 'פגישת לקוח',
  site_visit: 'סיור שטח',
  conference: 'כנס',
  travel: 'נסיעה',
  airport: 'שדה תעופה',
  dinner: 'ארוחת ערב',
  wedding: 'חתונה',
  party: 'מסיבה',
  date: 'דייט',
  shopping: 'קניות',
  family: 'משפחה',
  casual: 'קז׳ואל',
  workout: 'אימון',
  unknown: 'אירוע',
}

export const DRESS_CODE_LABELS_HE: Record<string, string> = {
  'Smart Casual': 'סמארט קז׳ואל',
  'Smart Casual Premium': 'סמארט קז׳ואל פרימיום',
  'Business Casual': 'עסקי קז׳ואל',
  Business: 'עסקי',
  Formal: 'רשמי',
  'Comfortable Smart Casual': 'סמארט קז׳ואל נוח',
  Casual: 'קז׳ואל',
  Activewear: 'ספורטיבי',
}

export const eventTypeLabel = (v: string) => EVENT_TYPE_LABELS_HE[v] ?? v
export const dressCodeLabel = (v: string) => (v ? DRESS_CODE_LABELS_HE[v] ?? v : '')
export const subcategoryLabel = (v: string | null | undefined) => (v ? SUBCATEGORY_LABELS[v] ?? v : '')
export const colorLabel = (v: string) => COLOR_LABELS[v] ?? v
export const occasionLabel = (v: string) => OCCASION_LABELS[v] ?? v
export const categoryLabel = (v: string) => CATEGORY_LABELS[v] ?? v
export const styleLabel = (v: string) => STYLE_LABELS[v] ?? v
export const locationLabel = (v: string) => LOCATION_LABELS[v] ?? v
export const seasonLabel = (v: string) => SEASON_LABELS[v] ?? v
export const slotLabel = (v: string | null | undefined) => (v ? SLOT_LABELS[v] ?? v : '')
export const frequencyLabel = (v: string) => FREQUENCY_LABELS[v] ?? v
export const formalityLabel = (v: number) => FORMALITY_LABELS[v] ?? String(v)
