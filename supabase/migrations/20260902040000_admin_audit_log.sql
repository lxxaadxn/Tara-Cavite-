-- Admin audit log for Analytics → Audit log.
-- Same as supabase/ADMIN_AUDIT_LOG.sql (safe to re-run).

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  entity TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_occurred_at
  ON public.admin_audit_log (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor_email
  ON public.admin_audit_log (lower(actor_email), occurred_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.admin_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.write_admin_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec jsonb;
  prev jsonb;
  v_action text;
  v_id text;
  v_label text;
  v_entity text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := to_jsonb(OLD);
    prev := rec;
    v_action := 'delete';
  ELSE
    rec := to_jsonb(NEW);
    prev := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    v_action := lower(TG_OP);
  END IF;

  IF NOT public.is_cavitour_session_admin() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND (rec - 'updated_at') IS NOT DISTINCT FROM (prev - 'updated_at') THEN
    RETURN NEW;
  END IF;

  v_entity := TG_TABLE_NAME;
  v_id := COALESCE(rec->>'id', rec->>'city_id', rec->>'key', rec->>'ntdp_category_id', rec->>'category_id', rec->>'type_code_id');
  v_label := COALESCE(
    nullif(rec->>'ta_name', ''),
    nullif(rec->>'business_name', ''),
    nullif(rec->>'title', ''),
    nullif(rec->>'name', ''),
    nullif(rec->>'label', ''),
    nullif(rec->>'key', ''),
    nullif(rec->>'email', ''),
    nullif(rec->>'city_name', ''),
    nullif(rec->>'ntdp_category_name', ''),
    nullif(rec->>'category_name', ''),
    nullif(rec->>'type_code', ''),
    nullif(rec->>'display_name', ''),
    nullif(prev->>'ta_name', ''),
    nullif(prev->>'business_name', ''),
    nullif(prev->>'title', ''),
    nullif(prev->>'name', ''),
    nullif(prev->>'label', ''),
    nullif(prev->>'key', ''),
    nullif(prev->>'email', ''),
    v_id,
    v_entity
  );

  INSERT INTO public.admin_audit_log (actor_id, actor_email, action, entity, entity_id, summary, details)
  VALUES (
    auth.uid(),
    lower(coalesce(auth.jwt()->>'email', '')),
    v_action,
    v_entity,
    v_id,
    initcap(v_action) || ' ' || replace(v_entity, '_', ' ') || ' · ' || left(v_label, 140),
    jsonb_build_object('id', v_id)
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'site_content',
    'sta_v3_cavite_2025',
    'itineraries',
    'announcements',
    'place_reviews',
    'users',
    'establishment_owners',
    'cities',
    'app_filter_categories',
    'user_reports',
    'ntdp_categories',
    'ta_categories',
    'type_codes'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_admin_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER audit_admin_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_cavitour_session_admin'
  ) THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
      CREATE POLICY "Admins read audit log"
        ON public.admin_audit_log FOR SELECT
        TO authenticated
        USING (public.is_cavitour_session_admin());
    $policy$;
  END IF;
END $$;
