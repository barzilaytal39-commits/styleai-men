// ============================================================
// Supabase Edge Function: analyze-wardrobe-item
//
// AI PROXY LAYER ONLY (Phase 3B).
//
// Purpose: keep the Anthropic API key server-side. The browser must
// NEVER call Anthropic directly and must NEVER see the key. This
// function is the only place the key is read, exclusively from the
// Edge Function secret `ANTHROPIC_API_KEY` (never a VITE_ var).
//
// It accepts { image_url, item_id, user_id }, calls Claude vision, and
// returns a structured JSON analysis. It does NOT write to the database
// and is NOT yet wired into the UI — that is a later phase.
//
// Runtime: Deno (Supabase Edge Functions).
// ============================================================

import Anthropic from "npm:@anthropic-ai/sdk";

// Deno is provided by the Supabase Edge runtime.
declare const Deno: { env: { get(key: string): string | undefined } };

const FN = "analyze-wardrobe-item";

// ------------------------------------------------------------
// Model selection.
//
// Default is `claude-opus-4-8` (Claude Opus 4.8) — a valid, active
// Anthropic model ID. Model IDs are plain strings sent to the API and
// are not tied to the SDK version.
//
// To change the model WITHOUT editing code, set the `ANTHROPIC_MODEL`
// Edge Function secret:
//     supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
// Otherwise, edit the default string below. See README → "Changing the
// model" for valid IDs.
// ------------------------------------------------------------
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

// ------------------------------------------------------------
// CORS — allows the SPA to invoke this function from the browser.
// ------------------------------------------------------------
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ------------------------------------------------------------
// Expected request body.
// ------------------------------------------------------------
interface AnalyzeRequest {
  image_url: string;
  item_id: string;
  user_id: string;
}

// Shape Claude is forced to return via strict tool use. Mirrors the
// AI-analysis columns on wardrobe_items (style, formality_level,
// season, material, pattern, ai_analysis, ai_confidence).
interface WardrobeAnalysis {
  category: string;
  subcategory: string;
  primary_color: string;
  secondary_color: string;
  style: string;
  formality_level: number;
  season: string;
  material: string;
  pattern: string;
  ai_notes: string;
  confidence: number;
}

// ------------------------------------------------------------
// Tool definition — strict schema guarantees a conforming object.
// ------------------------------------------------------------
const ANALYSIS_TOOL = {
  name: "record_wardrobe_analysis",
  description:
    "Record the structured visual analysis of a single men's clothing item.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["tops", "bottoms", "outerwear", "shoes", "accessories"],
        description: "The single best-fitting top-level category.",
      },
      subcategory: {
        type: "string",
        description:
          "Specific type, e.g. 'T-Shirt', 'Jeans', 'Sneakers', 'Watch'. Empty string if unsure.",
      },
      primary_color: {
        type: "string",
        description: "Dominant color in plain English, e.g. 'Navy'.",
      },
      secondary_color: {
        type: "string",
        description: "Secondary color, or empty string if none.",
      },
      style: {
        type: "string",
        description:
          "Overall style, e.g. 'casual', 'smart-casual', 'formal', 'streetwear', 'athletic'.",
      },
      formality_level: {
        type: "integer",
        enum: [1, 2, 3, 4, 5],
        description: "1 = very casual, 3 = smart-casual, 5 = formal.",
      },
      season: {
        type: "string",
        description:
          "Best-fitting season: 'spring', 'summer', 'fall', 'winter', or 'all-season'.",
      },
      material: {
        type: "string",
        description:
          "Best guess of the primary material, e.g. 'cotton', 'denim', 'leather', 'wool'. Empty string if unsure.",
      },
      pattern: {
        type: "string",
        description:
          "Pattern, e.g. 'solid', 'striped', 'checked', 'plaid', 'floral', 'graphic'.",
      },
      ai_notes: {
        type: "string",
        description: "One or two short sentences of styling notes.",
      },
      confidence: {
        type: "number",
        description: "Overall confidence in this analysis, from 0.0 to 1.0.",
      },
    },
    required: [
      "category",
      "subcategory",
      "primary_color",
      "secondary_color",
      "style",
      "formality_level",
      "season",
      "material",
      "pattern",
      "ai_notes",
      "confidence",
    ],
    additionalProperties: false,
  },
} as const;

const PROMPT =
  "You are a men's fashion cataloguer. Analyze the single clothing item in this image " +
  "and call the `record_wardrobe_analysis` tool with your best assessment of each field. " +
  "Judge only what is visible. If a field is genuinely unclear, use an empty string (or your " +
  "lowest-confidence best guess for the enum fields) and lower the overall confidence accordingly. " +
  "LANGUAGE: write `ai_notes` in natural, masculine Hebrew (user-facing). Keep ALL other field " +
  "values in English as enum-like values (category, subcategory, primary_color, secondary_color, " +
  "style, season, material, pattern).";

// ------------------------------------------------------------
// Image format validation.
//
// Anthropic vision only accepts JPEG, PNG, WebP, and GIF. Anything else
// (notably AVIF / HEIC) is rejected by the API with a 400. We catch that
// here BEFORE calling Anthropic and return a clear 415 instead.
// ------------------------------------------------------------
const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const EXT_TO_MEDIA: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  // Known-unsupported — mapped so we can identify and reject them clearly.
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
};

