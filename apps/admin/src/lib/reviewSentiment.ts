import { kiraChatJson } from './kiraAi';

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

async function kiraShouldShow(text: string, rating: number | undefined): Promise<boolean | null> {
  const ratingLine = rating != null ? `Star rating (1-5): ${rating}.` : 'Star rating: unknown.';
  try {
    const parsed = await kiraChatJson<{ show?: boolean }>({
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
    });
    return typeof parsed?.show === 'boolean' ? parsed.show : null;
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
  if (text.trim().length > 0) {
    const ai = await kiraShouldShow(text, input.rating);
    if (ai != null) return ai;
  }
  return heuristicShow(text, input.rating);
}
