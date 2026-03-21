-- Da Mesa — Full Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'diner'
                CHECK (role IN ('diner', 'restaurant_owner', 'super_admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RESTAURANTS
-- ============================================================
CREATE TABLE public.restaurants (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  cuisine_type   TEXT,
  city           TEXT NOT NULL DEFAULT 'Lisboa',
  address        TEXT,
  phone          TEXT,
  email          TEXT,
  website        TEXT,
  cover_image    TEXT,
  logo_image     TEXT,
  price_range    TEXT CHECK (price_range IN ('€', '€€', '€€€', '€€€€')),
  capacity       INTEGER DEFAULT 50,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'active', 'suspended')),
  subscription   TEXT NOT NULL DEFAULT 'free'
                   CHECK (subscription IN ('free', 'pro', 'enterprise')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.restaurants (slug);
CREATE INDEX ON public.restaurants (status);
CREATE INDEX ON public.restaurants (cuisine_type);

-- ============================================================
-- OPENING HOURS
-- ============================================================
CREATE TABLE public.opening_hours (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week    INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  open_time      TIME,
  close_time     TIME,
  is_closed      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ON public.opening_hours (restaurant_id);

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
CREATE TABLE public.menu_categories (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id  UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.menu_categories (restaurant_id);

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE public.menu_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id    UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  price          NUMERIC(8,2),
  image_url      TEXT,
  is_available   BOOLEAN NOT NULL DEFAULT TRUE,
  is_vegetarian  BOOLEAN NOT NULL DEFAULT FALSE,
  is_vegan       BOOLEAN NOT NULL DEFAULT FALSE,
  allergens      TEXT[],
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.menu_items (category_id);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE public.bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id    UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  diner_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  diner_name       TEXT NOT NULL,
  diner_email      TEXT NOT NULL,
  diner_phone      TEXT NOT NULL,
  booking_date     DATE NOT NULL,
  booking_time     TIME NOT NULL,
  party_size       INTEGER NOT NULL CHECK (party_size > 0),
  special_requests TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  reference_code   TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 8)),
  reminder_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.bookings (restaurant_id);
CREATE INDEX ON public.bookings (booking_date);
CREATE INDEX ON public.bookings (diner_email);
CREATE INDEX ON public.bookings (reference_code);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE public.analytics_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name   TEXT NOT NULL,
  properties   JSONB,
  url          TEXT,
  referrer     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.analytics_events (event_name);
CREATE INDEX ON public.analytics_events (created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles visible to all" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Restaurants
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active restaurants visible to all" ON public.restaurants FOR SELECT USING (status = 'active');
CREATE POLICY "Owners can manage own restaurant" ON public.restaurants FOR ALL
  USING (auth.uid() = owner_id);
CREATE POLICY "Super admins can manage all restaurants" ON public.restaurants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Opening hours (public read, owner write)
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Opening hours visible to all" ON public.opening_hours FOR SELECT USING (TRUE);
CREATE POLICY "Owners can manage own opening hours" ON public.opening_hours FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
  ));

-- Menu categories (public read, owner write)
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu categories visible to all" ON public.menu_categories FOR SELECT USING (TRUE);
CREATE POLICY "Owners can manage own menu categories" ON public.menu_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
  ));

-- Menu items (public read, owner write)
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu items visible to all" ON public.menu_items FOR SELECT USING (TRUE);
CREATE POLICY "Owners can manage own menu items" ON public.menu_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.menu_categories mc
    JOIN public.restaurants r ON r.id = mc.restaurant_id
    WHERE mc.id = category_id AND r.owner_id = auth.uid()
  ));

-- Bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a booking" ON public.bookings FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Diners can see own bookings" ON public.bookings FOR SELECT
  USING (diner_email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Owners can see own restaurant bookings" ON public.bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
  ));
CREATE POLICY "Owners can update own restaurant bookings" ON public.bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
  ));
CREATE POLICY "Super admins can manage all bookings" ON public.bookings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- ============================================================
-- CRON: Send reminders every hour
-- ============================================================
SELECT cron.schedule(
  'send-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
