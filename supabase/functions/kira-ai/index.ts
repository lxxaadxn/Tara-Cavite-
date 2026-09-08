import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIRA_BASE_URL = 'https://kiraai.vn/api/v1';

const DEFAULT_CHAT_MODEL = 'glm-5.3-flash-free';
const DEFAULT_IMAGE_MODEL = 'kira-3.0-image';
const DEFAULT_SPEECH_MODEL = 'kira-3.0-flash-tts';
const DEFAULT_VOICE = 'alloy';
const DEFAULT_ASPECT_RATIO = '1:1';

/** Kira bills per token, so cap what a single call can ask for. */
const MAX_PROMPT_CHARS = 24000;
const MAX_SPEECH_CHARS = 4000;

const TIMEOUT_MS = {
  chat: 75_000,
  image: 90_000,
  speech: 60_000,
} as const;

type Action = keyof typeof TIMEOUT_MS;

type KiraBody = {
  action?: string;
  /** OpenAI-shaped payload, forwarded as-is to /chat/completions. */
  payload?: Record<string, unknown>;
  prompt?: string;
  aspectRatio?: string;
  input?: string;
  voice?: string;
  model?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function trim(value: unknown) {
  return String(value ?? '').trim();
}

/**
 * Kira answers with `{"error":{"message":...}}`, `{"error":"..."}`, or an HTML
 * error page depending on which layer rejected the call.
 */
function readKiraError(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: string };
    const err = parsed.error;
    if (typeof err === 'string' && err) return err;
    if (err && typeof err === 'object') {
      const message = (err as { message?: string }).message;
      if (message) return message;
    }
    if (parsed.message) return parsed.message;
  } catch {
    /* not JSON */
  }
  if (status >= 500) return 'Kira AI is temporarily unavailable. Please try again.';
  return raw.slice(0, 300) || `Kira AI request failed (${status}).`;
}

async function kiraFetch(path: string, payload: unknown, action: Action, apiKey: string): Promise<Response> {
  const timeoutMs = TIMEOUT_MS[action];
  let lastError = '';

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${KIRA_BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      // 4xx is a real verdict on this request; only Kira's own 5xx is worth retrying.
      if (res.status < 500 || attempt === 2) return res;
      lastError = readKiraError(await res.text(), res.status);
    } catch (err) {
      // A timeout means the model is genuinely slow, so retrying just burns the budget.
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        throw new Error(`Kira AI timed out after ${Math.round(timeoutMs / 1000)}s.`);
      }
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }

  throw new Error(lastError || 'Kira AI request failed.');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function handleChat(body: KiraBody, apiKey: string) {
  const payload = body.payload;
  if (!payload || typeof payload !== 'object') {
    return json(400, { error: 'A chat payload is required.' });
  }
  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: 'At least one chat message is required.' });
  }
  if (JSON.stringify(messages).length > MAX_PROMPT_CHARS) {
    return json(400, { error: 'That prompt is too long for one Kira AI request.' });
  }
  // Streaming would need an SSE passthrough; callers here always read one response.
  const { stream: _stream, ...rest } = payload;

  const res = await kiraFetch(
    '/chat/completions',
    { ...rest, model: trim(payload.model) || DEFAULT_CHAT_MODEL, stream: false },
    'chat',
    apiKey
  );
  const raw = await res.text();
  if (!res.ok) return json(res.status === 429 ? 429 : 502, { error: readKiraError(raw, res.status) });

  try {
    return json(200, JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return json(502, { error: 'Kira AI returned a malformed chat response.' });
  }
}

async function handleImage(body: KiraBody, apiKey: string) {
  const prompt = trim(body.prompt);
  if (!prompt) return json(400, { error: 'An image prompt is required.' });
  if (prompt.length > MAX_PROMPT_CHARS) {
    return json(400, { error: 'That image prompt is too long.' });
  }

  const res = await kiraFetch(
    '/images/generations',
    {
      model: trim(body.model) || DEFAULT_IMAGE_MODEL,
      prompt,
      aspect_ratio: trim(body.aspectRatio) || DEFAULT_ASPECT_RATIO,
    },
    'image',
    apiKey
  );
  const raw = await res.text();
  if (!res.ok) return json(res.status === 429 ? 429 : 502, { error: readKiraError(raw, res.status) });

  let parsed: { data?: Array<{ b64_json?: string; url?: string }> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json(502, { error: 'Kira AI returned a malformed image response.' });
  }

  const first = parsed.data?.[0];
  if (!first?.b64_json && !first?.url) {
    return json(502, { error: 'Kira AI did not return an image.' });
  }
  return json(200, { b64Json: first.b64_json ?? null, url: first.url ?? null });
}

async function handleSpeech(body: KiraBody, apiKey: string) {
  const input = trim(body.input);
  if (!input) return json(400, { error: 'Some text to speak is required.' });
  if (input.length > MAX_SPEECH_CHARS) {
    return json(400, { error: `Speech input is limited to ${MAX_SPEECH_CHARS} characters.` });
  }

  const res = await kiraFetch(
    '/audio/speech',
    {
      model: trim(body.model) || DEFAULT_SPEECH_MODEL,
      input,
      voice: trim(body.voice) || DEFAULT_VOICE,
    },
    'speech',
    apiKey
  );
  if (!res.ok) {
    return json(res.status === 429 ? 429 : 502, { error: readKiraError(await res.text(), res.status) });
  }

  const contentType = res.headers.get('Content-Type') ?? '';
  // Errors can still arrive with a 200 from the audio route.
  if (contentType.includes('application/json')) {
    const raw = await res.text();
    return json(502, { error: readKiraError(raw, 502) });
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) return json(502, { error: 'Kira AI returned empty audio.' });

  // supabase-js only parses JSON, blobs and text, so hand the audio back as base64.
  return json(200, {
    audioBase64: toBase64(bytes),
    contentType: contentType || 'audio/mpeg',
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const apiKey = Deno.env.get('KIRA_API_KEY') ?? '';
  if (!apiKey) {
    return json(500, { error: 'KIRA_API_KEY is not set on the Edge Function.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!supabaseUrl || !anonKey) {
    return json(500, { error: 'Missing Supabase environment on the Edge Function.' });
  }

  // Kira bills real credits, so never serve callers holding only the anon key.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json(401, { error: 'Sign in before using Kira AI.' });
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: 'Sign in before using Kira AI.' });
  }

  let body: KiraBody = {};
  try {
    body = (await req.json()) as KiraBody;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const action = trim(body.action) as Action;
  try {
    if (action === 'chat') return await handleChat(body, apiKey);
    if (action === 'image') return await handleImage(body, apiKey);
    if (action === 'speech') return await handleSpeech(body, apiKey);
  } catch (err) {
    return json(502, { error: err instanceof Error ? err.message : 'Kira AI request failed.' });
  }

  return json(400, { error: `Unknown action "${action}". Use chat, image or speech.` });
});
