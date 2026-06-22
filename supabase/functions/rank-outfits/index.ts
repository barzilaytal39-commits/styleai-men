// ============================================================
// Supabase Edge Function: rank-outfits
//
// AI RANKING LAYER (Phase 3E).
//
// The rule engine (client-side) pre-selects candidate outfits; this
// function only RANKS and EXPLAINS those candidates. The AI never sees
// or picks from the full wardrobe — only the structured candidates sent
// to it. The Anthropic key is read exclusively from the Edge secret
// ANTHROPIC_API_KEY (never a VITE_ var); the browser never calls
// Anthropic directly.
//
// Runtime: Deno (Supabase Edge Functions).
// ============================================================

import Anthropic from "npm:@anthropic-ai/sdk";

// Deno is provided by the Supabase Edge runtime.
declare const Deno: { env: { get(key: string): string | undefined } };

const FN = "rank-outfits";

// Model is overridable via the ANTHROPIC_MODEL secret (see analyze-wardrobe-item).
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

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

// ---- request shapes (only structured, non-sensitive data) ----
interface CandidateItem {
  slot: string;
  name: string;
  category: string;
  subcategory: string | null;
  colors: string[];
  style: string | null;
  formality_level: number | null;
  material: string | null;
  pattern: string | null;
  last_worn_at: string | null;
}
interface Candidate {
  candidate_id: string;
  rule_score: number;
  rule_explanation: string;
  items: CandidateItem[];
}
interface RankRequest {
  user_profile?: Record<string, unknown> | null;
  weather?: Record<string, unknown> | null;
  brief: {
    occasion: string;
    location_type: string;
    desired_style: string;
    formality_level: number;
  };
  candidate_outfits: Candidate[];
}

// ---- strict tool: guarantees the response shape ----
const RANK_TOOL = {
  name: "rank_outfits",
  description:
    "Rank the candidate outfits best-to-worst for the brief and score each one.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      ranked_candidate_ids: {
        type: "array",
        items: { type: "string" },
        description:
          "All candidate_ids, ordered best-first. Must contain exactly the candidate_ids provided.",
      },
      rankings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            candidate_id: { type: "string" },
            ai_score: { type: "integer", description: "Overall 1-10." },
            occasion_score: { type: "integer", description: "Fit for the occasion, 1-10." },
            color_score: { type: "integer", description: "Color harmony, 1-10." },
            style_score: { type: "integer", description: "Match to desired style, 1-10." },
            premium_score: { type: "integer", description: "How elevated/premium it reads, 1-10." },
            effortless_score: { type: "integer", description: "How effortless/cohesive it reads, 1-10." },
            weather_score: {
              type: ["integer", "null"],
              description: "1-10 if weather data was provided; otherwise null.",
            },
            explanation: { type: "string", description: "1-2 sentences on why it ranks here." },
            styling_tip: { type: "string", description: "One short actionable styling tip." },
          },
          required: [
            "candidate_id",
            "ai_score",
            "occasion_score",
            "color_score",
            "style_score",
            "premium_score",
            "effortless_score",
            "weather_score",
            "explanation",
            "styling_tip",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["ranked_candidate_ids", "rankings"],
    additionalProperties: false,
  },
} as const;

Deno.serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    console.warn(`[${FN}] rejected ${req.method}`);
    return json({ error: "Method not allowed. Use POST." }, 405);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error(`[${FN}] ANTHROPIC_API_KEY is not set.`);
    return json({ error: "Server is not configured for AI ranking." }, 500);
  }

  let body: Partial<RankRequest>;
  try {
    body = (await req.json()) as Partial<RankRequest>;
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  if (!body.brief || typeof body.brief !== "object") {
    return json({ error: "Missing 'brief'." }, 400);
  }
  if (!Array.isArray(body.candidate_outfits) || body.candidate_outfits.length === 0) {
    return json({ error: "Missing or empty 'candidate_outfits'." }, 400);
  }

  console.log(
    `[${FN}] start occasion=${body.brief.occasion} candidates=${body.candidate_outfits.length} model=${ANTHROPIC_MODEL}`,
  );

  const client = new Anthropic({ apiKey });

  const hasWeather = !!body.weather;
  const weatherInstruction = hasWeather
    ? "Weather IS provided: factor temperature, condition, rain, and wind into the ranking " +
      "(season suitability, layering, shoe choice, materials) and set weather_score 1-10 for " +
      "every candidate. Treat weather, occasion, and formality as hard constraints — never " +
      "favor a preference that ignores them."
    : "Weather data is NOT provided, so weather_score MUST be null for every candidate.";

  const prompt =
    "You are a senior men's fashion stylist. You are given a style brief and a list of " +
    "candidate outfits that a rule engine already pre-selected from the user's wardrobe. " +
    "Rank ALL candidates best-to-worst for the brief and score each using the data provided " +
    "only — do not invent items. Reward color harmony, occasion/formality fit, the desired " +
    "style, a premium and effortless feel, and good rotation (favor items not worn recently). " +
    "The user profile expresses preferences only and must NOT override weather, occasion, or " +
    "formality. " +
    weatherInstruction +
    " LANGUAGE: return all user-facing text (`explanation`, `styling_tip`) in natural, masculine " +
    "Hebrew. Keep all structured/enum-like values in English: `ranked_candidate_ids`, " +
    "`candidate_id`, and every numeric score. " +
    " Call the rank_outfits tool.\n\n" +
    `Brief: ${JSON.stringify(body.brief)}\n` +
    `Weather: ${JSON.stringify(body.weather ?? null)}\n` +
    `User profile: ${JSON.stringify(body.user_profile ?? null)}\n` +
    `Candidate outfits: ${JSON.stringify(body.candidate_outfits)}`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      tools: [RANK_TOOL],
      tool_choice: { type: "tool", name: RANK_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    return handleAnthropicError(err);
  }

  if (response.stop_reason === "refusal") {
    console.error(`[${FN}] model refused.`);
    return json({ error: "The model declined to rank these outfits." }, 422);
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    console.error(`[${FN}] no tool_use block. stop_reason=${response.stop_reason}`);
    return json({ error: "The model did not return a ranking." }, 502);
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[${FN}] success candidates=${body.candidate_outfits.length} duration_ms=${durationMs} ` +
      `tokens_in=${response.usage.input_tokens} tokens_out=${response.usage.output_tokens}`,
  );

  return json(toolUse.input);
});

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
  return json({ error: "Unexpected error during ranking." }, 500);
}
