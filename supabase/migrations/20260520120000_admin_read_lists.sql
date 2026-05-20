-- Allow Cavitour admin sessions to read user lists and related items (admin CMS).

DROP POLICY IF EXISTS "Cavitour admins read all saved_lists" ON public.saved_lists;
CREATE POLICY "Cavitour admins read all saved_lists"
  ON public.saved_lists FOR SELECT
  TO authenticated
  USING (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins read saved_list_items" ON public.saved_list_items;
CREATE POLICY "Cavitour admins read saved_list_items"
  ON public.saved_list_items FOR SELECT
  TO authenticated
  USING (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins read saved_list_terminal_items" ON public.saved_list_terminal_items;
CREATE POLICY "Cavitour admins read saved_list_terminal_items"
  ON public.saved_list_terminal_items FOR SELECT
  TO authenticated
  USING (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins read saved_list_itinerary_items" ON public.saved_list_itinerary_items;
CREATE POLICY "Cavitour admins read saved_list_itinerary_items"
  ON public.saved_list_itinerary_items FOR SELECT
  TO authenticated
  USING (public.is_cavitour_session_admin());

DROP POLICY IF EXISTS "Cavitour admins read user_profiles" ON public.user_profiles;
CREATE POLICY "Cavitour admins read user_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (public.is_cavitour_session_admin());
