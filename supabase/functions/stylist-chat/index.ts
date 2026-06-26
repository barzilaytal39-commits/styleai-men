// ============================================================
// Supabase Edge Function: stylist-chat
//
// Personal-stylist chat (Phase 7A). Answers a natural-language styling
// question using the user's compact, non-sensitive context (Style DNA,
// weather, wardrobe metadata, recent outfit/fit-check summaries, today's
// plan). The browser never calls Anthropic; the key is read only from the
// ANTHROPIC_API_KEY Edge secret.
//
// Output is Hebrew (user-facing); item IDs / structured values stay English.
// Runtime: Deno (Supabase Edge Functions).
// ============================================================

import Anthropic from "npm:@anthropic-ai/sdk";

declare const Deno: { env: { get(key: string): string | undefined } };

const FN = "stylist-chat";
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

interface StylistRequest {
  message: string;
  // temporal (Phase 7B.1 Smart Context)
  weekday?: string | null;
  season?: string | null;
  hour?: number | null;
  time_of_day?: string | null;
  // who / preferences / environment
  user?: Record<string, unknown> | null;
  style_profile?: Record<string, unknown> | null;
  style_memory?: Record<string, unknown> | null;
  weather?: Record<string, unknown> | null;
  // wardrobe
  wardrobe_summary?: Record<string, unknown> | null;
  wardrobe_health?: Record<string, unknown> | null;
  shopping_gaps?: unknown[];
  wardrobe_items?: unknown[];
  wear_history?: Record<string, unknown> | null;
  // activity
  recent_outfits?: unknown[];
  recent_fit_checks?: unknown[];
  weekly_plan?: unknown | null;
}

const STYLIST_TOOL = {
  name: "stylist_answer",
  description: "Answer the user's styling question with structured advice.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      answer: { type: "string", description: "Conversational answer (Hebrew)." },
      recommended_item_ids: {
        type: "array",
        items: { type: "string" },
        description:
          "IDs taken EXACTLY from the provided wardrobe_items. Empty if none fit.",
      },
      fragrance_recommendation: {
        type: "string",
        description: "Fragrance advice in Hebrew, or empty string if not relevant.",
      },
      styling_tips: { type: "array", items: { type: "string" }, description: "Short Hebrew tips." },
      avoid: { type: "array", items: { type: "string" }, description: "What to avoid, in Hebrew." },
      confidence: { type: "number", description: "Overall confidence 0.0-1.0." },
    },
    required: [
      "answer",
      "recommended_item_ids",
      "fragrance_recommendation",
      "styling_tips",
      "avoid",
      "confidence",
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
    return json({ error: "Server is not configured for the stylist chat." }, 500);
  }

  let body: Partial<StylistRequest>;
  try {
    body = (await req.json()) as Partial<StylistRequest>;
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }
  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return json({ error: "message is required." }, 400);
  }

  const wardrobe = Array.isArray(body.wardrobe_items) ? body.wardrobe_items : [];
  console.log(`[${FN}] start items=${wardrobe.length} model=${ANTHROPIC_MODEL}`);

  const client = new Anthropic({ apiKey });

  const prompt =
    "You are the user's personal men's stylist in the StyleAI Men app — you KNOW this " +
    "person. Be direct, practical, confident, and premium but never overdone. Answer " +
    "using ONLY the provided context.\n\n" +
    "HARD RULES:\n" +
    "- Recommend ONLY items whose `id` appears in `wardrobe_items`, and copy those IDs into " +
    "`recommended_item_ids` EXACTLY as given. Never invent items or IDs. If you can't assemble " +
    "enough from the wardrobe, say briefly what's missing.\n" +
    "- Respect `weather` and practicality (rain → closed/water-resistant shoes + a layer; heat → " +
    "lighter pieces). Respect the occasion if the user states one.\n\n" +
    "USE THE CONTEXT ACTIVELY:\n" +
    "- `time_of_day` + `weekday`: tailor tone and formality (e.g. a weekday morning leans " +
    "office-ready; evening/weekend can relax).\n" +
    "- `style_profile`: honor preferred style, fits, colors, and the wants (premium/effortless/" +
    "head-turning). Prefer 'Smart Casual Premium' and practical-but-polished looks for field + " +
    "office days when relevant.\n" +
    "- `wear_history`: avoid recently-worn or overused items when reasonable; when an item hasn't " +
    "been worn in a long time and still fits the brief, suggest bringing it back (mention it).\n" +
    "- `recent_outfits`: don't just repeat them — add variety.\n" +
    "- `style_memory`: learned preferences over time — lean into `favorite_*` and " +
    "`learned_preferences`, respect `learned_avoids`, and weight them more as `confidence` " +
    "rises (but never override weather/occasion/formality).\n" +
    "- `recent_fit_checks`: avoid repeating known issues raised there.\n" +
    "- `weekly_plan`: use it when the question is about today / tomorrow / this week.\n" +
    "- `shopping_gaps` + `wardrobe_health`: bring these up ONLY when the user asks about buying, " +
    "what's missing, or improving the wardrobe — or when a gap clearly blocks a good answer. " +
    "Don't push shopping otherwise.\n" +
    "- Always EXPLAIN briefly why a look works, drawing on the relevant reasons: weather, occasion, " +
    "rotation, color harmony, Style DNA, and fit/practicality.\n" +
    "- Include fragrance advice when relevant.\n" +
    "- If the question is unrelated to style/clothing/grooming, answer briefly and steer back to " +
    "styling.\n\n" +
    "LANGUAGE: return ALL user-facing text (`answer`, `fragrance_recommendation`, `styling_tips`, " +
    "`avoid`) in natural, masculine Hebrew. Keep `recommended_item_ids` and `confidence` as " +
    "structured values (English ids / number). Call the stylist_answer tool.\n\n" +
    `User message: ${JSON.stringify(body.message)}\n` +
    `Now: ${JSON.stringify({
      weekday: body.weekday ?? null,
      season: body.season ?? null,
      hour: body.hour ?? null,
      time_of_day: body.time_of_day ?? null,
    })}\n` +
    `User: ${JSON.stringify(body.user ?? null)}\n` +
    `Style DNA: ${JSON.stringify(body.style_profile ?? null)}\n` +
    `Style memory (learned): ${JSON.stringify(body.style_memory ?? null)}\n` +
    `Weather: ${JSON.stringify(body.weather ?? null)}\n` +
    `Wardrobe summary: ${JSON.stringify(body.wardrobe_summary ?? null)}\n` +
    `Wardrobe health: ${JSON.stringify(body.wardrobe_health ?? null)}\n` +
    `Shopping gaps: ${JSON.stringify(body.shopping_gaps ?? [])}\n` +
    `Wear history: ${JSON.stringify(body.wear_history ?? null)}\n` +
    `Wardrobe items: ${JSON.stringify(wardrobe)}\n` +
    `Recent outfits: ${JSON.stringify(body.recent_outfits ?? [])}\n` +
    `Recent fit checks: ${JSON.stringify(body.recent_fit_checks ?? [])}\n` +
    `Today's plan: ${JSON.stringify(body.weekly_plan ?? null)}`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1600,
      tools: [STYLIST_TOOL],
      tool_choice: { type: "tool", name: STYLIST_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    return handleAnthropicError(err);
  }

  if (response.stop_reason === "refusal") {
    console.error(`[${FN}] model refused.`);
    return json({ error: "The model declined to answer." }, 422);
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    console.error(`[${FN}] no tool_use block. stop_reason=${response.stop_reason}`);
    return json({ error: "The model did not return an answer." }, 502);
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
  return json({ error: "Unexpected error during the stylist chat." }, 500);
}
