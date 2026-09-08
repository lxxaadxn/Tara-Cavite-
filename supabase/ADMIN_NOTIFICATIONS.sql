-- Admin notification inbox: alerts the Tourism Office when an establishment
-- posts an announcement or finishes its invite setup.
-- Run in the Supabase SQL Editor (safe to re-run).

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('establishment_announcement', 'establishment_activated')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  establishment_owner_id UUID REFERENCES public.establishment_owners(id) ON DELETE SET NULL,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_notifications IS
  'Broadcast inbox for admins. Written only by SECURITY DEFINER triggers.';

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON public.admin_notifications (created_at DESC);

-- Per-admin read receipts, mirroring announcement_reads.
CREATE TABLE IF NOT EXISTS public.admin_notification_reads (
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_id, notification_id)
);

-- ---------------------------------------------------------------------------
-- 2) Grants + RLS (no INSERT on admin_notifications: triggers own the writes)
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.admin_notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.admin_notification_reads TO authenticated;

DROP POLICY IF EXISTS "Admins read admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admins read own notification receipts" ON public.admin_notification_reads;
DROP POLICY IF EXISTS "Admins insert own notification receipts" ON public.admin_notification_reads;
DROP POLICY IF EXISTS "Admins delete own notification receipts" ON public.admin_notification_reads;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins read admin notifications"
        ON public.admin_notifications FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin())
    $policy$;
  END IF;
END $$;

CREATE POLICY "Admins read own notification receipts"
  ON public.admin_notification_reads FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Admins insert own notification receipts"
  ON public.admin_notification_reads FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Admins delete own notification receipts"
  ON public.admin_notification_reads FOR DELETE
  TO authenticated
  USING (admin_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3) Trigger: an establishment posted an announcement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_establishment_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_name TEXT;
BEGIN
  SELECT COALESCE(NULLIF(TRIM(o.business_name), ''), NULLIF(TRIM(o.full_name), ''), o.email)
    INTO owner_name
  FROM public.establishment_owners o
  WHERE o.id = NEW.establishment_owner_id;

  INSERT INTO public.admin_notifications (kind, title, body, establishment_owner_id, announcement_id)
  VALUES (
    'establishment_announcement',
    COALESCE(owner_name, 'An establishment') || ' posted an announcement',
    NEW.title,
    NEW.establishment_owner_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_notify_admins ON public.announcements;
CREATE TRIGGER announcements_notify_admins
  AFTER INSERT ON public.announcements
  FOR EACH ROW
  WHEN (NEW.source = 'establishment')
  EXECUTE FUNCTION public.notify_admins_establishment_announcement();

-- ---------------------------------------------------------------------------
-- 4) Trigger: an establishment activated its account (set its invite password)
--    The UPDATE OF list must include setup_completed_at or this never fires.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admins_establishment_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_name TEXT;
BEGIN
  owner_name := COALESCE(
    NULLIF(TRIM(NEW.business_name), ''),
    NULLIF(TRIM(NEW.full_name), ''),
    NEW.email,
    'An establishment'
  );

  INSERT INTO public.admin_notifications (kind, title, body, establishment_owner_id)
  VALUES (
    'establishment_activated',
    owner_name || ' activated their account',
    'They set a password from their invitation and can now sign in.',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS establishment_owners_notify_activated ON public.establishment_owners;
CREATE TRIGGER establishment_owners_notify_activated
  AFTER UPDATE ON public.establishment_owners
  FOR EACH ROW
  WHEN (OLD.setup_completed_at IS NULL AND NEW.setup_completed_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_admins_establishment_activated();

-- ---------------------------------------------------------------------------
-- 5) Realtime, so the admin bell updates without a refresh
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6) Check: both triggers should be listed
-- ---------------------------------------------------------------------------
-- SELECT tgname, tgrelid::regclass AS table_name
-- FROM pg_trigger
-- WHERE tgname IN ('announcements_notify_admins', 'establishment_owners_notify_activated');
