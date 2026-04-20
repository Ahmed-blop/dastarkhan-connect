import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CITIES, useCity } from "@/lib/city";
import { MapPin, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/pick-city")({
  component: PickCity,
});

function PickCity() {
  const { setCity } = useCity();
  const navigate = useNavigate();

  const choose = (name: string) => {
    setCity(name);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pt-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl gradient-warm shadow-warm">
            <MapPin className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Where are you?</h1>
          <p className="mt-2 text-muted-foreground">Pick your city to see what's nearby</p>
        </div>

        <div className="space-y-2">
          {CITIES.map((c) => (
            <button
              key={c.name}
              onClick={() => choose(c.name)}
              className="flex w-full items-center justify-between rounded-2xl bg-card px-5 py-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
            >
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">Pakistan</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
