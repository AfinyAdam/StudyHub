"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import DeadlineNotifier from "./DeadlineNotifier";
import { useFCM } from "@/hooks/useFCM";
import { Menu, GraduationCap } from "lucide-react";

export default function DashboardLayout({
  children,
  noPadding = false,
}: {
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  const { user, loading } = useAuth();
  useFCM(user?.uid);
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  // Close sidebar whenever the route changes (mobile nav tap)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#faf8f3" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(14,51,38,0.15)", borderTopColor: "#0e3326" }} />
          <p className="text-sm" style={{ color: "rgba(14,51,38,0.4)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#faf8f3" }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 shrink-0 border-b"
          style={{ background: "#0a1f15", borderColor: "rgba(201,168,76,0.15)" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "rgba(245,240,232,0.6)" }}>
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md flex items-center justify-center border"
              style={{ background: "rgba(201,168,76,0.15)", borderColor: "rgba(201,168,76,0.3)" }}>
              <GraduationCap size={13} style={{ color: "#c9a84c" }} />
            </div>
            <span className="font-bold text-[15px] tracking-tight" style={{ color: "#f5f0e8" }}>UniLife</span>
          </div>
          <DeadlineNotifier />
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-end px-8 h-11 shrink-0 sticky top-0 z-20 border-b"
          style={{ background: "linear-gradient(180deg, #0a1f15 0%, #0e3326 100%)", borderColor: "rgba(201,168,76,0.12)" }}>
          <DeadlineNotifier />
        </header>

        {/* Page content */}
        <main className={noPadding ? "flex-1" : "flex-1 p-4 sm:p-6 lg:p-8"}>
          <div key={pathname} className="page-fade h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
