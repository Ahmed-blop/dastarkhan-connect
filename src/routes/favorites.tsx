import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart } from "lucide-react";
import { EstablishmentCard, type EstablishmentCardData } from "@/components/EstablishmentCard";

export const Route = createFileRoute("/favorites")({
  component: Favorites,
});

function Favorites() {
  const { user, isGuest } = useAuth();
  const [items, setItems] = useState<EstablishmentCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("favorites")
      .select("establishment_id, establishments(id,name,slug,city,cuisine,price_range,cover_url,rating_avg,rating_count,is_sponsored,health_conscious)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const list = (data ?? [])
          .map((r) => r.establishments as unknown as EstablishmentCardData)
          .filter(Boolean);
        setItems(list);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-6 pb-10">
      <h1 className="font-display text-3xl font-bold">Favorites</h1>
      <p className="mt-1 text-sm text-muted-foreground">Places you've saved</p>

      <div className="mt-6">
        {!user ? (
          <EmptyState
            icon={<Heart className="h-7 w-7" />}
            title={isGuest ? "Sign in to save favorites" : "Sign in to save favorites"}
            desc="Create a free account to keep track of the places you love."
            cta={<Link to="/login" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">Sign in</Link>}
          />
        ) : loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-7 w-7" />}
            title="No favorites yet"
            desc="Tap the heart on any place to save it here."
            cta={<Link to="/search" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft">Browse places</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => <EstablishmentCard key={e.id} e={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, cta }: { icon: React.ReactNode; title: string; desc: string; cta: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card p-10 text-center shadow-soft">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{desc}</p>
      <div className="mt-5">{cta}</div>
    </div>
  );
}
