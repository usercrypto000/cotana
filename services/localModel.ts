export type LocalSummaryInput = {
  system: string;
  user: string;
};

export type LocalSummaryOutput = {
  bullets: string[];
  model?: string;
  raw?: string;
  usedFallback: boolean;
};

function extractBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 8);
}

export async function summarizeWithLocalModel(
  input: LocalSummaryInput
): Promise<LocalSummaryOutput> {
  const endpoint = process.env.LOCAL_LLM_ENDPOINT ?? "http://127.0.0.1:11434/api/generate";
  const model = process.env.LOCAL_LLM_MODEL ?? "llama3.1";
  const prompt = `${input.system}\n\nUser: ${input.user}\n\nReturn 4-6 bullet points.`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
    });

    if (!res.ok) {
      return { bullets: [], usedFallback: true };
    }

    const data = (await res.json()) as { response?: string; model?: string };
    const raw = data?.response?.trim() ?? "";
    const bullets = extractBullets(raw);
    return { bullets, model: data.model ?? model, raw, usedFallback: bullets.length === 0 };
  } catch {
    return { bullets: [], usedFallback: true };
  }
}
