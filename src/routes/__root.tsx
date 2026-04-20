import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { CityProvider } from "@/lib/city";
import { BottomNav } from "@/components/BottomNav";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-glow"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
      { name: "theme-color", content: "#1f5042" },
      { title: "Dastarkhan — Discover food & venues near you" },
      { name: "description", content: "Discover restaurants, cafes, bakeries, marquees and more across Pakistan. Connect directly with vendors on WhatsApp." },
      { property: "og:title", content: "Dastarkhan — Discover food & venues near you" },
      { property: "og:description", content: "Discover restaurants, cafes, bakeries, marquees and more across Pakistan. Connect directly with vendors on WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dastarkhan — Discover food & venues near you" },
      { name: "twitter:description", content: "Discover restaurants, cafes, bakeries, marquees and more across Pakistan. Connect directly with vendors on WhatsApp." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b2048f6b-08b1-43b0-93f1-cb2aef2817e7/id-preview-8b7abe5a--a2a16151-72b6-4ac3-a790-4da203c1cbd1.lovable.app-1776708952184.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b2048f6b-08b1-43b0-93f1-cb2aef2817e7/id-preview-8b7abe5a--a2a16151-72b6-4ac3-a790-4da203c1cbd1.lovable.app-1776708952184.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <CityProvider>
        <AppShell />
        <Toaster position="top-center" />
      </CityProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  // Hide bottom nav on splash & onboarding routes
  const hideNav = pathname === "/welcome" || pathname === "/login" || pathname === "/pick-city";
  return (
    <div className={hideNav ? "" : "pb-20 md:pb-0"}>
      <Outlet />
      {!hideNav && <BottomNav />}
    </div>
  );
}
