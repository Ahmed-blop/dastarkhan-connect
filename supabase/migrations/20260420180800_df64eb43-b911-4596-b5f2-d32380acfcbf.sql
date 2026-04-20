
-- =========================================
-- DASTARKHAN SCHEMA
-- =========================================

-- Roles enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles (auto-created on signup)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles select own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);

-- Establishments
CREATE TYPE public.establishment_status AS ENUM ('pending', 'active', 'rejected', 'suspended');
CREATE TYPE public.price_range AS ENUM ('budget', 'mid', 'premium', 'luxury');

CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  cuisine TEXT[],
  price_range price_range NOT NULL DEFAULT 'mid',
  health_conscious BOOLEAN NOT NULL DEFAULT false,
  city TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  whatsapp_number TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  cover_url TEXT,
  hours JSONB,
  status establishment_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  whatsapp_click_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
CREATE INDEX establishments_city_idx ON public.establishments(city);
CREATE INDEX establishments_category_idx ON public.establishments(category_id);
CREATE INDEX establishments_status_idx ON public.establishments(status);

CREATE POLICY "establishments public read active" ON public.establishments FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "owners read own establishments" ON public.establishments FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "owners update own establishments" ON public.establishments FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "owners insert own establishments" ON public.establishments FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "admins manage all establishments" ON public.establishments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Photos
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos public read" ON public.photos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner manage photos" ON public.photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()));

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  section TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu public read" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner manage menu" ON public.menu_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.establishments e WHERE e.id = establishment_id AND e.owner_id = auth.uid()));

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(establishment_id, user_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own review" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users delete own review" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Recompute rating aggregate
CREATE OR REPLACE FUNCTION public.recompute_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eid UUID;
BEGIN
  eid := COALESCE(NEW.establishment_id, OLD.establishment_id);
  UPDATE public.establishments SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE establishment_id = eid), 0),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE establishment_id = eid)
  WHERE id = eid;
  RETURN NULL;
END;
$$;
CREATE TRIGGER reviews_recompute AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recompute_rating();

-- Favorites
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, establishment_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites select own" ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "favorites insert own" ON public.favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "favorites delete own" ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Banners (homepage)
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read active" ON public.banners FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Analytics events
CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX analytics_event_type_idx ON public.analytics_events(event_type);
CREATE INDEX analytics_estab_idx ON public.analytics_events(establishment_id);
CREATE POLICY "anyone insert analytics" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read analytics" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Increment counters via security-definer RPC
CREATE OR REPLACE FUNCTION public.log_event(_event_type TEXT, _establishment_id UUID, _metadata JSONB DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.analytics_events (user_id, event_type, establishment_id, metadata)
  VALUES (auth.uid(), _event_type, _establishment_id, _metadata);
  IF _event_type = 'view_establishment' AND _establishment_id IS NOT NULL THEN
    UPDATE public.establishments SET view_count = view_count + 1 WHERE id = _establishment_id;
  ELSIF _event_type = 'whatsapp_click' AND _establishment_id IS NOT NULL THEN
    UPDATE public.establishments SET whatsapp_click_count = whatsapp_click_count + 1 WHERE id = _establishment_id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_event(TEXT, UUID, JSONB) TO anon, authenticated;

-- Haversine distance function
CREATE OR REPLACE FUNCTION public.distance_km(lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION, lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION)
RETURNS DOUBLE PRECISION LANGUAGE SQL IMMUTABLE AS $$
  SELECT 6371 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1) / 2)), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lon2 - lon1) / 2)), 2)
  ));
$$;

-- Seed categories
INSERT INTO public.categories (slug, name, icon, sort_order) VALUES
  ('restaurant', 'Restaurant', '🍽️', 1),
  ('cafe', 'Cafe', '☕', 2),
  ('bakery', 'Bakery', '🥐', 3),
  ('hotel', 'Hotel', '🏨', 4),
  ('marquee', 'Marquee', '🎪', 5),
  ('fast-food', 'Fast Food', '🍔', 6),
  ('dessert', 'Dessert', '🍰', 7),
  ('bbq', 'BBQ & Grill', '🔥', 8);
