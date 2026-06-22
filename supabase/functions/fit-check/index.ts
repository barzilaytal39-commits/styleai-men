// ============================================================
// Supabase Edge Function: fit-check
//
// AI Fit Check (Phase 4C). Evaluates the user's real outfit photo using
// the full StyleAI context (Style DNA, weather, the planned outfit,
// occasion/style). The browser never calls Anthropic; the key is read
// only from the ANTHROPIC_API_KEY Edge secret.
//
// Runtime: Deno (Supabase Edge Functions).
// ============================================================

import Anthropic from "npm:@anthropic-ai/sdk";

declare const Deno: { env: { get(key: string): string | undefined } };

const FN = "fit-check";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- image format guard (same approach as analyze-wardrobe-item) ----
const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_TO_MEDIA: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", avif: "image/avif", heic: "image/heic", heif: "image/heif",
};

async function inferMediaTypes(url: string): Promise<Set<string>> {
  const types = new Set<string>();
  try {
    const path = new URL(url).pathname.toLowerCase();
    const ext = path.includes(".") ? path.split(".").pop()! : "";
    if (ext && EXT_TO_MEDIA[ext]) types.add(EXT_TO_MEDIA[ext]);
  } catch { /* ignore */ }
  try {
    const head = await fetch(url, { method: "HEAD" });
    const ct = head.headers.get("content-type");
    if (ct) {
      const n = ct.split(";")[0].trim().toLowerCase();
      if (n.startsWith("image/")) types.add(n);
    }
  } catch { /* ignore */ }
  return types;
}

interface FitCheckRequest {
  photo_url: string;
  user_profile?: Record<string, unknown> | null;
  selected_outfit?: Record<string, unknown> | null;
  weather?: Record<string, unknown> | null;
  occasion?: string | null;
  desired_style?: string | null;
}

const FIT_CHECK_TOOL = {
  name: "record_fit_check",
  description: "Record a structured professional fit check of the outfit in the photo.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      overall_score: { type: "integer", description: "Overall 1-10." },
      fit_score: { type: "integer", description: "Fit (shirt/pants/sleeve/length/silhouette/proportions), 1-10." },
      style_score: { type: "integer", description: "Cohesion + style, 1-10." },
      color_score: { type: "integer", description: "Color harmony, 1-10." },
      occasion_score: { type: "integer", description: "Occasion/formality suitability, 1-10." },
      weather_score: { type: ["integer", "null"], description: "1-10 if weather provided, else null." },
      strengths: { type: "array", items: { type: "string" }, description: "What works well." },
      issues: { type: "array", items: { type: "string" }, description: "Problems to fix." },
      recommendations: {
        type: "array",
        items: { type: "string" },
        description: "Actionable fixes; if a planned outfit was provided, include any mismatches (different shoes/colors, missing layer/accessory).",
      },
      item_recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", description: "e.g. shoes, belt, watch, layer, top, bottom." },
            recommendation: { type: "string" },
          },
          required: ["type", "recommendation"],
          additionalProperties: false,
        },
      },
      fragrance_recommendation: { type: "string", description: "A fitting fragrance direction." },
      final_verdict: { type: "string", description: "1-2 sentence overall verdict." },
    },
    required: [
      "overall_score", "fit_score", "style_score", "color_score", "occasion_score",
      "weather_score", "strengths", "issues", "recommendations", "item_recommendations",
      "fragrance_recommendation", "final_verdict",
    ],
    additionalProperties: false,
  },
} as const;

Deno.serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed. Use POST." }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error(`[${FN}] ANTHROPIC_API_KEY is not set.`);
    return json({ error: "Server is not configured for Fit Check." }, 500);
  }

  let body: Partial<FitCheckRequest>;
  try {
    body = (await req.json()) as Partial<FitCheckRequest>;
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  if (typeof body.photo_url !== "string" || body.photo_url.length === 0) {
    return json({ error: "photo_url is required." }, 400);
  }

  // Format guard → 415.
  const inferred = await inferMediaTypes(body.photo_url);
  const hasSupported = [...inferred].some((t) => SUPPORTED_MEDIA_TYPES.includes(t));
  const hasUnsupported = [...inferred].some((t) => !SUPPORTED_MEDIA_TYPES.includes(t));
  if (inferred.size > 0 && !hasSupported && hasUnsupported) {
    console.warn(`[${FN}] unsupported image format detected=${[...inferred].join(",")}`);
    return json(
      { error: "Unsupported image format. Please upload JPG, PNG, or WEBP." },
      415,
    );
  }

  console.log(`[${FN}] start occasion=${body.occasion ?? "-"} model=${ANTHROPIC_MODEL}`);

  const client = new Anthropic({ apiKey });

  const hasWeather = !!body.weather;
  const hasOutfit = !!body.selected_outfit;

  const prompt =
    "You are an elite personal stylist doing a professional FIT CHECK on the man in this photo. " +
    "Evaluate FIT (shirt fit, pants fit, sleeve length, pant length, silhouette balance, proportions), " +
    "STYLE (cohesion, color harmony, formality consistency, premium appearance, effortless appearance), " +
    "and PRACTICALITY (weather suitability, occasion suitability, footwear suitability). " +
    "Be specific and honest but constructive. " +
    (hasWeather
      ? "Weather context IS provided — judge weather suitability and set weather_score 1-10. "
      : "No weather provided — set weather_score to null. ") +
    (hasOutfit
      ? "A PLANNED outfit is provided. Compare it to what the person is actually wearing in the photo and call out probable mismatches (different shoes, different colors, a missing layer, a missing accessory) in recommendations. "
      : "No planned outfit provided — evaluate the look as shown. ") +
    "Treat weather, occasion, and formality as hard constraints. " +
    "LANGUAGE: return all user-facing text in natural, masculine Hebrew — `strengths`, `issues`, " +
    "`recommendations`, each `item_recommendations.recommendation`, `fragrance_recommendation`, and " +
    "`final_verdict`. Keep structured/enum-like values in English: every numeric score and each " +
    "`item_recommendations.type` (e.g. shoes, belt, watch, layer). " +
    "Call the record_fit_check tool.\n\n" +
    `Occasion: ${JSON.stringify(body.occasion ?? null)}\n` +
    `Desired style: ${JSON.stringify(body.desired_style ?? null)}\n` +
    `Weather: ${JSON.stringify(body.weather ?? null)}\n` +
    `User profile: ${JSON.stringify(body.user_profile ?? null)}\n` +
    `Planned outfit: ${JSON.stringify(body.selected_outfit ?? null)}`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      tools: [FIT_CHECK_TOOL],
      tool_choice: { type: "tool", name: FIT_CHECK_TOOL.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: body.photo_url } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
  } catch (err) {
    return handleAnthropicError(err);
  }

  if (response.stop_reason === "refusal") {
    console.error(`[${FN}] model refused.`);
    return json({ error: "The model declined to analyze this photo." }, 422);
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    console.error(`[${FN}] no tool_use block. stop_reason=${response.stop_reason}`);
    return json({ error: "The model did not return a fit check." }, 502);
  }

  console.log(
    `[${FN}] success duration_ms=${Date.now() - startedAt} ` +
      `tokens_in=${response.usage.input_tokens} tokens_out=${response.usage.output_tokens}`,
  );

  return json(toolUse.input);
});

function handleAnthropicError(err: unknown): Response {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error(`[${FN}] Anthropic auth failed.`);
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
  return json({ error: "Unexpected error during fit check." }, 500);
}
