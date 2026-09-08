import { supabase } from './supabase';

/**
 * Client for Kira AI (https://kiraai.vn).
 *
 * Mirror of apps/admin/src/lib/kiraAi.ts. Every call goes through the `kira-ai`
 * Edge Function so `KIRA_API_KEY` stays a server secret.
 */

export const KIRA_CHAT_MODEL = 'glm-5.3-flash-free';
export const KIRA_IMAGE_MODEL = 'kira-3.0-image';
export const KIRA_SPEECH_MODEL = 'kira-3.0-flash-tts';

const KIRA_FN_HINT =
  'Kira AI is unavailable. Deploy the kira-ai Edge Function and set the KIRA_API_KEY secret.';

async function readFunctionError(error, data) {
  if (data?.error) return data.error;
  if (data?.message) return data.message;

  const ctx = error?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    } catch {
      /* ignore */
    }
  }
  const msg = error?.message ?? '';
  if (/failed to send|not found|404|functions?relay/i.test(msg)) return KIRA_FN_HINT;
  return msg || KIRA_FN_HINT;
}

async function invokeKira(action, body, client = supabase) {
  const { data, error } = await client.functions.invoke('kira-ai', { body: { action, ...body } });
  if (error) throw new Error(await readFunctionError(error, data));
  if (data?.error) throw new Error(data.error);
  if (!data) throw new Error(KIRA_FN_HINT);
  return data;
}

/** Raw chat completion, in OpenAI response shape. */
export async function kiraChat(payload, client) {
  return invokeKira('chat', { payload: { model: KIRA_CHAT_MODEL, ...payload } }, client);
}

/** Chat completion reduced to the assistant's reply text. */
export async function kiraChatText(payload, client) {
  const res = await kiraChat(payload, client);
  return res?.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * Chat completion parsed as JSON. Returns null when the model answers with
 * something unparseable, so callers can fall back instead of throwing.
 */
export async function kiraChatJson(payload, client) {
  const raw = await kiraChatText(payload, client);
  if (!raw) return null;
  // Models often wrap JSON in a ```json fence.
  const unfenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  const candidate = start >= 0 && end > start ? unfenced.slice(start, end + 1) : unfenced;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export async function kiraGenerateImage({ prompt, aspectRatio = '1:1', model = KIRA_IMAGE_MODEL }, client) {
  const result = await invokeKira('image', { prompt, aspectRatio, model }, client);
  return {
    ...result,
    dataUrl: result.b64Json ? `data:image/png;base64,${result.b64Json}` : result.url,
  };
}

export async function kiraTextToSpeech({ input, voice = 'alloy', model = KIRA_SPEECH_MODEL }, client) {
  const result = await invokeKira('speech', { input, voice, model }, client);
  return {
    ...result,
    dataUrl: `data:${result.contentType};base64,${result.audioBase64}`,
  };
}
