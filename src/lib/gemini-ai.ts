export const GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_AI_LABEL = "Gemini 3.5 Flash-Lite";
export const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type GeminiEnvelope = {
  modelVersion?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { code?: number; message?: string; status?: string };
};

function responseText(envelope: GeminiEnvelope) {
  return envelope.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

export async function generateGeminiJson(
  credential: string,
  prompt: string,
  schema: Record<string, unknown>,
  maxOutputTokens: number,
  fetcher: Fetcher = fetch,
) {
  const response = await fetcher(GEMINI_GENERATE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": credential,
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
      },
    }),
  });

  const envelope = await response.json().catch(() => ({})) as GeminiEnvelope;
  if (!response.ok) {
    const detail = envelope.error?.message?.trim();
    throw new Error(detail ? `Gemini request failed (${response.status}): ${detail}` : `Gemini request failed (${response.status}).`);
  }

  const text = responseText(envelope).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!text) throw new Error("Gemini returned no structured content.");

  try {
    return {
      value: JSON.parse(text) as Record<string, unknown>,
      model: GEMINI_AI_LABEL,
      modelVersion: envelope.modelVersion ?? GEMINI_MODEL,
    };
  } catch {
    throw new Error("Gemini returned invalid structured JSON.");
  }
}
