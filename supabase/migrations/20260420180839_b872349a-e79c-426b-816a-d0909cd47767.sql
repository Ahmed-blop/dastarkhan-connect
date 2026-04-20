
DROP POLICY IF EXISTS "anyone insert analytics" ON public.analytics_events;
-- log_event() is SECURITY DEFINER and bypasses RLS, so guests/users can still log via the RPC.
