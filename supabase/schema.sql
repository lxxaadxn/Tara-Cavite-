-- CaviTour Supabase Schema
-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  city TEXT,
  street TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Lists table
CREATE TABLE IF NOT EXISTS public.saved_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'bookmark-outline',
  type TEXT DEFAULT 'private' CHECK (type IN ('private', 'shared')),
  place_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Places table
CREATE TABLE IF NOT EXISTS public.places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT,
  hours TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved List Items (many-to-many relationship between lists and places)
CREATE TABLE IF NOT EXISTS public.saved_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES public.saved_lists(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, place_id)
);

-- Route History table
CREATE TABLE IF NOT EXISTS public.route_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  departure_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recent Searches table
CREATE TABLE IF NOT EXISTS public.recent_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('traffic', 'arrival', 'route-change', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('travel_mode', 'route_priority', 'fare', 'notification')),
  preference_key TEXT NOT NULL,
  preference_value BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category, preference_key)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_lists_user_id ON public.saved_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_list_items_list_id ON public.saved_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_saved_list_items_place_id ON public.saved_list_items(place_id);
CREATE INDEX IF NOT EXISTS idx_route_history_user_id ON public.route_history(user_id);
CREATE INDEX IF NOT EXISTS idx_route_history_created_at ON public.route_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_searches_user_id ON public.recent_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_searches_created_at ON public.recent_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Saved Lists policies
CREATE POLICY "Users can view their own lists"
  ON public.saved_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lists"
  ON public.saved_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
  ON public.saved_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON public.saved_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Places policies (public read, admin write)
CREATE POLICY "Anyone can view places"
  ON public.places FOR SELECT
  USING (true);

-- Saved List Items policies
CREATE POLICY "Users can manage items in their own lists"
  ON public.saved_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.saved_lists
      WHERE saved_lists.id = saved_list_items.list_id
      AND saved_lists.user_id = auth.uid()
    )
  );

-- Route History policies
CREATE POLICY "Users can view their own route history"
  ON public.route_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own route history"
  ON public.route_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own route history"
  ON public.route_history FOR DELETE
  USING (auth.uid() = user_id);

-- Recent Searches policies
CREATE POLICY "Users can view their own recent searches"
  ON public.recent_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recent searches"
  ON public.recent_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recent searches"
  ON public.recent_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- User Preferences policies
CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Functions to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_lists_updated_at BEFORE UPDATE ON public.saved_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update place_count in saved_lists
CREATE OR REPLACE FUNCTION update_saved_list_place_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.saved_lists
    SET place_count = (
      SELECT COUNT(*) FROM public.saved_list_items
      WHERE list_id = NEW.list_id
    )
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.saved_lists
    SET place_count = (
      SELECT COUNT(*) FROM public.saved_list_items
      WHERE list_id = OLD.list_id
    )
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for place_count
CREATE TRIGGER update_place_count_on_item_change
  AFTER INSERT OR DELETE ON public.saved_list_items
  FOR EACH ROW EXECUTE FUNCTION update_saved_list_place_count();
