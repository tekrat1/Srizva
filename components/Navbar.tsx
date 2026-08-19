import Link from "next/link";
import { getCurrentUser } from "@/lib/actions/auth";
import SignOutButton from "./SignOutButton";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Buildify
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="text-muted hover:text-white">
                Dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-muted hover:text-white">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-primary px-4 py-2 font-medium hover:bg-primary-dark"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
