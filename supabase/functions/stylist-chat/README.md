# Edge Function: `stylist-chat`

Personal-stylist chat (Phase 7A). Answers a natural-language styling question using
the user's compact, non-sensitive context. Browser never calls Anthropic; key read
only from the `ANTHROPIC_API_KEY` Edge secret (reused).

## Request body

```json
{
  "message": "מה כדאי ללבוש היום?",
  "style_profile": { "preferred_style": "Smart Casual Premium" },
  "weather": { "temperature_c": 22, "condition": "Clear" },
  "wardrobe_items": [
    { "id": "uuid", "name": "...", "category": "tops", "subcategory": "Polo",
      "colors": ["Navy"], "style": "smart-casual", "formality_level": 3,
      "season": "all-season", "material": "cotton", "pattern": "solid",
      "last_worn_at": null, "worn_count": 2, "ai_notes": "..." }
  ],
  "recent_outfits": [{ "name": "...", "occasion": "Office", "items": ["Polo","Chinos"] }],
  "recent_fit_checks": [{ "overall_score": 8, "verdict": "..." }],
  "weekly_plan": { "occasion": "Office", "items": ["..."] }
}
```

Only `message` is required. **No images, no auth data** — wardrobe items carry
metadata only (the IDs let the frontend render the recommended items).

## Success response (`200`)

```json
{
  "answer": "…",
  "recommended_item_ids": ["uuid", "…"],
  "fragrance_recommendation": "…",
  "styling_tips": ["…"],
  "avoid": ["…"],
  "confidence": 0.8
}
```

User-facing text is **Hebrew**; `recommended_item_ids` are copied exactly from the
input wardrobe (the model recommends only items that exist there).

## Errors

| Status | When |
| --- | --- |
| `400` | Bad JSON / missing `message` |
| `405` | Non-POST (OPTIONS handled) |
| `422` | Model refused / no answer |
| `429` | Anthropic rate limit |
| `500` | `ANTHROPIC_API_KEY` not set / unexpected |
| `502` | Anthropic auth/API failure |

The frontend shows a Hebrew fallback message + retry on any failure.

## Model & deploy

`claude-opus-4-8` (strict tool use, `npm:@anthropic-ai/sdk`); override via
`ANTHROPIC_MODEL`. No DB writes (chat is not persisted in the MVP).

```bash
supabase functions deploy stylist-chat --project-ref <your-project-ref>
```
