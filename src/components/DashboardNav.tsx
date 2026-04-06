"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Truck,
  ArrowDownCircle,
  BarChart3,
  LogOut,
  User,
  Menu,
  X,
  Shield,
  Key,
  ClipboardCheck,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, sub: "SYS OIL AND PETROLEUMS CORP" },
  {
    href: "/dashboard/cargo-receiving",
    label: "Cargo Receiving / Discharge",
    icon: Truck,
  },
  {
    href: "/dashboard/internal-discharge",
    label: "Internal Discharge",
    icon: ArrowDownCircle,
  },
  {
    href: "/dashboard/cash-receiving",
    label: "Cash Receiving / Discharge",
    icon: Truck,
  },
  { href: "/dashboard/result", label: "Result", icon: BarChart3 },
  {
    href: "/dashboard/pending-confirmations",
    label: "Pending confirmations",
    icon: ClipboardCheck,
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const displayName = user?.name ?? "User";
  const isAdmin = user?.role === "admin";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications?count=1", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && typeof data.unread === "number") setNotifUnread(data.unread);
      } catch {
        if (!cancelled) setNotifUnread(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-4 bg-white border-b border-slate-200 lg:hidden">
        <Link href="/dashboard" className="flex items-baseline gap-1" onClick={closeMobile}>
          <span className="text-xl font-bold text-sky-700">SYS OIL</span>
          <span className="text-xs font-semibold text-sky-800 uppercase tracking-wide">
            AND PETROLEUMS CORP
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Backdrop (mobile only) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Close menu"
        onClick={closeMobile}
        onKeyDown={(e) => e.key === "Escape" && closeMobile()}
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity lg:hidden ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar: overlay on mobile, fixed on desktop */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between lg:block">
          <Link href="/dashboard" className="flex items-baseline gap-1" onClick={closeMobile}>
            <span className="text-2xl font-bold text-sky-700">SYS OIL</span>
            <span className="text-sm font-semibold text-sky-800 uppercase tracking-wide">
              AND PETROLEUMS CORP
            </span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            Logged in as
          </p>
          <p className="font-semibold text-slate-900 truncate" title={displayName}>
            {displayName}
          </p>
          {user?.login_id && (
            <p className="text-sm text-slate-500 truncate">ID: {user.login_id}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Link
              href="/dashboard/pending-confirmations"
              onClick={closeMobile}
              className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              Alerts
              {notifUnread > 0 ? (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {notifUnread > 99 ? "99+" : notifUnread}
                </span>
              ) : null}
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={closeMobile}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-sky-600"
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              Profile
            </Link>
            <Link
              href="/dashboard/change-password"
              onClick={closeMobile}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-sky-600"
            >
              <Key className="w-3.5 h-3.5 shrink-0" />
              Change Password
            </Link>
            {isAdmin && (
              <Link
                href="/dashboard/admin"
                onClick={closeMobile}
                className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                Admin
              </Link>
            )}
            <button
              onClick={() => {
                closeMobile();
                signOut();
              }}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-red-600"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              Sign Out
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              onClick={closeMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                pathname === "/dashboard/admin"
                  ? "bg-amber-50 text-amber-700"
                  : "text-amber-600 hover:bg-amber-50/50"
              }`}
            >
              <Shield className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                <span className="font-medium block truncate">Admin</span>
                <span className="text-xs text-amber-600/80 block truncate">Who is online, all data</span>
              </div>
            </Link>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? "text-sky-600" : "text-slate-500"
                  }`}
                />
                <div className="min-w-0">
                  <span className="font-medium block truncate">{item.label}</span>
                  {item.sub && (
                    <span className="text-xs text-slate-500 block truncate">{item.sub}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 shrink-0">
          <p className="text-xs text-slate-400">SYS OIL AND PETROLEUMS CORP</p>
          <p className="text-xs text-slate-400">Ship Management</p>
        </div>
      </aside>
    </>
  );
}
