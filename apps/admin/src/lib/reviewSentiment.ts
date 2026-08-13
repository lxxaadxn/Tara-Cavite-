const NEGATIVE_PATTERNS =
  /\b(scam|worst|terrible|awful|disgusting|rude|dirty|never again|waste of money|rip-?off|0\/10)\b/i;

const ABUSIVE_PATTERNS = /\b(stupid|idiot|kill yourself|kys|hate you)\b/i;

function heuristicShow(text: string, rating?: number): boolean {
  const t = text.trim();
  if (!t) return false;
  if (rating != null && rating <= 2) return false;
  if (ABUSIVE_PATTERNS.test(t)) return false;
  if (rating != null && rating >= 4 && !NEGATIVE_PATTERNS.test(t)) return true;
  if (NEGATIVE_PATTERNS.test(t)) return false;
  return true;
}

async function openAiShouldShow(text: string, rating: number | undefined, apiKey: string): Promise<boolean | null> {
  const ratingLine = rating != null ? `Star rating (1-5): ${rating}.` : 'Star rating: unknown.';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You moderate travel destination reviews. Reply with JSON only: {"show":true|false} where show is false if the review is abusive, spam, overwhelmingly negative without constructive detail, or should be hidden from the public.',
          },
          {
            role: 'user',
            content: `${ratingLine}\nReview text:\n${text.slice(0, 4000)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { show?: boolean };
      return typeof parsed.show === 'boolean' ? parsed.show : null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export type ReviewVisibilityInput = {
  text: string;
  rating?: number;
};

export async function shouldPublishReview(input: ReviewVisibilityInput): Promise<boolean> {
  const text = input.text ?? '';
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (key && text.trim().length > 0) {
    const ai = await openAiShouldShow(text, input.rating, key);
    if (ai != null) return ai;
  }
  return heuristicShow(text, input.rating);
}
