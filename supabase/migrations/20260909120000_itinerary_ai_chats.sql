-- Chat history for the admin AI Itinerary Generator: one row per conversation,
-- one row per message, with generated itineraries kept as previews until the
-- admin saves them into public.itineraries.
-- Safe to re-run in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON public.chat_sessions (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  message TEXT NOT NULL DEFAULT '',
  itinerary_draft JSONB,
  saved_itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON public.chat_messages (session_id, created_at);

COMMENT ON TABLE public.chat_sessions IS
  'One AI Itinerary Generator conversation, private to the admin who started it.';
COMMENT ON TABLE public.chat_messages IS
  'Transcript rows. Prose lives in message; a generated itinerary preview lives in itinerary_draft.';
COMMENT ON COLUMN public.chat_messages.saved_itinerary_id IS
  'Set once the admin saves the draft, so the card can show Saved instead of Draft after a reload.';

-- ---------------------------------------------------------------------------
-- 2) updated_at
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS chat_sessions_set_updated_at ON public.chat_sessions;
CREATE TRIGGER chat_sessions_set_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Keeps the history list sorted by real activity, not by when a chat was named.
CREATE OR REPLACE FUNCTION public.chat_messages_touch_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions
     SET updated_at = NOW()
   WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_messages_touch_session ON public.chat_messages;
CREATE TRIGGER chat_messages_touch_session
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_messages_touch_session();

-- ---------------------------------------------------------------------------
-- 3) Grants + RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;

DROP POLICY IF EXISTS "Users manage own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users manage own chat sessions"
  ON public.chat_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage messages in own chat sessions" ON public.chat_messages;
CREATE POLICY "Users manage messages in own chat sessions"
  ON public.chat_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions s
      WHERE s.id = chat_messages.session_id
        AND s.user_id = auth.uid()
    )
  );
