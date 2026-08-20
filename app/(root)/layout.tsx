import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";

export default async function RootGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const isLight = cookieStore.get("theme")?.value === "light";

  return (
    <div className={`min-h-screen ${isLight ? "theme-light" : ""}`}>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
