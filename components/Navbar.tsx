"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type NavUser = {
  email?: string;
  role?: string;
};

export default function Navbar() {
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      const supaUser = data.user;
      if (!supaUser) {
        setUser(null);
        return;
      }
      setUser({
        email: supaUser.email ?? undefined,
        role: (supaUser.user_metadata?.role as string | undefined) ?? undefined,
      });
    };

    loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-white">
          BuilderFounder
        </Link>
        <nav className="flex items-center gap-3 text-sm text-slate-200">
          {user && (
            <>
              <Link className="hover:text-white" href="/dashboard">
                Dashboard
              </Link>
              <Link className="hover:text-white" href="/profile">
                Profil
              </Link>
              <Link className="hover:text-white" href="/feed">
                Feed
              </Link>
              {user.role === "idea" && (
                <Link className="hover:text-white" href="/post-idea">
                  Post Idea
                </Link>
              )}
            </>
          )}
          {!user && (
            <>
              <Link className="hover:text-white" href="/login">
                Login
              </Link>
              <Link
                className="rounded-full border border-emerald-400 px-3 py-1 text-emerald-200 hover:border-emerald-300"
                href="/signup"
              >
                Sign up
              </Link>
            </>
          )}
          {user && (
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300 hover:border-slate-500"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
