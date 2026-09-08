import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Client for Kira AI (https://kiraai.vn).
 *
 * Every call goes through the `kira-ai` Edge Function so `KIRA_API_KEY` stays a
 * server secret. Deploy it with `npx supabase functions deploy kira-ai` and set
 * the key with `npx supabase secrets set KIRA_API_KEY=...`.
 */

export const KIRA_CHAT_MODEL = 'glm-5.3-flash-free';
export const KIRA_IMAGE_MODEL = 'kira-3.0-image';
export const KIRA_SPEECH_MODEL = 'kira-3.0-flash-tts';

const KIRA_FN_HINT =
  'Kira AI is unavailable. Deploy the kira-ai Edge Function and set the KIRA_API_KEY secret.';

export type KiraChatRole = 'system' | 'user' | 'assistant';

export type KiraChatMessage = {
  role: KiraChatRole;
  content: string;
};

/** OpenAI-compatible chat payload. Anything Kira accepts can be passed through. */
export type KiraChatPayload = {
  messages: KiraChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  [key: string]: unknown;
};

export type KiraChatResponse = {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { role?: string; content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export type KiraAspectRatio = '1:1' | '16:9' | '9:16' | '4:3';

export type KiraImageResult = {
  b64Json: string | null;
  url: string | null;
  /** Ready to drop into an `<img src>`. */
  dataUrl: string | null;
};

export type KiraSpeechResult = {
  audioBase64: string;
  contentType: string;
  /** Ready to drop into an `<audio src>`. */
  dataUrl: string;
};

type KiraAction = 'chat' | 'image' | 'speech';

async function readFunctionError(error: unknown, data: unknown): Promise<string> {
  const payload = data && typeof data === 'object' ? (data as { error?: string; message?: string }) : null;
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;

  const err = error as { message?: string; context?: unknown };
  const ctx = err?.context;
  if (ctx && typeof ctx === 'object' && 'json' in ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = (await (ctx as Response).clone().json()) as { error?: string; message?: string };
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    } catch {
      /* ignore */
    }
  }
  const msg = err?.message ?? '';
  if (/failed to send|not found|404|functions?relay/i.test(msg)) return KIRA_FN_HINT;
  return msg || KIRA_FN_HINT;
}

async function invokeKira<T>(
  action: KiraAction,
  body: Record<string, unknown>,
  client: SupabaseClient = supabase
): Promise<T> {
  const { data, error } = await client.functions.invoke('kira-ai', { body: { action, ...body } });
  if (error) throw new Error(await readFunctionError(error, data));
  const payload = data as ({ error?: string } & T) | null;
  if (payload?.error) throw new Error(payload.error);
  if (!payload) throw new Error(KIRA_FN_HINT);
  return payload;
}

/** Raw chat completion, in OpenAI response shape. */
export async function kiraChat(
  payload: KiraChatPayload,
  client?: SupabaseClient
): Promise<KiraChatResponse> {
  return invokeKira<KiraChatResponse>(
    'chat',
    { payload: { model: KIRA_CHAT_MODEL, ...payload } },
    client
  );
}

/** Chat completion reduced to the assistant's reply text. */
export async function kiraChatText(payload: KiraChatPayload, client?: SupabaseClient): Promise<string> {
  const res = await kiraChat(payload, client);
  return res.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * Chat completion parsed as JSON. Returns null when the model answers with
 * something unparseable, so callers can fall back instead of throwing.
 */
export async function kiraChatJson<T>(payload: KiraChatPayload, client?: SupabaseClient): Promise<T | null> {
  const raw = await kiraChatText(payload, client);
  if (!raw) return null;
  // Models often wrap JSON in a ```json fence.
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

export async function kiraGenerateImage(
  options: { prompt: string; aspectRatio?: KiraAspectRatio; model?: string },
  client?: SupabaseClient
): Promise<KiraImageResult> {
  const result = await invokeKira<{ b64Json: string | null; url: string | null }>(
    'image',
    {
      prompt: options.prompt,
      aspectRatio: options.aspectRatio ?? '1:1',
      model: options.model ?? KIRA_IMAGE_MODEL,
    },
    client
  );
  return {
    ...result,
    dataUrl: result.b64Json ? `data:image/png;base64,${result.b64Json}` : result.url,
  };
}

export async function kiraTextToSpeech(
  options: { input: string; voice?: string; model?: string },
  client?: SupabaseClient
): Promise<KiraSpeechResult> {
  const result = await invokeKira<{ audioBase64: string; contentType: string }>(
    'speech',
    {
      input: options.input,
      voice: options.voice ?? 'alloy',
      model: options.model ?? KIRA_SPEECH_MODEL,
    },
    client
  );
  return {
    ...result,
    dataUrl: `data:${result.contentType};base64,${result.audioBase64}`,
  };
}
