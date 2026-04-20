import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ChefHat, MapPin, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && localStorage.getItem("dk_onboarded") === "1") {
      throw redirect({ to: "/" });
    }
  },
  component: Welcome,
});

function Welcome() {
  const handleContinue = () => {
    if (typeof window !== "undefined") localStorage.setItem("dk_onboarded", "1");
  };
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0%, transparent 40%), radial-gradient(circle at 80% 80%, white 0%, transparent 40%)" }} />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-12 text-primary-foreground">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-foreground/15 backdrop-blur-sm">
            <ChefHat className="h-10 w-10" />
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight">Dastarkhan</h1>
          <p className="mt-3 text-lg opacity-90">Discover Pakistan's tables</p>

          <div className="mt-12 space-y-5 text-left">
            <Feature icon={<MapPin className="h-5 w-5" />} title="Find nearby" desc="Restaurants, cafes, bakeries, marquees and more." />
            <Feature icon={<ChefHat className="h-5 w-5" />} title="Browse menus & photos" desc="See what's on offer before you go." />
            <Feature icon={<MessageCircle className="h-5 w-5" />} title="Contact on WhatsApp" desc="One tap to reach the venue directly." />
          </div>
        </div>

        <div className="space-y-3">
          <Link
            to="/pick-city"
            onClick={handleContinue}
            className="block w-full rounded-2xl bg-accent py-4 text-center text-base font-semibold text-accent-foreground shadow-warm transition-transform active:scale-[0.98]"
          >
            Get Started
          </Link>
          <p className="text-center text-xs opacity-80">
            By continuing you agree to our terms & privacy policy
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">{icon}</div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm opacity-85">{desc}</div>
      </div>
    </div>
  );
}