// Returns the set of media types we can infer from the URL: a Content-Type
// header (via HEAD) and/or the file extension. Empty set = undetermined.
async function inferMediaTypes(imageUrl: string): Promise<Set<string>> {
  const types = new Set<string>();

  // From the file extension (strip query string first).
  try {
    const path = new URL(imageUrl).pathname.toLowerCase();
    const ext = path.includes(".") ? path.split(".").pop()! : "";
    if (ext && EXT_TO_MEDIA[ext]) types.add(EXT_TO_MEDIA[ext]);
  } catch {
    // malformed URL — leave to the header probe / Anthropic
  }

  // From a HEAD request's Content-Type (authoritative when present).
  try {
    const head = await fetch(imageUrl, { method: "HEAD" });
    const ct = head.headers.get("content-type");
    if (ct) {
      const normalized = ct.split(";")[0].trim().toLowerCase();
      if (normalized.startsWith("image/")) types.add(normalized);
    }
  } catch {
    // network/HEAD not allowed — fall back to extension only
  }

  return types;
}

// ------------------------------------------------------------
// Handler
// ------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();

  // Preflight.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.warn(`[${FN}] rejected ${req.method} (only POST allowed)`);
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  // --- Secret (server-side only) ---
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error(
      `[${FN}] ANTHROPIC_API_KEY is not set. Configure it with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`,
    );
    return json(
      { error: "Server is not configured for AI analysis." },
      500,
    );
  }

  // --- Parse + validate body ---
  let body: Partial<AnalyzeRequest>;
  try {
    body = (await req.json()) as Partial<AnalyzeRequest>;
  } catch {
    console.warn(`[${FN}] invalid JSON body`);
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const { image_url, item_id, user_id } = body;
  const missing = (["image_url", "item_id", "user_id"] as const).filter(
    (k) => typeof body[k] !== "string" || (body[k] as string).length === 0,
  );
  if (missing.length > 0) {
    console.warn(`[${FN}] missing/invalid fields: ${missing.join(", ")}`);
    return json(
      { error: `Missing or invalid field(s): ${missing.join(", ")}` },
      400,
    );
  }

  console.log(
    `[${FN}] start item_id=${item_id} user_id=${user_id} model=${ANTHROPIC_MODEL}`,
  );

  // --- Validate image format BEFORE calling Anthropic ---
  // Anthropic vision rejects AVIF/HEIC/etc. with a 400; catch it here.
  const inferred = await inferMediaTypes(image_url as string);
  const hasSupported = [...inferred].some((t) =>
    SUPPORTED_MEDIA_TYPES.includes(t)
  );
  const hasUnsupported = [...inferred].some((t) =>
    !SUPPORTED_MEDIA_TYPES.includes(t)
  );
  // Reject when we positively identified a type and none are supported
  // (e.g. AVIF). When the type is undetermined, let Anthropic decide.
  if (inferred.size > 0 && !hasSupported && hasUnsupported) {
    console.warn(
      `[${FN}] unsupported image format item_id=${item_id} detected=${[...inferred].join(",")}`,
    );
    return json(
      { error: "Unsupported image format. Please upload JPG, PNG, or WEBP." },
      415,
    );
  }

  const client = new Anthropic({ apiKey });

  // --- Call Claude vision ---
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: image_url as string } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
  } catch (err) {
    return handleAnthropicError(err);
  }

  // --- Refusal guard ---
  if (response.stop_reason === "refusal") {
    console.error(
      `[${FN}] model refused. details=${JSON.stringify(response.stop_details ?? null)}`,
    );
    return json({ error: "The model declined to analyze this image." }, 422);
  }

  // --- Extract the forced tool call ---
  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    console.error(
      `[${FN}] no tool_use block in response. stop_reason=${response.stop_reason}`,
    );
    return json(
      { error: "The model did not return a structured analysis." },
      502,
    );
  }

  const analysis = toolUse.input as WardrobeAnalysis;

  const durationMs = Date.now() - startedAt;
  console.log(
    `[${FN}] success item_id=${item_id} category=${analysis.category} ` +
      `confidence=${analysis.confidence} duration_ms=${durationMs} ` +
      `tokens_in=${response.usage.input_tokens} tokens_out=${response.usage.output_tokens}`,
  );

  // Echo item_id so the caller can correlate. No DB writes here — this
  // is the proxy layer only; persistence happens in a later phase.
  return json({ item_id, analysis });
});

// ------------------------------------------------------------
// Maps Anthropic SDK errors to HTTP responses with clear logs.
// ------------------------------------------------------------
function handleAnthropicError(err: unknown): Response {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error(`[${FN}] Anthropic auth failed — check ANTHROPIC_API_KEY.`);
    return json({ error: "AI provider authentication failed." }, 502);
  }
  if (err instanceof Anthropic.RateLimitError) {
    console.error(`[${FN}] Anthropic rate limited.`);
    return json({ error: "AI provider is rate limited. Try again shortly." }, 429);
  }
  if (err instanceof Anthropic.APIError) {
    console.error(`[${FN}] Anthropic API error status=${err.status}: ${err.message}`);
    return json({ error: "AI provider request failed." }, 502);
  }
  console.error(`[${FN}] unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  return json({ error: "Unexpected error during analysis." }, 500);
}
