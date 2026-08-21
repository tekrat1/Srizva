import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Toaster } from "sonner";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import RouteProgress from "@/components/RouteProgress";

export const metadata: Metadata = {
  title: "Srizva - Imagine It. Srizva Builds It.",
  description:
    "Type what you want to build. An AI agent plans, architects, and codes it for you - with a live preview, right in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The landing, auth, and onboarding screens always render on the
  // dark aurora canvas by design — the light/dark choice from
  // onboarding only applies inside the signed-in app shell, scoped
  // in app/(root)/layout.tsx, so the default theme here stays dark.
  return (
    <html lang="en" className="dark">
      <head>
        {/* Glitch Drop theme type (hero sections). Loaded via <link>,
            same approach as the theme reference file, so it doesn't
            depend on fetching fonts at build time. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
        <Toaster theme="dark" position="top-center" />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
