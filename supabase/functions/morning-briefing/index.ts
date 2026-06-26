// ============================================================
// Supabase Edge Function: morning-briefing
//
// Proactive daily styling briefing (Phase 7C). Takes the precomputed
// Smart Context (Phase 7B.1) and returns one confident, Hebrew daily
// recommendation. The browser never calls Anthropic; the key is read only
// from the ANTHROPIC_API_KEY Edge secret.
//
// User-facing text is Hebrew; item IDs / structured values stay English.
// Runtime: Deno (Supabase Edge Functions).
// ============================================================

import Anthropic from "npm:@anthropic-ai/sdk";

declare const Deno: { env: { get(key: string): string | undefined } };

const FN = "morning-briefing";
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

interface BriefingRequest {
  context?: Record<string, unknown> | null;
}

const BRIEFING_TOOL = {
  name: "morning_briefing",
  description: "Produce a proactive daily styling briefing for the user.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      greeting: { type: "string", description: "Short personal greeting (Hebrew)." },
      summary: { type: "string", description: "1-2 sentence daily summary (Hebrew)." },
      recommended_item_ids: {
        type: "array",
        items: { type: "string" },
        description: "IDs taken EXACTLY from context.wardrobe_items. Empty if none fit.",
      },
      fragrance_recommendation: { type: "string", description: "Fragrance advice (Hebrew) or empty." },
      watch_or_accessory_recommendation: {
        type: "string",
        description: "Watch/accessory suggestion (Hebrew) or empty.",
      },
      why_this_look: { type: "array", items: { type: "string" }, description: "Short Hebrew reasons." },
      rotation_note: { type: "string", description: "Hebrew note on rotation / reviving unworn items, or empty." },
      wardrobe_tip: { type: "string", description: "One Hebrew wardrobe tip, or empty." },
      shopping_gap_tip: { type: "string", description: "Hebrew shopping-gap tip ONLY if clearly useful, else empty." },
      confidence: { type: "number", description: "Overall confidence 0.0-1.0." },
    },
    required: [
      "greeting",
      "summary",
      "recommended_item_ids",
      "fragrance_recommendation",
      "watch_or_accessory_recommendation",
      "why_this_look",
      "rotation_note",
      "wardrobe_tip",
      "shopping_gap_tip",
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
    return json({ error: "Server is not configured for the morning briefing." }, 500);
  }

  let body: Partial<BriefingRequest>;
  try {
    body = (await req.json()) as Partial<BriefingRequest>;
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }
  if (!body.context || typeof body.context !== "object") {
    return json({ error: "context is required." }, 400);
  }

  console.log(`[${FN}] start model=${ANTHROPIC_MODEL}`);

  const client = new Anthropic({ apiKey });

  const prompt =
    "You are the user's personal men's stylist in the StyleAI Men app — you KNOW this person. " +
    "Proactively give ONE confident daily briefing (the user did not ask a question). Be direct, " +
    "practical, premium but never overdone.\n\n" +
    "Use the provided Smart Context ACTIVELY: weather, time_of_day + weekday (tone/formality), " +
    "style_profile (preferred style/fits/colors; prefer Smart Casual Premium and practical-but-" +
    "polished field+office looks when relevant), weekly_plan (if it has today's plan, build around " +
    "it), wear_history (avoid recently-worn/overused items; if a good item hasn't been worn in a " +
    "long time, suggest reviving it via rotation_note), wardrobe_health + shopping_gaps (only set " +
    "shopping_gap_tip when there is a clearly useful gap), and recent_fit_checks (avoid repeating " +
    "known issues).\n\n" +
    "HARD RULES: recommend ONLY items whose `id` is in context.wardrobe_items and copy those IDs " +
    "EXACTLY into recommended_item_ids. Never invent items. Keep it compact (it renders on a " +
    "dashboard). Explain briefly in why_this_look (weather/occasion/rotation/color/Style DNA/fit).\n\n" +
    "LANGUAGE: ALL user-facing text (greeting, summary, fragrance_recommendation, " +
    "watch_or_accessory_recommendation, why_this_look, rotation_note, wardrobe_tip, " +
    "shopping_gap_tip) in natural, masculine Hebrew. Keep recommended_item_ids and confidence as " +
    "structured values. Call the morning_briefing tool.\n\n" +
    `Smart context: ${JSON.stringify(body.context)}`;

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1600,
      tools: [BRIEFING_TOOL],
      tool_choice: { type: "tool", name: BRIEFING_TOOL.name },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    return handleAnthropicError(err);
  }

  if (response.stop_reason === "refusal") {
    console.error(`[${FN}] model refused.`);
    return json({ error: "The model declined to produce a briefing." }, 422);
  }

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    console.error(`[${FN}] no tool_use block. stop_reason=${response.stop_reason}`);
    return json({ error: "The model did not return a briefing." }, 502);
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
  return json({ error: "Unexpected error during the morning briefing." }, 500);
}
