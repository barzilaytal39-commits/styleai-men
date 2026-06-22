# Edge Function: `analyze-wardrobe-item`

AI **proxy layer** for wardrobe image analysis (Phase 3B). Keeps the Anthropic
API key server-side — the browser never calls Anthropic and never sees the key.

- **Not wired into the UI yet.** This phase ships the proxy only.
- **No database writes.** It returns the analysis; persistence comes later.

---

## What it does

`POST` an image URL → Claude vision → structured JSON describing the item.

### Request body

```json
{
  "image_url": "https://<project>.supabase.co/storage/v1/object/public/wardrobe-items/<uid>/<id>.jpg",
  "item_id": "uuid-of-the-wardrobe-item",
  "user_id": "uuid-of-the-owner"
}
```

All three fields are required. `item_id` / `user_id` are used for log correlation
only (no DB access in this phase).

### Success response (`200`)

```json
{
  "item_id": "uuid-of-the-wardrobe-item",
  "analysis": {
    "category": "tops",
    "subcategory": "Shirt",
    "primary_color": "Navy",
    "secondary_color": "",
    "style": "smart-casual",
    "formality_level": 3,
    "season": "all-season",
    "material": "cotton",
    "pattern": "solid",
    "ai_notes": "A versatile button-down that pairs well with chinos or jeans.",
    "confidence": 0.86
  }
}
```

`category` is constrained to the app's five categories; `formality_level` is an
integer 1–5; `confidence` is 0.0–1.0. The shape mirrors the AI columns added to
`wardrobe_items` (`style`, `formality_level`, `season`, `material`, `pattern`,
`ai_analysis`, `ai_confidence`).

### Error responses

| Status | When                                                        |
| ------ | ----------------------------------------------------------- |
| `400`  | Body isn't valid JSON, or a required field is missing       |
| `405`  | Method other than `POST` (`OPTIONS` is handled for CORS)    |
| `415`  | Unsupported image format (e.g. AVIF/HEIC) — see below       |
| `422`  | Model refused, or returned no structured analysis           |
| `429`  | Anthropic rate limit                                         |
| `500`  | `ANTHROPIC_API_KEY` not set, or an unexpected error         |
| `502`  | Anthropic auth/API failure                                   |

### Supported image formats

Anthropic vision only accepts **JPEG, PNG, WebP, and GIF**. Before calling
Anthropic, the function infers the image type from the URL's file extension and a
`HEAD` request's `Content-Type`. If it positively identifies an unsupported type
(notably **AVIF** or **HEIC**), it short-circuits with:

```
HTTP 415
{ "error": "Unsupported image format. Please upload JPG, PNG, or WEBP." }
```

| Format | Media type    | Supported |
| ------ | ------------- | --------- |
| JPEG   | `image/jpeg`  | ✅        |
| PNG    | `image/png`   | ✅        |
| WebP   | `image/webp`  | ✅        |
| GIF    | `image/gif`   | ✅        |
| AVIF   | `image/avif`  | ❌ → 415  |
| HEIC/HEIF | `image/heic` / `image/heif` | ❌ → 415 |

If the type can't be determined at all (no extension and no `Content-Type`), the
function lets Anthropic make the final call rather than reject a possibly-valid
image.

---

## Implementation notes

- **Model:** defaults to `claude-opus-4-8` (Claude Opus 4.8, a valid active model)
  via `npm:@anthropic-ai/sdk` (official SDK). Configurable — see
  [Changing the model](#changing-the-model).
- **Structured output:** strict tool use with a forced `tool_choice`, so the
  response always conforms to the schema. Errors use the SDK's typed exception
  classes (`AuthenticationError`, `RateLimitError`, `APIError`).
- **Vision input:** the image is passed by **URL**, so the `wardrobe-items`
  bucket must be readable for the URL given. The app's bucket is public-read, so
  the public object URL works as-is.

---

## Set the Anthropic secret (required)

The function reads the key **only** from the Edge Function secret
`ANTHROPIC_API_KEY`. Never put this key in `.env.local` or any `VITE_` variable —
those ship to the browser bundle.

### Option A — Supabase CLI (recommended)

```bash
# from the project root, with the CLI linked to your project:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx

# verify it is registered (values are not shown)
supabase secrets list
```

### Option B — Supabase Dashboard

`Project Settings` → `Edge Functions` → `Secrets` → add
`ANTHROPIC_API_KEY` = your key → Save.

> Changing a secret takes effect on the next function invocation (redeploy not
> required), but redeploying is the safe way to be sure.

---

## Changing the model

The model is set by the `ANTHROPIC_MODEL` constant at the top of `index.ts`, which
reads the optional `ANTHROPIC_MODEL` Edge secret and falls back to
`claude-opus-4-8`. Two ways to change it:

```bash
# Option A — no code change: set the secret (takes effect next invocation)
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
```

Or edit the default string in `index.ts`:

```ts
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";
```

Use an exact model ID (e.g. `claude-opus-4-8`, `claude-sonnet-4-6`,
`claude-haiku-4-5`) — do not append date suffixes. The chosen model must support
vision and tool use.

## Deploy

```bash
supabase functions deploy analyze-wardrobe-item
```

### JWT verification

By default Supabase requires a valid user JWT to invoke the function (good — it
means only signed-in users can reach it). The frontend will later call it via
`supabase.functions.invoke('analyze-wardrobe-item', { body })`, which attaches
the user's JWT automatically.

To make this explicit, you can pin it in `supabase/config.toml`:

```toml
[functions.analyze-wardrobe-item]
verify_jwt = true
```

---

## Test locally / manually

```bash
# serve locally (loads secrets from supabase/.env or your shell)
supabase functions serve analyze-wardrobe-item --env-file supabase/.env

# in another terminal — replace <ANON_OR_USER_JWT> and the image URL
curl -i -X POST http://localhost:54321/functions/v1/analyze-wardrobe-item \
  -H "Authorization: Bearer <ANON_OR_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
        "image_url": "https://<project>.supabase.co/storage/v1/object/public/wardrobe-items/<uid>/<id>.jpg",
        "item_id": "00000000-0000-0000-0000-000000000000",
        "user_id": "00000000-0000-0000-0000-000000000000"
      }'
```

Logs (prefixed `[analyze-wardrobe-item]`) are visible in the serve terminal
locally, or via `supabase functions logs analyze-wardrobe-item` once deployed.
