import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

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
      <body>
        {children}
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
