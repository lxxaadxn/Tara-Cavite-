-- Terminals and itineraries saved into user lists (refs match app mock ids / strings).

CREATE TABLE IF NOT EXISTS public.saved_list_terminal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES public.saved_lists(id) ON DELETE CASCADE,
  terminal_ref TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, terminal_ref)
);

CREATE TABLE IF NOT EXISTS public.saved_list_itinerary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES public.saved_lists(id) ON DELETE CASCADE,
  itinerary_ref TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, itinerary_ref)
);

CREATE INDEX IF NOT EXISTS idx_saved_list_terminal_items_list_id
  ON public.saved_list_terminal_items(list_id);
CREATE INDEX IF NOT EXISTS idx_saved_list_itinerary_items_list_id
  ON public.saved_list_itinerary_items(list_id);

ALTER TABLE public.saved_list_terminal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_list_itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage terminal items in own lists"
  ON public.saved_list_terminal_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_lists sl
      WHERE sl.id = saved_list_terminal_items.list_id
        AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage itinerary items in own lists"
  ON public.saved_list_itinerary_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_lists sl
      WHERE sl.id = saved_list_itinerary_items.list_id
        AND sl.user_id = auth.uid()
    )
  );
