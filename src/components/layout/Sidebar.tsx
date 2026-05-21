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
      { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
    ],
  },
  {
    label: "Academic",
    items: [
      { href: "/courses",    label: "Schedule",    icon: BookOpen        },
      { href: "/tasks",      label: "Tasks",       icon: CheckSquare     },
      { href: "/attendance", label: "Attendance",  icon: ClipboardList   },
      { href: "/grades",     label: "Grades",      icon: Star            },
      { href: "/study",      label: "Study Log",   icon: Clock           },
      { href: "/notes",      label: "Notes",       icon: FileText        },
      { href: "/focus",      label: "Focus Space", icon: Zap             },
    ],
  },
  {
    label: "Life",
    items: [
      { href: "/events",     label: "Events",      icon: Calendar        },
      { href: "/finance",    label: "Finance",     icon: Wallet          },
      { href: "/profile",    label: "Profile",     icon: User            },
    ],
  },
];

export default function Sidebar({
  open = true,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const isAdmin = profile?.role === "admin";

  const initials = profile?.displayName
    ?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 h-screen w-64 flex flex-col z-40 select-none transition-transform duration-300 bg-white border-r border-[#e4e4dc]",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-slate-900">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-900 font-bold text-[15px] leading-none tracking-tight">UniLife</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto sidebar-scroll pb-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5 text-slate-400">
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
                      className={clsx(
                        "flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                        active
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                      )}
                    >
                      <Icon
                        size={15}
                        className={clsx("shrink-0", active ? "text-slate-900" : "text-slate-400")}
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
        {isAdmin && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5 text-slate-400">
              Admin
            </p>
            <ul className="flex flex-col gap-0.5">
              {(() => {
                const active = pathname === "/admin" || pathname.startsWith("/admin/");
                return (
                  <li>
                    <Link
                      href="/admin"
                      onClick={onClose}
                      className={clsx(
                        "flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                        active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                      )}
                    >
                      <ShieldCheck size={15} className={clsx("shrink-0", active ? "text-slate-900" : "text-slate-400")} />
                      Admin Panel
                    </Link>
                  </li>
                );
              })()}
            </ul>
          </div>
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-[#e4e4dc]">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all mb-1 hover:bg-slate-50">
          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white text-[11px] font-bold bg-slate-800">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 text-[13px] font-semibold truncate leading-none">
              {profile?.displayName || "Student"}
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5 capitalize">
              {profile?.role || "student"}
            </p>
          </div>
        </Link>
        <button
          onClick={() => { onClose?.(); logout(); }}
          className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut size={14} className="shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
