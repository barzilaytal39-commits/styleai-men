# Edge Function: `morning-briefing`

Proactive daily styling briefing (Phase 7C). Consumes the precomputed Smart Context
(Phase 7B.1) and returns one confident Hebrew daily recommendation. Browser never
calls Anthropic; key read only from the `ANTHROPIC_API_KEY` Edge secret (reused).

## Request body

```json
{ "context": { /* PersonalContext from buildPersonalContext() */ } }
```

`context` is required. It already carries weather, time_of_day/weekday, style_profile,
wardrobe_items (metadata only — no images), wear_history, wardrobe_health,
shopping_gaps, weekly_plan, recent_outfits, recent_fit_checks.

## Success response (`200`)

```json
{
  "greeting": "…",
  "summary": "…",
  "recommended_item_ids": ["uuid"],
  "fragrance_recommendation": "…",
  "watch_or_accessory_recommendation": "…",
  "why_this_look": ["…"],
  "rotation_note": "…",
  "wardrobe_tip": "…",
  "shopping_gap_tip": "…",
  "confidence": 0.8
}
```

User-facing text is **Hebrew**; `recommended_item_ids` are copied exactly from
`context.wardrobe_items` (the model recommends only items that exist there).

## Errors

| Status | When |
| --- | --- |
| `400` | Bad JSON / missing `context` |
| `405` | Non-POST (OPTIONS handled) |
| `422` | Model refused / no briefing |
| `429` | Anthropic rate limit |
| `500` | `ANTHROPIC_API_KEY` not set / unexpected |
| `502` | Anthropic auth/API failure |

The Dashboard shows a **rule-based fallback** briefing on any failure and does not
auto-retry.

## Model & deploy

`claude-opus-4-8` (strict tool use, `npm:@anthropic-ai/sdk`); override via
`ANTHROPIC_MODEL`. No DB writes (briefing is not persisted in the MVP).

```bash
supabase functions deploy morning-briefing --project-ref <your-project-ref>
```
