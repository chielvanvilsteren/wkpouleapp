"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";
import type { Profile } from "@/types";
import WavingFlag from "./WavingFlag";

type Props = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
};

function NavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative px-3 py-2 text-sm font-medium transition-colors rounded-lg
        ${
          active
            ? "text-white"
            : "text-white/65 hover:text-white hover:bg-white/8"
        }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-oranje-400 rounded-full" />
      )}
    </Link>
  );
}

export default function Navbar({ user, profile }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const close = () => setMenuOpen(false);
  const initial = profile?.display_name?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="sticky top-0 z-50 bg-knvb-700/95 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-15 py-2.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 shrink-0">
              <WavingFlag className="rounded" />
            </div>
            <div className="flex items-center gap-1.5 font-jetbrains">
              <span className="font-black text-white text-base tracking-tight">
                WK Pool
              </span>
              <span className="neon-pixel text-base tracking-tight">
                2026
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/ranglijst">Ranglijst</NavLink>

            {user && profile?.is_deelnemer !== false && (
              <>
                <NavLink href="/mijn-voorspelling">Pre-Pool</NavLink>
                <NavLink href="/wk-poule">WK Poule</NavLink>
              </>
            )}

            {user && profile?.is_admin && (
              <NavLink href="/admin">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-oranje-400" />
                  Admin
                </span>
              </NavLink>
            )}

            {user ? (
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-white/15">
                {/* Avatar chip */}
                <div className="flex items-center gap-2 bg-white/10 rounded-full pl-1 pr-3 py-1">
                  <span className="w-6 h-6 rounded-full bg-oranje-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {initial}
                  </span>
                  <span className="text-sm text-white/80 font-medium">
                    {profile?.display_name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  {loggingOut ? "..." : "Uitloggen"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-3">
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Inloggen
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-oranje-500 hover:bg-oranje-600 text-white transition-colors"
                >
                  Aanmelden
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: avatar initial + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <span className="w-7 h-7 rounded-full bg-oranje-500 flex items-center justify-center text-xs font-bold text-white">
                {initial}
              </span>
            )}
            <button
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-0.5">
            <MobileLink href="/ranglijst" onClick={close}>
              Ranglijst
            </MobileLink>

            {user && profile?.is_deelnemer !== false && (
              <>
                <MobileLink href="/mijn-voorspelling" onClick={close}>
                  Pre-Pool
                </MobileLink>
                <MobileLink href="/wk-poule" onClick={close}>
                  WK Poule
                </MobileLink>
              </>
            )}

            {user && profile?.is_admin && (
              <MobileLink href="/admin" onClick={close}>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-oranje-400" />
                  Admin
                </span>
              </MobileLink>
            )}

            {user ? (
              <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between px-3">
                <span className="text-sm text-white/60">
                  {profile?.display_name}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="text-sm text-white/60 hover:text-white transition-colors disabled:opacity-40"
                >
                  {loggingOut ? "Uitloggen..." : "Uitloggen"}
                </button>
              </div>
            ) : (
              <div className="pt-3 mt-2 border-t border-white/10 flex gap-2 px-1">
                <Link
                  href="/login"
                  onClick={close}
                  className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
                >
                  Inloggen
                </Link>
                <Link
                  href="/register"
                  onClick={close}
                  className="flex-1 text-center px-3 py-2 rounded-lg text-sm font-semibold bg-oranje-500 hover:bg-oranje-600 text-white transition-colors"
                >
                  Aanmelden
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
        ${active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
    >
      {children}
    </Link>
  );
}
