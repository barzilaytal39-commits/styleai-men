# Edge Function: `rank-outfits`

AI **ranking layer** for the Outfit Builder (Phase 3E). The client-side rule engine
pre-selects candidate outfits; this function only **ranks and explains** them. The
AI never sees the full wardrobe — only the structured candidates in the request.
The Anthropic key is read solely from the `ANTHROPIC_API_KEY` Edge secret; the
browser never calls Anthropic.

## Request body

```json
{
  "user_profile": { "style_preferences": ["minimal"] },
  "brief": {
    "occasion": "Office",
    "location_type": "Indoor",
    "desired_style": "Smart Casual",
    "formality_level": 3
  },
  "candidate_outfits": [
    {
      "candidate_id": "abc|def|ghi",
      "rule_score": 8.2,
      "rule_explanation": "…",
      "items": [
        {
          "slot": "top", "name": "White Oxford Shirt", "category": "tops",
          "subcategory": "Shirt", "colors": ["White"], "style": "smart-casual",
          "formality_level": 3, "material": "cotton", "pattern": "solid",
          "last_worn_at": null
        }
      ]
    }
  ]
}
```

`brief` and a non-empty `candidate_outfits` array are required. `user_profile` and
`weather` are optional. When `weather` is present (e.g.
`{ "temperature_c": 9, "apparent_c": 7, "condition": "Rain", "precipitation_mm": 1.2,
"rain_probability_pct": 80, "wind_kmh": 20 }`), the model factors it in and returns a
`weather_score` 1–10; otherwise `weather_score` is `null`.

## Success response (`200`)

```json
{
  "ranked_candidate_ids": ["abc|def|ghi", "..."],
  "rankings": [
    {
      "candidate_id": "abc|def|ghi",
      "ai_score": 9, "occasion_score": 9, "color_score": 8, "style_score": 9,
      "premium_score": 8, "effortless_score": 9, "weather_score": null,
      "explanation": "…", "styling_tip": "…"
    }
  ]
}
```

Scores are integers 1–10. `weather_score` is `null` unless a `weather` payload was
sent, in which case it is a 1–10 integer.

## Errors

| Status | When                                            |
| ------ | ----------------------------------------------- |
| `400`  | Bad JSON, missing `brief`, or empty candidates  |
| `405`  | Non-POST (OPTIONS handled for CORS)             |
| `422`  | Model refused / returned no ranking             |
| `429`  | Anthropic rate limit                            |
| `500`  | `ANTHROPIC_API_KEY` not set / unexpected error  |
| `502`  | Anthropic auth/API failure                      |

The frontend falls back to the rule-based order on any failure, so the app stays
usable without this function.

## Model

Defaults to `claude-opus-4-8` (strict tool use, `npm:@anthropic-ai/sdk`); override
with the `ANTHROPIC_MODEL` secret. Reuses the same `ANTHROPIC_API_KEY` secret as
`analyze-wardrobe-item` — no new secret needed.

## Deploy

```bash
supabase functions deploy rank-outfits --project-ref <your-project-ref>
```
