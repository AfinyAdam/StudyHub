"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminRequest } from "@/types";
import {
  Crown, Users, GraduationCap, ShieldCheck, Building2,
  UserCheck, UserX, Clock, AlertCircle, Check, X,
  ChevronDown, Search, LogOut, Trash2, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

async function apiFetch(path: string, options?: RequestInit) {
  const { getAuth } = await import("firebase/auth");
  const token = await getAuth().currentUser?.getIdToken();
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

type Tab       = "overview" | "requests" | "users" | "classes";
type ReqFilter = "pending" | "approved" | "rejected";
type RoleFilter = "all" | "student" | "admin" | "superadmin";

const ROLE_STYLES: Record<string, string> = {
  student:    "bg-[rgba(14,51,38,0.07)] text-[#0e3326]",
  admin:      "bg-amber-50 text-amber-700",
  superadmin: "bg-violet-100 text-violet-700",
};
const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

// ─── Role-change confirmation modal ──────────────────────────
function RoleChangeModal({
  user: target,
  newRole,
  hasClass,
  onConfirm,
  onCancel,
}: {
  user: { uid: string; displayName: string; email: string; role: string };
  newRole: string;
  hasClass: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isDemotion = target.role === "admin" && newRole !== "admin";
  const isSuperadmin = newRole === "superadmin";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Change Role</h2>
            <p className="text-xs text-slate-400">This takes effect immediately</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-3">
          Change <span className="font-semibold text-slate-800">{target.displayName || target.email}</span>'s role
          from <span className="font-semibold capitalize">{target.role === "admin" ? "Class Rep" : target.role}</span> to{" "}
          <span className="font-semibold capitalize">{newRole === "admin" ? "Class Rep" : newRole}</span>?
        </p>

        {isDemotion && hasClass && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-3">
            <p className="text-xs text-red-600 font-medium">
              Warning: This user manages a class. Removing their Class Rep role will leave the class without an admin.
            </p>
          </div>
        )}
        {isSuperadmin && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2.5 mb-3">
            <p className="text-xs text-violet-700 font-medium">
              Super Admin has full system access including approving class rep requests and deleting classes.
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110"
            style={{
              background: isSuperadmin ? "#7c3aed" : isDemotion ? "#ef4444" : "linear-gradient(135deg, #0e3326, #0f4535)"
            }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { profile, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [tab,        setTab]        = useState<Tab>("overview");
  const [reqFilter,  setReqFilter]  = useState<ReqFilter>("pending");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [stats,      setStats]      = useState<any>(null);
  const [requests,   setRequests]   = useState<AdminRequest[]>([]);
  const [users,      setUsers]      = useState<any[]>([]);
  const [classes,    setClasses]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [acting,     setActing]     = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [expanded,   setExpanded]   = useState<string | null>(null);

  // Rejection flow state
  const [rejectTarget,  setRejectTarget]  = useState<AdminRequest | null>(null);
  const [rejectNote,    setRejectNote]    = useState("");
  const [rejectSaving,  setRejectSaving]  = useState(false);

  // Role-change modal state
  const [roleModal, setRoleModal] = useState<{
    user: any; newRole: string; hasClass: boolean;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && profile && profile.role !== "superadmin") router.replace("/dashboard");
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (profile?.role !== "superadmin") return;
    setLoading(true);
    const load = async () => {
      if (tab === "overview") {
        const res = await apiFetch("/api/superadmin/stats");
        if (res.ok) setStats(await res.json());
      } else if (tab === "requests") {
        const res = await apiFetch(`/api/admin-requests?status=${reqFilter}`);
        setRequests(res.ok ? await res.json() : []);
      } else if (tab === "users") {
        const res = await apiFetch("/api/superadmin/users");
        setUsers(res.ok ? await res.json() : []);
      } else if (tab === "classes") {
        const res = await apiFetch("/api/superadmin/classes");
        setClasses(res.ok ? await res.json() : []);
      }
    };
    load().finally(() => setLoading(false));
  }, [tab, reqFilter, profile]);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      const res = await apiFetch(`/api/admin-requests/${id}`, {
        method: "PATCH", body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Approved — user is now a class rep");
      const res2 = await apiFetch(`/api/admin-requests?status=${reqFilter}`);
      setRequests(res2.ok ? await res2.json() : []);
      const s = await apiFetch("/api/superadmin/stats");
      if (s.ok) setStats(await s.json());
    } catch { toast.error("Failed"); }
    finally { setActing(null); }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejectSaving(true);
    try {
      const res = await apiFetch(`/api/admin-requests/${rejectTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reject", rejectionNote: rejectNote.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Request rejected");
      setRejectTarget(null);
      setRejectNote("");
      const res2 = await apiFetch(`/api/admin-requests?status=${reqFilter}`);
      setRequests(res2.ok ? await res2.json() : []);
      const s = await apiFetch("/api/superadmin/stats");
      if (s.ok) setStats(await s.json());
    } catch { toast.error("Failed"); }
    finally { setRejectSaving(false); }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Delete class "${name}"? All students will be removed from the class.`)) return;
    setActing(id);
    try {
      const res = await apiFetch(`/api/superadmin/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Class deleted");
      setClasses(prev => prev.filter((c: any) => c.id !== id));
      const s = await apiFetch("/api/superadmin/stats");
      if (s.ok) setStats(await s.json());
    } catch { toast.error("Failed to delete class"); }
    finally { setActing(null); }
  };

  const confirmRoleChange = async () => {
    if (!roleModal) return;
    const { user: target, newRole } = roleModal;
    setRoleModal(null);
    setActing(target.uid);
    try {
      const res = await apiFetch("/api/superadmin/users", {
        method: "PATCH", body: JSON.stringify({ targetUid: target.uid, role: newRole }),
      });
      if (!res.ok) throw new Error();
      toast.success("Role updated");
      setUsers(prev => prev.map(u => u.uid === target.uid ? { ...u, role: newRole } : u));
    } catch { toast.error("Failed to update role"); }
    finally { setActing(null); }
  };

  const requestRoleChange = (u: any, newRole: string) => {
    if (newRole === u.role) return;
    const hasClass = !!u.classId;
    setRoleModal({ user: u, newRole, hasClass });
  };

  if (authLoading || !profile) return null;
  if (profile.role !== "superadmin") return null;

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview"  },
    { key: "requests", label: "Requests"  },
    { key: "users",    label: "Users"     },
    { key: "classes",  label: "Classes"   },
  ];

  const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
    { key: "all",        label: "All"         },
    { key: "student",    label: "Students"    },
    { key: "admin",      label: "Class Reps"  },
    { key: "superadmin", label: "Super Admin" },
  ];

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const matchesRole   = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Role-change modal */}
      {roleModal && (
        <RoleChangeModal
          user={roleModal.user}
          newRole={roleModal.newRole}
          hasClass={roleModal.hasClass}
          onConfirm={confirmRoleChange}
          onCancel={() => setRoleModal(null)}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Reject Application</h2>
              <button onClick={() => { setRejectTarget(null); setRejectNote(""); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Rejecting <span className="font-semibold">{rejectTarget.displayName}</span>'s application for{" "}
              <span className="font-semibold">{rejectTarget.className}</span>.
            </p>
            <p className="text-xs text-slate-400 mb-3">Optionally explain why — the applicant will see this.</p>
            <textarea
              rows={3}
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="e.g. A class rep for this cohort already exists."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 outline-none focus:border-slate-400 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setRejectTarget(null); setRejectNote(""); }} disabled={rejectSaving}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleRejectConfirm} disabled={rejectSaving}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                {rejectSaving ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <header className="bg-white border-b border-[#e4e4dc] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-none">UniLife</p>
            <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider mt-0.5">Super Admin</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 hidden sm:block">{profile.displayName || profile.email}</span>
          <button onClick={() => { logout(); router.push("/auth/login"); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-[#e4e4dc] rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all relative"
              style={tab === t.key
                ? { background: "linear-gradient(135deg, #0e3326, #0f4535)", color: "#fff" }
                : { color: "#64748b" }}>
              {t.label}
              {t.key === "requests" && stats?.pendingReqs > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {stats.pendingReqs}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview ─────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-[#e4e4dc]" />)}
              </div>
            ) : stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { icon: Users,        label: "Total Users",  value: stats.totalUsers,    color: "bg-[rgba(14,51,38,0.07)] text-[#0e3326]"    },
                    { icon: GraduationCap, label: "Students",    value: stats.totalStudents, color: "bg-green-50 text-green-600"  },
                    { icon: ShieldCheck,  label: "Class Reps",   value: stats.totalAdmins,   color: "bg-amber-50 text-amber-600"  },
                    { icon: Building2,    label: "Classes",      value: stats.totalClasses,  color: "bg-violet-50 text-violet-600"},
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-[#e4e4dc] p-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                        <Icon size={16} />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
                      <p className="text-xs text-slate-400 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-[#e4e4dc] p-5">
                  <h3 className="font-semibold text-slate-800 text-sm mb-4">Class Rep Applications</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Pending",  value: stats.pendingReqs,  icon: Clock,     bg: "bg-amber-50", text: "text-amber-600" },
                      { label: "Approved", value: stats.approvedReqs, icon: UserCheck, bg: "bg-green-50", text: "text-green-600" },
                      { label: "Rejected", value: stats.rejectedReqs, icon: UserX,     bg: "bg-red-50",   text: "text-red-500"   },
                    ].map(({ label, value, icon: Icon, bg, text }) => (
                      <div key={label} className={`rounded-xl p-4 ${bg}`}>
                        <Icon size={15} className={text} />
                        <p className={`text-2xl font-bold mt-2 leading-none ${text}`}>{value}</p>
                        <p className="text-xs text-slate-500 mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                  {stats.pendingReqs > 0 && (
                    <button onClick={() => setTab("requests")}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2.5 hover:bg-amber-100 transition-colors">
                      <AlertCircle size={14} />
                      {stats.pendingReqs} pending request{stats.pendingReqs !== 1 ? "s" : ""} — review now
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Requests ─────────────────────────────────────── */}
        {tab === "requests" && (
          <div className="space-y-3">
            <div className="flex gap-1 bg-white border border-[#e4e4dc] rounded-xl p-1 w-fit mb-4">
              {(["pending","approved","rejected"] as ReqFilter[]).map(f => (
                <button key={f} onClick={() => setReqFilter(f)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                  style={reqFilter === f
                    ? { background: "linear-gradient(135deg, #0e3326, #0f4535)", color: "#fff" }
                    : { color: "#64748b" }}>{f}</button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-[#e4e4dc]" />)}</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">No {reqFilter} requests.</div>
            ) : requests.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-[#e4e4dc] overflow-hidden">
                <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    {(r.displayName || r.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{r.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{r.email} · {r.className}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    <span className="text-xs text-slate-300">{new Date(r.createdAt).toLocaleDateString()}</span>
                    <ChevronDown size={13} className={`text-slate-400 transition-transform ${expanded === r.id ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {expanded === r.id && (
                  <div className="border-t border-[#e4e4dc] px-5 py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Class</p>
                        <p className="text-sm font-medium text-slate-700">{r.className}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Major</p>
                        <p className="text-sm font-medium text-slate-700">{r.major}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Reason</p>
                      <p className="text-sm text-slate-600">{r.reason}</p>
                    </div>
                    {r.rejectionNote && (
                      <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                        <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-1">Rejection Note</p>
                        <p className="text-sm text-red-700">{r.rejectionNote}</p>
                      </div>
                    )}
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => { setRejectTarget(r); setRejectNote(""); }} disabled={acting === r.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50">
                          <X size={13} /> Reject
                        </button>
                        <button onClick={() => handleApprove(r.id)} disabled={acting === r.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
                          <Check size={13} /> Approve
                        </button>
                      </div>
                    )}
                    {r.reviewedAt && (
                      <p className="text-[11px] text-slate-400">
                        {r.status === "approved" ? "Approved" : "Rejected"} on {new Date(r.reviewedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Users ────────────────────────────────────────── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search by name or email..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#e4e4dc] bg-white text-sm outline-none focus:border-slate-400" />
              </div>
              <div className="flex gap-1 bg-white border border-[#e4e4dc] rounded-xl p-1 shrink-0">
                {ROLE_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setRoleFilter(f.key)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                    style={roleFilter === f.key
                      ? { background: "linear-gradient(135deg, #0e3326, #0f4535)", color: "#fff" }
                      : { color: "#64748b" }}>{f.label}</button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-[#e4e4dc]" />)}</div>
            ) : (
              <>
                <p className="text-xs text-slate-400">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</p>
                <div className="bg-white rounded-xl border border-[#e4e4dc] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#e4e4dc]">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Class</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Joined</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.uid} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                {(u.displayName || u.email || "?").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-sm truncate">{u.displayName || "—"}</p>
                                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                            {u.className || <span className="text-slate-300">No class</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_STYLES[u.role] ?? "bg-slate-100 text-slate-500"}`}>
                              {u.role === "admin" ? "Class Rep" : u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <select value={u.role} disabled={acting === u.uid}
                              onChange={e => requestRoleChange(u, e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 outline-none cursor-pointer disabled:opacity-50">
                              <option value="student">Student</option>
                              <option value="admin">Class Rep</option>
                              <option value="superadmin">Super Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Classes ──────────────────────────────────────── */}
        {tab === "classes" && (
          <div className="space-y-3">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1,2,3].map(i => <div key={i} className="h-36 bg-white rounded-xl animate-pulse border border-[#e4e4dc]" />)}
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">No classes yet.</div>
            ) : (
              <>
                <p className="text-xs text-slate-400">{classes.length} class{classes.length !== 1 ? "es" : ""}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {classes.map((cls: any) => (
                    <div key={cls.id} className="bg-white rounded-xl border border-[#e4e4dc] p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{cls.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{cls.major}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-[#0e3326] bg-[rgba(14,51,38,0.08)] px-2.5 py-1 rounded-lg text-sm tracking-widest">
                            {cls.joinCode}
                          </span>
                          <button onClick={() => handleDeleteClass(cls.id, cls.name)} disabled={acting === cls.id}
                            title="Delete class"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Students</p>
                          <p className="text-xl font-bold text-slate-800 mt-0.5">{cls.studentCount}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Class Rep</p>
                          <p className="text-sm font-medium text-slate-700 mt-0.5 truncate">{cls.adminName}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-3">Created {new Date(cls.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
