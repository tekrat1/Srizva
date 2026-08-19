import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Buildify - Describe it, get a live website",
  description:
    "Type what you want to build. An AI agent plans, architects, and codes it for you - with a live preview, right in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
