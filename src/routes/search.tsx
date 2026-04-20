import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCity } from "@/lib/city";
import { logEvent } from "@/lib/analytics";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { EstablishmentCard, type EstablishmentCardData } from "@/components/EstablishmentCard";

interface SearchParams {
  q?: string;
  category?: string;
  price?: string;
  cuisine?: string;
  healthy?: string;
  city?: string;
}

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    price: typeof s.price === "string" ? s.price : undefined,
    cuisine: typeof s.cuisine === "string" ? s.cuisine : undefined,
    healthy: typeof s.healthy === "string" ? s.healthy : undefined,
    city: typeof s.city === "string" ? s.city : undefined,
  }),
  component: SearchPage,
});

const PRICES = [
  { value: "budget", label: "₨" },
  { value: "mid", label: "₨₨" },
  { value: "premium", label: "₨₨₨" },
  { value: "luxury", label: "₨₨₨₨" },
];

const CUISINES = ["Pakistani", "Chinese", "Italian", "Mediterranean", "Continental", "BBQ", "Seafood", "Desserts", "Bakery", "Healthy", "Fast Food", "Events"];

interface Category { id: string; slug: string; name: string; icon: string | null }

function SearchPage() {
  const params = Route.useSearch();
  const navigate = Route.useNavigate();
  const { city } = useCity();
  const activeCity = params.city ?? city ?? null;

  const [q, setQ] = useState(params.q ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<EstablishmentCardData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("*").order("sort_order").then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => { setQ(params.q ?? ""); }, [params.q]);

  const update = (next: Partial<SearchParams>) => {
    navigate({ search: (prev: SearchParams) => ({ ...prev, ...next }) as never, replace: true });
  };

  useEffect(() => {
    setLoading(true);
    const cols = "id,name,slug,city,cuisine,price_range,cover_url,rating_avg,rating_count,is_sponsored,health_conscious,category_id,categories(slug)";
    let query = supabase.from("establishments").select(cols).eq("status", "active");

    if (activeCity) query = query.eq("city", activeCity);
    if (params.price) query = query.eq("price_range", params.price as "budget" | "mid" | "premium" | "luxury");
    if (params.healthy === "1") query = query.eq("health_conscious", true);
    if (params.cuisine) query = query.contains("cuisine", [params.cuisine]);
    if (params.q) query = query.ilike("name", `%${params.q}%`);

    query.order("is_sponsored", { ascending: false }).order("rating_avg", { ascending: false }).limit(50).then(({ data }) => {
      let rows = (data as unknown as (EstablishmentCardData & { categories: { slug: string } | null })[]) ?? [];
      if (params.category) rows = rows.filter((r) => r.categories?.slug === params.category);
      setResults(rows);
      setLoading(false);
      logEvent("search", null, { ...params, city: activeCity });
    });
  }, [params.q, params.category, params.price, params.cuisine, params.healthy, activeCity]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() || undefined });
  };

  const activeFilterCount = useMemo(() => {
    return (params.category ? 1 : 0) + (params.price ? 1 : 0) + (params.cuisine ? 1 : 0) + (params.healthy === "1" ? 1 : 0);
  }, [params]);

  const clearAll = () => navigate({ search: {} as never, replace: true });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <Link to="/" className="rounded-full p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <form onSubmit={onSubmit} className="flex-1">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-soft">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {q && (
                <button type="button" onClick={() => { setQ(""); update({ q: undefined }); }}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </form>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="relative rounded-2xl border border-border bg-card p-2.5 shadow-soft"
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 scrollbar-hide">
          <Chip active={!params.category} onClick={() => update({ category: undefined })}>All</Chip>
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={params.category === c.slug}
              onClick={() => update({ category: params.category === c.slug ? undefined : c.slug })}
            >
              <span className="mr-1">{c.icon}</span>{c.name}
            </Chip>
          ))}
        </div>
      </header>

      {showFilters && (
        <section className="mx-5 mb-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <FilterGroup label="Price">
            {PRICES.map((p) => (
              <Pill key={p.value} active={params.price === p.value} onClick={() => update({ price: params.price === p.value ? undefined : p.value })}>
                {p.label}
              </Pill>
            ))}
          </FilterGroup>
          <FilterGroup label="Cuisine">
            {CUISINES.map((c) => (
              <Pill key={c} active={params.cuisine === c} onClick={() => update({ cuisine: params.cuisine === c ? undefined : c })}>
                {c}
              </Pill>
            ))}
          </FilterGroup>
          <FilterGroup label="Diet">
            <Pill active={params.healthy === "1"} onClick={() => update({ healthy: params.healthy === "1" ? undefined : "1" })}>
              🥗 Health Conscious
            </Pill>
          </FilterGroup>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="mt-2 text-sm font-medium text-primary">Clear all filters</button>
          )}
        </section>
      )}

      <section className="px-5 pb-10">
        <p className="mb-3 text-sm text-muted-foreground">
          {loading ? "Searching…" : `${results.length} result${results.length === 1 ? "" : "s"}${activeCity ? ` in ${activeCity}` : ""}`}
        </p>
        {results.length === 0 && !loading ? (
          <div className="rounded-2xl bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
            No matches. Try a different filter or city.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((e) => <EstablishmentCard key={e.id} e={e} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
        (active ? "bg-primary text-primary-foreground shadow-soft" : "bg-card text-foreground shadow-soft hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors " +
        (active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}
