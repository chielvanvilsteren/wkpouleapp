-- Allow the result sync cron to write through narrow RPCs instead of using
-- the service-role key in the Next.js route.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.sync_rpc_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  sync_secret_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sync_rpc_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.configure_sync_rpc_secret(p_sync_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_sync_token IS NULL OR length(p_sync_token) < 32 THEN
    RAISE EXCEPTION 'Invalid sync token' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.sync_rpc_settings (id, sync_secret_hash, updated_at)
  VALUES (TRUE, encode(digest(p_sync_token, 'sha256'), 'hex'), NOW())
  ON CONFLICT (id) DO UPDATE SET
    sync_secret_hash = EXCLUDED.sync_secret_hash,
    updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_rpc_token_valid(p_sync_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sync_rpc_settings
    WHERE id = TRUE
      AND sync_secret_hash = encode(digest(COALESCE(p_sync_token, ''), 'sha256'), 'hex')
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_update_match_result(
  p_sync_token TEXT,
  p_match_id INT,
  p_home_score INT,
  p_away_score INT,
  p_external_api_id INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.sync_rpc_token_valid(p_sync_token) THEN
    RAISE EXCEPTION 'Invalid sync token' USING ERRCODE = '42501';
  END IF;

  IF p_match_id IS NULL OR p_home_score IS NULL OR p_away_score IS NULL OR
     p_home_score < 0 OR p_away_score < 0 OR p_external_api_id IS NULL THEN
    RAISE EXCEPTION 'Invalid match result payload' USING ERRCODE = '22023';
  END IF;

  UPDATE public.matches
  SET
    home_score = p_home_score,
    away_score = p_away_score,
    is_live = FALSE,
    is_finished = TRUE,
    external_api_id = p_external_api_id
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_insert_log(
  p_sync_token TEXT,
  p_status TEXT,
  p_message TEXT,
  p_updated INT DEFAULT 0,
  p_skipped INT DEFAULT 0,
  p_unmatched INT DEFAULT 0,
  p_details TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_triggered_by TEXT DEFAULT 'cron'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.sync_rpc_token_valid(p_sync_token) THEN
    RAISE EXCEPTION 'Invalid sync token' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('success', 'none', 'error') THEN
    RAISE EXCEPTION 'Invalid sync log status' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.sync_logs (
    status,
    message,
    updated,
    skipped,
    unmatched,
    details,
    triggered_by
  )
  VALUES (
    p_status,
    p_message,
    COALESCE(p_updated, 0),
    COALESCE(p_skipped, 0),
    COALESCE(p_unmatched, 0),
    COALESCE(p_details, ARRAY[]::TEXT[]),
    COALESCE(p_triggered_by, 'cron')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.configure_sync_rpc_secret(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_rpc_token_valid(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_update_match_result(TEXT, INT, INT, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_insert_log(TEXT, TEXT, TEXT, INT, INT, INT, TEXT[], TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.configure_sync_rpc_secret(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_update_match_result(TEXT, INT, INT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_insert_log(TEXT, TEXT, TEXT, INT, INT, INT, TEXT[], TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Admins kunnen sync_logs schrijven" ON public.sync_logs;
CREATE POLICY "Admins kunnen sync_logs schrijven"
  ON public.sync_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = TRUE
    )
  );
