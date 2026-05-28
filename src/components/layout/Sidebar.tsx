"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import {
  LayoutDashboard, BookOpen, CheckSquare,
  ClipboardList, Calendar, Wallet,
  User, LogOut, GraduationCap, Star, Clock, Zap, X, FileText, ShieldCheck,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
    ],
  },
  {
    label: "Academic",
    items: [
      { href: "/courses",    label: "Courses",    icon: BookOpen        },
      { href: "/tasks",      label: "Tasks",      icon: CheckSquare     },
      { href: "/attendance", label: "Attendance", icon: ClipboardList   },
      { href: "/grades",     label: "Grades",     icon: Star            },
      { href: "/study",      label: "Study Log",  icon: Clock           },
      { href: "/notes",      label: "Notes",      icon: FileText        },
      { href: "/focus",      label: "Focus",      icon: Zap             },
    ],
  },
  {
    label: "Life",
    items: [
      { href: "/events",     label: "Events",     icon: Calendar        },
      { href: "/finance",    label: "Finance",    icon: Wallet          },
      { href: "/profile",    label: "Profile",    icon: User            },
    ],
  },
];

// Subtle Islamic geometric SVG for the sidebar
function SidebarGeo() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="geo-sidebar" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
          <rect x="4" y="4" width="48" height="48" fill="none"
            stroke="rgba(201,168,76,0.07)" strokeWidth="0.7" />
          <rect x="4" y="4" width="48" height="48" fill="none"
            stroke="rgba(201,168,76,0.05)" strokeWidth="0.5"
            transform="rotate(45 28 28)" />
          <rect x="14" y="14" width="28" height="28" fill="none"
            stroke="rgba(201,168,76,0.05)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo-sidebar)" />
    </svg>
  );
}

export default function Sidebar({
  open = true,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const isAdmin      = profile?.role === "admin";
  const isSuperAdmin = profile?.role === "superadmin";

  const initials = profile?.displayName
    ?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const roleLabel = profile?.role === "superadmin"
    ? "Super Admin"
    : profile?.role === "admin"
    ? "Class Rep"
    : "Student";

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-screen w-64 flex flex-col z-40 select-none transition-transform duration-300",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
      style={{ background: "linear-gradient(180deg, #071710 0%, #0a1f15 40%, #0d2a1d 100%)" }}
    >
      <SidebarGeo />

      {/* Top glow */}
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
          style={{ background: "rgba(201,168,76,0.15)", borderColor: "rgba(201,168,76,0.3)" }}>
          <GraduationCap className="w-4 h-4" style={{ color: "#c9a84c" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] leading-none tracking-tight" style={{ color: "#f5f0e8" }}>UniLife</p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(201,168,76,0.5)" }}>Student Portal</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(245,240,232,0.4)" }}>
          <X size={16} />
        </button>
      </div>

      {/* Divider */}
      <div className="relative z-10 mx-5 mb-4 h-px" style={{ background: "rgba(201,168,76,0.12)" }} />

      {/* Nav */}
      <nav className="relative z-10 flex-1 px-3 overflow-y-auto sidebar-scroll pb-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5"
              style={{ color: "rgba(201,168,76,0.4)" }}>
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 hover:bg-white/5"
                      style={active ? {
                        background: "rgba(201,168,76,0.12)",
                        color: "#c9a84c",
                      } : {
                        color: "rgba(245,240,232,0.5)",
                      }}
                    >
                      <Icon
                        size={15}
                        className="shrink-0"
                        style={{ color: active ? "#c9a84c" : "rgba(245,240,232,0.35)" }}
                      />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Admin-only group */}
        {(isAdmin || isSuperAdmin) && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5"
              style={{ color: "rgba(201,168,76,0.4)" }}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </p>
            <ul className="flex flex-col gap-0.5">
              {isAdmin && (() => {
                const active = pathname === "/admin" || pathname.startsWith("/admin/");
                return (
                  <li>
                    <Link href="/admin" onClick={onClose}
                      className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 hover:bg-white/5"
                      style={active ? { background: "rgba(201,168,76,0.12)", color: "#c9a84c" } : { color: "rgba(245,240,232,0.5)" }}>
                      <ShieldCheck size={15} className="shrink-0"
                        style={{ color: active ? "#c9a84c" : "rgba(245,240,232,0.35)" }} />
                      Admin Panel
                    </Link>
                  </li>
                );
              })()}
              {isSuperAdmin && (() => {
                const active = pathname === "/superadmin" || pathname.startsWith("/superadmin/");
                return (
                  <li>
                    <Link href="/superadmin" onClick={onClose}
                      className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 hover:bg-white/5"
                      style={active ? { background: "rgba(201,168,76,0.12)", color: "#c9a84c" } : { color: "rgba(245,240,232,0.5)" }}>
                      <ShieldCheck size={15} className="shrink-0"
                        style={{ color: active ? "#c9a84c" : "rgba(245,240,232,0.35)" }} />
                      Super Admin
                    </Link>
                  </li>
                );
              })()}
            </ul>
          </div>
        )}
      </nav>

      {/* Divider */}
      <div className="relative z-10 mx-5 h-px" style={{ background: "rgba(201,168,76,0.12)" }} />

      {/* User + Logout */}
      <div className="relative z-10 px-3 pb-5 pt-3">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all mb-1"
          style={{ background: "rgba(201,168,76,0.07)" }}>
          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold border"
            style={{ background: "rgba(201,168,76,0.2)", borderColor: "rgba(201,168,76,0.3)", color: "#c9a84c" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate leading-none" style={{ color: "#f5f0e8" }}>
              {profile?.displayName || "Student"}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(201,168,76,0.5)" }}>
              {roleLabel}
            </p>
          </div>
        </Link>
        <button
          onClick={() => { onClose?.(); logout(); }}
          className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all"
          style={{ color: "rgba(245,240,232,0.35)" }}>
          <LogOut size={14} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
