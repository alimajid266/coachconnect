export const OPENROUTER_FREE_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

export const OPENROUTER_AI_LABEL = "OpenRouter free models";

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type OpenRouterEnvelope = {
  model?: string;
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  error?: { code?: string | number; message?: string };
};

function contentText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part: { text?: string } | null) => part?.text ?? "").join("");
  return "";
}

export async function generateOpenRouterJson(
  apiKey: string,
  prompt: string,
  schemaName: string,
  schema: Record<string, unknown>,
  maxTokens: number,
  fetcher: Fetcher = fetch,
) {
  let lastError = "No free model was available.";
  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const response = await fetcher("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "HTTP-Referer": "https://coachconnect-sigma.vercel.app", "X-Title": "CoachConnect Demo" },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: maxTokens, response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } } }),
      });
      const envelope = await response.json().catch(() => ({})) as OpenRouterEnvelope;
      if (!response.ok) { lastError = `OpenRouter ${model} failed (${response.status}).`; continue; }
      const text = contentText(envelope.choices?.[0]?.message?.content);
      if (!text) { lastError = `OpenRouter ${model} returned no content.`; continue; }
      const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      return { value: JSON.parse(clean) as Record<string, unknown>, model: envelope.model ?? model };
    } catch (error) {
      lastError = error instanceof Error ? error.message : `OpenRouter ${model} failed.`;
    }
  }
  throw new Error(lastError);
}
