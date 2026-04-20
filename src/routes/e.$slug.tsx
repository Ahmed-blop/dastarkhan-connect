import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/hooks/useFavorites";
import { logEvent, whatsappLink } from "@/lib/analytics";
import { PRICE_LABEL, formatPrice } from "@/lib/format";
import { ArrowLeft, Heart, Star, MapPin, Clock, MessageCircle, Share2, Leaf } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/e/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("establishments")
      .select("*, categories(name, slug, icon), photos(id,url,sort_order), menu_items(id,name,description,price,section,sort_order,is_available)")
      .eq("slug", params.slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { establishment: data };
  },
  component: Detail,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-5 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">Place not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been removed or is not active.</p>
        <Link to="/" className="mt-5 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-screen items-center justify-center px-5 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Try again</button>
      </div>
    </div>
  ),
});

interface MenuItem { id: string; name: string; description: string | null; price: number | null; section: string | null; sort_order: number; is_available: boolean }
interface Photo { id: string; url: string; sort_order: number }
interface Review { id: string; rating: number; comment: string | null; created_at: string; user_id: string; profiles?: { display_name: string | null } | null }

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

function Detail() {
  const { establishment: e } = Route.useLoaderData();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    logEvent("view_establishment", e.id, { name: e.name });
    supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("establishment_id", e.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setReviews((data as Review[]) ?? []));
  }, [e.id, e.name]);

  const photos: Photo[] = (e.photos ?? []).sort((a: Photo, b: Photo) => a.sort_order - b.sort_order);
  const menu: MenuItem[] = (e.menu_items ?? []).sort((a: MenuItem, b: MenuItem) => a.sort_order - b.sort_order);
  const cover = photos[activePhoto]?.url ?? e.cover_url;
  const fav = isFavorite(e.id);

  // Group menu by section
  const sections: { name: string; items: MenuItem[] }[] = [];
  menu.forEach((m) => {
    const key = m.section ?? "Menu";
    let s = sections.find((x) => x.name === key);
    if (!s) { s = { name: key, items: [] }; sections.push(s); }
    s.items.push(m);
  });

  const handleWhatsApp = () => {
    logEvent("whatsapp_click", e.id, { name: e.name });
    const msg = `Hi ${e.name}! I found you on Dastarkhan and would like to inquire.`;
    window.open(whatsappLink(e.whatsapp_number, msg), "_blank", "noopener");
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.error("Sign in to save favorites");
      return;
    }
    const added = await toggle(e.id);
    toast.success(added ? "Added to favorites" : "Removed from favorites");
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: e.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch { /* cancelled */ }
  };

  return (
    <div className="mx-auto max-w-3xl pb-24">
      {/* Hero gallery */}
      <div className="relative">
        <div className="relative h-72 w-full overflow-hidden bg-muted sm:h-96">
          {cover && <img src={cover} alt={e.name} className="h-full w-full object-cover" />}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent" />
        </div>

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-soft backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex gap-2">
            <button onClick={handleShare} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-soft backdrop-blur">
              <Share2 className="h-5 w-5" />
            </button>
            <button onClick={handleFavorite} className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90 shadow-soft backdrop-blur">
              <Heart className={"h-5 w-5 " + (fav ? "fill-destructive text-destructive" : "")} />
            </button>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={"h-1.5 rounded-full transition-all " + (i === activePhoto ? "w-6 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50")}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Header info */}
      <section className="px-5 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {e.categories && (
            <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
              {e.categories.icon} {e.categories.name}
            </span>
          )}
          {e.is_sponsored && <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-accent-foreground">Sponsored</span>}
          {e.health_conscious && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">
              <Leaf className="h-3 w-3" /> Health Conscious
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight">{e.name}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-medium">
            <Star className="h-4 w-4 fill-accent text-accent" />
            {e.rating_avg > 0 ? e.rating_avg.toFixed(1) : "New"}
            {e.rating_count > 0 && <span className="text-muted-foreground">({e.rating_count} review{e.rating_count === 1 ? "" : "s"})</span>}
          </span>
          <span className="text-muted-foreground">{PRICE_LABEL[e.price_range]}</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {e.city}
          </span>
        </div>

        {e.cuisine && e.cuisine.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">{e.cuisine.join(" · ")}</p>
        )}
        {e.description && <p className="mt-3 text-sm leading-relaxed text-foreground">{e.description}</p>}
      </section>

      {/* Photo strip */}
      {photos.length > 1 && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 font-display text-lg font-semibold">Photos</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePhoto(i)}
                className={"h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition " + (i === activePhoto ? "border-primary" : "border-transparent")}
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Address */}
      {e.address && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 font-display text-lg font-semibold">Location</h2>
          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">{e.address}, {e.city}</div>
            </div>
            {e.latitude && e.longitude && (
              <a
                href={`https://www.google.com/maps?q=${e.latitude},${e.longitude}`}
                target="_blank" rel="noopener"
                className="mt-3 inline-block text-sm font-semibold text-primary"
              >
                Open in Maps →
              </a>
            )}
          </div>
        </section>
      )}

      {/* Hours */}
      {e.hours && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 inline-flex items-center gap-2 font-display text-lg font-semibold">
            <Clock className="h-5 w-5" /> Operating hours
          </h2>
          <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
            {DAYS.map((d) => {
              const h = (e.hours as Record<string, string>)[d];
              return (
                <div key={d} className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-b-0">
                  <span className="text-muted-foreground">{DAY_LABELS[d]}</span>
                  <span className="font-medium">{h ?? "Closed"}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Menu */}
      {sections.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Menu</h2>
          <div className="space-y-5">
            {sections.map((s) => (
              <div key={s.name}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.name}</h3>
                <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
                  {s.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
                      <div className="min-w-0">
                        <div className="font-medium">{item.name}</div>
                        {item.description && <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>}
                      </div>
                      {item.price != null && <div className="shrink-0 text-sm font-semibold text-primary">{formatPrice(item.price)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <ReviewsSection establishmentId={e.id} reviews={reviews} onChange={setReviews} />

      {/* Sticky WhatsApp CTA */}
      <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-3xl px-4 md:bottom-4">
        <button
          onClick={handleWhatsApp}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-base font-semibold text-white shadow-elegant transition active:scale-[0.99]"
          style={{ boxShadow: "0 12px 40px -12px rgba(37, 211, 102, 0.55)" }}
        >
          <MessageCircle className="h-5 w-5" />
          Contact on WhatsApp
        </button>
      </div>
    </div>
  );
}

function ReviewsSection({ establishmentId, reviews, onChange }: { establishmentId: string; reviews: Review[]; onChange: (r: Review[]) => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const myReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment ?? "");
    }
  }, [myReview]);

  const submit = async () => {
    if (!user) { toast.error("Sign in to leave a review"); return; }
    if (rating < 1) { toast.error("Pick a rating"); return; }
    setSubmitting(true);
    const { error } = await supabase
      .from("reviews")
      .upsert({ establishment_id: establishmentId, user_id: user.id, rating, comment: comment.trim() || null }, { onConflict: "establishment_id,user_id" });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your review!");
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id")
      .eq("establishment_id", establishmentId)
      .order("created_at", { ascending: false });
    onChange((data as Review[]) ?? []);
  };

  return (
    <section className="mt-6 px-5">
      <h2 className="mb-3 font-display text-lg font-semibold">Reviews</h2>

      {user && (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-soft">
          <div className="text-sm font-medium">{myReview ? "Edit your review" : "Leave a review"}</div>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={"h-7 w-7 transition " + (n <= rating ? "fill-accent text-accent" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience (optional)"
            maxLength={500}
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-glow disabled:opacity-60"
          >
            {submitting ? "Saving…" : myReview ? "Update review" : "Submit review"}
          </button>
        </div>
      )}

      {!user && (
        <div className="mb-4 rounded-2xl bg-card p-4 text-center text-sm text-muted-foreground shadow-soft">
          <Link to="/login" className="font-semibold text-primary">Sign in</Link> to leave a review.
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-soft">No reviews yet — be the first!</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={"h-4 w-4 " + (n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/40")} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
