-- Reduce exposed SECURITY DEFINER RPC surface.
--
-- These helpers are either trigger/internal only or superseded by
-- app_private.is_admin(uuid). Keeping them callable via /rest/v1/rpc is
-- unnecessary and noisy in Supabase's security advisor.

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Admin-only setup RPC. The function itself checks app admin status; it does
-- not need to be callable by anonymous users.
REVOKE EXECUTE ON FUNCTION public.configure_sync_rpc_secret(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.configure_sync_rpc_secret(TEXT) TO authenticated;

-- Internal helper for the sync RPCs. sync_update_match_result and
-- sync_insert_log remain callable with the shared token; this helper should
-- only run inside those functions.
REVOKE EXECUTE ON FUNCTION public.sync_rpc_token_valid(TEXT) FROM PUBLIC, anon, authenticated;
