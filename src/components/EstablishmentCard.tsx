import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { PRICE_LABEL } from "@/lib/format";

export interface EstablishmentCardData {
  id: string;
  name: string;
  slug: string;
  city: string;
  cuisine: string[] | null;
  price_range: string;
  cover_url: string | null;
  rating_avg: number;
  rating_count: number;
  is_sponsored: boolean;
  health_conscious: boolean;
}

export function EstablishmentCard({ e }: { e: EstablishmentCardData }) {
  return (
    <Link
      to="/e/$slug"
      params={{ slug: e.slug }}
      className="group block overflow-hidden rounded-2xl bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {e.cover_url ? (
          <img
            src={e.cover_url}
            alt={e.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        {e.is_sponsored && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground shadow-warm">
            Sponsored
          </span>
        )}
        {e.health_conscious && (
          <span className="absolute right-3 top-3 rounded-full bg-success/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            Healthy
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{e.name}</h3>
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {PRICE_LABEL[e.price_range] ?? ""}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
          {e.cuisine?.slice(0, 3).join(" · ") || "—"}
        </p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {e.city}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            {e.rating_avg > 0 ? e.rating_avg.toFixed(1) : "New"}
            {e.rating_count > 0 && (
              <span className="text-muted-foreground">({e.rating_count})</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
