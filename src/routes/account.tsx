import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { LogOut, MapPin, Heart, Search, ChefHat } from "lucide-react";

export const Route = createFileRoute("/account")({
  component: Account,
});

function Account() {
  const { user, isGuest, signOut } = useAuth();
  const { city } = useCity();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-10">
      <h1 className="font-display text-3xl font-bold">Account</h1>

      <div className="mt-6 rounded-2xl bg-card p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-hero text-primary-foreground">
            <ChefHat className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            {user ? (
              <>
                <div className="truncate font-semibold">{user.user_metadata?.display_name ?? user.email}</div>
                <div className="truncate text-sm text-muted-foreground">{user.email}</div>
              </>
            ) : (
              <>
                <div className="font-semibold">{isGuest ? "Guest" : "Not signed in"}</div>
                <div className="text-sm text-muted-foreground">Sign in to save favorites & post reviews</div>
              </>
            )}
          </div>
        </div>

        {!user && (
          <Link
            to="/login"
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft"
          >
            Sign in / Create account
          </Link>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-soft">
        <Row icon={<MapPin className="h-5 w-5" />} label="City" value={city ?? "Not set"} to="/pick-city" />
        <Row icon={<Heart className="h-5 w-5" />} label="Favorites" to="/favorites" />
        <Row icon={<Search className="h-5 w-5" />} label="Browse" to="/search" />
      </div>

      {(user || isGuest) && (
        <button
          onClick={handleSignOut}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-destructive shadow-soft hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          {user ? "Sign out" : "Exit guest mode"}
        </button>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">Dastarkhan · Discover Pakistan's tables</p>
    </div>
  );
}

function Row({ icon, label, value, to }: { icon: React.ReactNode; label: string; value?: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0 hover:bg-muted">
      <div className="text-primary">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {value && <div className="text-xs text-muted-foreground">{value}</div>}
      </div>
    </Link>
  );
}
