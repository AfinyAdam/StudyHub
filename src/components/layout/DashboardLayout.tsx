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
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex">

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
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 shrink-0 bg-white border-b border-[#e4e4dc]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-slate-900">
              <GraduationCap size={13} className="text-white" />
            </div>
            <span className="text-slate-900 font-bold text-[15px] tracking-tight">UniLife</span>
          </div>
          <DeadlineNotifier />
        </header>

        {/* Desktop top bar — notifications only, unobtrusive */}
        <header className="hidden lg:flex items-center justify-end px-8 h-11 shrink-0 sticky top-0 z-20 bg-[#f5f5f0] border-b border-[#e4e4dc]/60">
          <DeadlineNotifier />
        </header>

        {/* Page content */}
        <main className={noPadding ? "flex-1" : "flex-1 p-4 sm:p-6 lg:p-8"}>
          {children}
        </main>
      </div>
    </div>
  );
}
