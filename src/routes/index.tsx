import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCity, cityCoords } from "@/lib/city";
import { useAuth } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { Search, MapPin, ChevronRight, Sparkles } from "lucide-react";
import { EstablishmentCard, type EstablishmentCardData } from "@/components/EstablishmentCard";

export const Route = createFileRoute("/")({
  component: Home,
});

interface Category { id: string; slug: string; name: string; icon: string | null }
interface Banner { id: string; title: string; subtitle: string | null; image_url: string; link_establishment_id: string | null }

function Home() {
  const navigate = useNavigate();
  const { city } = useCity();
  const { user, isGuest, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [featured, setFeatured] = useState<EstablishmentCardData[]>([]);
  const [nearYou, setNearYou] = useState<EstablishmentCardData[]>([]);

  // Onboarding redirect
  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;
    const onboarded = localStorage.getItem("dk_onboarded") === "1";
    if (!onboarded) {
      navigate({ to: "/welcome" });
      return;
    }
    if (!city) {
      navigate({ to: "/pick-city" });
    }
  }, [authLoading, city, navigate]);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCategories(data ?? []));
    supabase.from("banners").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setBanners(data ?? []));
  }, []);

  useEffect(() => {
    if (!city) return;
    const cols = "id,name,slug,city,cuisine,price_range,cover_url,rating_avg,rating_count,is_sponsored,health_conscious";
    supabase
      .from("establishments")
      .select(cols)
      .eq("status", "active")
      .eq("is_featured", true)
      .order("is_sponsored", { ascending: false })
      .limit(6)
      .then(({ data }) => setFeatured((data as EstablishmentCardData[]) ?? []));

    supabase
      .from("establishments")
      .select(cols)
      .eq("status", "active")
      .eq("city", city)
      .order("rating_avg", { ascending: false })
      .limit(8)
      .then(({ data }) => setNearYou((data as EstablishmentCardData[]) ?? []));

    logEvent("view_home", null, { city });
  }, [city]);

  const coords = cityCoords(city);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <Link to="/pick-city" className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-soft">
            <MapPin className="h-4 w-4 text-primary" />
            <span>{city ?? "Pick city"}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
          {!user && !isGuest ? (
            <Link to="/login" className="text-sm font-semibold text-primary">Sign in</Link>
          ) : (
            <Link to="/account" className="text-sm font-medium text-muted-foreground">Account</Link>
          )}
        </div>

        <div className="px-5 pb-3">
          <Link
            to="/search"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-muted-foreground shadow-soft"
          >
            <Search className="h-5 w-5" />
            <span className="text-sm">Search restaurants, cuisines, dishes…</span>
          </Link>
        </div>
      </header>

      {/* Hero greeting */}
      <section className="px-5 pt-2">
        <h1 className="font-display text-3xl font-bold leading-tight">
          Hungry in <span className="text-primary">{city ?? "your city"}?</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Find your next favorite spot</p>
      </section>

      {/* Categories */}
      <section className="mt-5">
        <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/search"
              search={{ category: c.slug } as never}
              className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-card px-4 py-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <span className="text-2xl leading-none">{c.icon}</span>
              <span className="text-xs font-medium">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Banners */}
      {banners.length > 0 && (
        <section className="mt-6 px-5">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {banners.map((b) => (
              <div
                key={b.id}
                className="relative h-44 w-[85%] shrink-0 overflow-hidden rounded-3xl shadow-elegant md:w-[60%]"
              >
                <img src={b.image_url} alt={b.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-5 text-primary-foreground">
                  <Sparkles className="mb-2 h-5 w-5 text-accent" />
                  <h3 className="font-display text-xl font-bold leading-tight">{b.title}</h3>
                  {b.subtitle && <p className="mt-1 text-sm opacity-90">{b.subtitle}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mt-8 px-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-2xl font-bold">Featured</h2>
            <Link to="/search" className="text-sm font-medium text-primary">See all</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => <EstablishmentCard key={e.id} e={e} />)}
          </div>
        </section>
      )}

      {/* Near you */}
      <section className="mt-8 px-5 pb-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">Near you</h2>
            {coords && <p className="text-xs text-muted-foreground">in {city}</p>}
          </div>
          <Link to="/search" className="text-sm font-medium text-primary">See all</Link>
        </div>
        {nearYou.length === 0 ? (
          <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
            No listings in {city} yet. Try another city.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nearYou.map((e) => <EstablishmentCard key={e.id} e={e} />)}
          </div>
        )}
      </section>
    </div>
  );
}
