import { cookies } from "next/headers";
import Navbar from "@/components/Navbar";
import VerifyEmailBanner from "@/components/auth/VerifyEmailBanner";
import { getCurrentUser } from "@/lib/actions/auth";

export default async function RootGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const isLight = cookieStore.get("theme")?.value === "light";
  const user = await getCurrentUser();
  const showVerifyBanner =
    !!user && user.signInProvider === "password" && !user.emailVerified;

  return (
    <div className={`min-h-screen ${isLight ? "theme-light" : ""}`}>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {showVerifyBanner && <VerifyEmailBanner email={user!.email} />}
        {children}
      </main>
    </div>
  );
}
