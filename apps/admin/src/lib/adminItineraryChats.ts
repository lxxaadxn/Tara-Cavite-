import { supabase } from './supabase';
import type { AdminItinerary } from './adminItineraries';

/**
 * Chat history for the AI Itinerary Generator.
 *
 * Rows are private to the admin who wrote them: `chat_sessions.user_id`
 * defaults to `auth.uid()` and RLS checks the same, so no id is threaded in
 * from the caller. Needs supabase/migrations/20260909120000_itinerary_ai_chats.sql.
 */

export type ChatSender = 'user' | 'assistant';

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  message: string;
  /** Set on assistant rows that carry a generated itinerary preview. */
  itineraryDraft: AdminItinerary | null;
  /** Set once the draft has been written to public.itineraries. */
  savedItineraryId: string | null;
  createdAt: string | null;
};

const SESSION_SELECT = 'id, title, created_at, updated_at';
const MESSAGE_SELECT = 'id, sender, message, itinerary_draft, saved_itinerary_id, created_at';
const SESSION_LIMIT = 50;

/** The migration may not be applied yet; the chat should still open. */
export function isMissingChatTables(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('chat_sessions') ||
    msg.includes('chat_messages') ||
    msg.includes('schema cache')
  );
}

const CHAT_TABLES_HINT =
  'Chat history is unavailable. Run supabase/migrations/20260909120000_itinerary_ai_chats.sql in the Supabase SQL Editor.';

function asDraft(raw: unknown): AdminItinerary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.stopList)) return null;
  return r as unknown as AdminItinerary;
}

function asMessage(raw: Record<string, unknown>): ChatMessage {
  return {
    id: String(raw.id),
    sender: raw.sender === 'user' ? 'user' : 'assistant',
    message: String(raw.message ?? ''),
    itineraryDraft: asDraft(raw.itinerary_draft),
    savedItineraryId: raw.saved_itinerary_id ? String(raw.saved_itinerary_id) : null,
    createdAt: raw.created_at ? String(raw.created_at) : null,
  };
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select(SESSION_SELECT)
    .order('updated_at', { ascending: false })
    .limit(SESSION_LIMIT);
  if (error) {
    if (isMissingChatTables(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? 'New chat'),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }));
}

export async function fetchChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const id = sessionId.trim();
  if (!id) return [];
  const { data, error } = await supabase
    .from('chat_messages')
    .select(MESSAGE_SELECT)
    .eq('session_id', id)
    .order('created_at', { ascending: true });
  if (error) {
    if (isMissingChatTables(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => asMessage(row as unknown as Record<string, unknown>));
}

export async function createChatSession(title: string): Promise<string> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ title: title.trim() || 'New chat' })
    .select('id')
    .single();
  if (error) throw new Error(isMissingChatTables(error) ? CHAT_TABLES_HINT : error.message);
  return String(data.id);
}

export async function appendChatMessage(
  sessionId: string,
  input: { sender: ChatSender; message: string; itineraryDraft?: AdminItinerary | null }
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      sender: input.sender,
      message: input.message,
      itinerary_draft: input.itineraryDraft ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();
  if (error) throw new Error(isMissingChatTables(error) ? CHAT_TABLES_HINT : error.message);
  return asMessage(data as unknown as Record<string, unknown>);
}

/** Rewrites a preview in place after a chat edit, so the card stays a single row. */
export async function updateChatMessageDraft(
  messageId: string,
  draft: AdminItinerary
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ itinerary_draft: draft, message: draft.title })
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function markDraftSaved(messageId: string, itineraryId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ saved_itinerary_id: itineraryId })
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function renameChatSession(id: string, title: string): Promise<void> {
  const next = title.trim();
  if (!next) return;
  const { error } = await supabase.from('chat_sessions').update({ title: next }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteChatSession(id: string): Promise<void> {
  const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** First line of the opening prompt, so the history rail reads like the request. */
export function chatTitleFromPrompt(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'New chat';
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}
