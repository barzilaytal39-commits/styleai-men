# Edge Function: `fit-check`

AI Fit Check (Phase 4C). Evaluates a real outfit photo with the full StyleAI
context. The browser never calls Anthropic; the key is read only from the
`ANTHROPIC_API_KEY` Edge secret (reused from `analyze-wardrobe-item`).

## Request body

```json
{
  "photo_url": "https://<project>.supabase.co/storage/v1/object/public/outfit-photos/<uid>/fitcheck/<ts>.webp",
  "user_profile": { "preferred_style": "Smart Casual Premium" },
  "selected_outfit": { "items": [{ "slot": "top", "name": "...", "colors": ["Navy"] }] },
  "weather": { "temperature_c": 9, "condition": "Rain" },
  "occasion": "Office",
  "desired_style": "Smart Casual"
}
```

Only `photo_url` is required; everything else is optional context. When
`selected_outfit` is present, the model compares planned vs. actual and flags
mismatches (different shoes/colors, missing layer/accessory) in `recommendations`.
The photo must be a supported image format (JPEG/PNG/WebP/GIF) → otherwise `415`.

## Success response (`200`)

```json
{
  "overall_score": 8, "fit_score": 8, "style_score": 9, "color_score": 8,
  "occasion_score": 9, "weather_score": null,
  "strengths": ["..."], "issues": ["..."], "recommendations": ["..."],
  "item_recommendations": [{ "type": "shoes", "recommendation": "..." }],
  "fragrance_recommendation": "...", "final_verdict": "..."
}
```

Scores are integers 1–10; `weather_score` is `null` when no weather is sent.

## Errors

| Status | When |
| --- | --- |
| `400` | Bad JSON / missing `photo_url` |
| `405` | Non-POST (OPTIONS handled) |
| `415` | Unsupported image format |
| `422` | Model refused / no result |
| `429` | Anthropic rate limit |
| `500` | `ANTHROPIC_API_KEY` not set / unexpected |
| `502` | Anthropic auth/API failure |

The frontend keeps the uploaded photo and offers retry on any failure.

## Model & deploy

`claude-opus-4-8` (strict tool use, `npm:@anthropic-ai/sdk`); override via
`ANTHROPIC_MODEL`. No DB writes (the frontend persists to `fit_checks`).

```bash
supabase functions deploy fit-check --project-ref <your-project-ref>
```
