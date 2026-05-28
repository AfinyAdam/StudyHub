"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getAttendance, markAttendance, updateAttendance, getUserCourses } from "@/lib/firestore";
import { AttendanceRecord, Course } from "@/types";
import {
  ClipboardList, Plus, X, CheckCircle2, XCircle, Clock,
  AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Config ──────────────────────────────────────────────────
const STATUS = {
  present: {
    label: "Present", short: "P",
    icon: CheckCircle2,
    text: "text-green-600", bg: "bg-green-50", border: "border-green-200",
    badge: "bg-green-100 text-green-700",
    bar: "#16a34a",
  },
  absent: {
    label: "Absent", short: "A",
    icon: XCircle,
    text: "text-red-600", bg: "bg-red-50", border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    bar: "#dc2626",
  },
  late: {
    label: "Late", short: "L",
    icon: Clock,
    text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    bar: "#d97706",
  },
} as const;

const INPUT_CLS = "w-full px-4 py-2.5 rounded-xl border border-[#e8e4da] text-sm text-slate-800 outline-none transition-all focus:border-[#0e3326] focus:ring-2 focus:ring-[rgba(14,51,38,0.07)] bg-white";

function rateColor(r: number) {
  return r >= 80 ? "#16a34a" : r >= 60 ? "#d97706" : "#dc2626";
}
function rateBg(r: number) {
  return r >= 80 ? "bg-green-50 text-green-700" : r >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
}

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ value, label, icon: Icon, color, bg }: {
  value: string | number; label: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e8e4da] card-lift">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-[26px] font-bold leading-none mb-1 text-slate-900">{value}</p>
      <p className="text-[12px] text-slate-400 font-medium">{label}</p>
    </div>
  );
}

export default function AttendancePage() {
  const { user, profile } = useAuth();
  const [records,      setRecords]      = useState<AttendanceRecord[]>([]);
  const [courses,      setCourses]      = useState<Course[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [courseFilter, setCourseFilter] = useState("all");
  const [form, setForm] = useState({
    courseId: "",
    date:     new Date().toISOString().split("T")[0],
    status:   "present" as AttendanceRecord["status"],
  });

  const load = async () => {
    if (!user) return;
    try {
      const [r, c] = await Promise.all([
        getAttendance(user.uid),
        getUserCourses(user.uid, profile?.classId),
      ]);
      setRecords(r);
      setCourses(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const handleMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !form.date) return toast.error("Please fill in all fields");
    const exists = records.find(r => r.courseId === form.courseId && r.date === form.date);
    setSaving(true);
    try {
      if (exists) {
        await updateAttendance(exists.id, { status: form.status });
        toast.success("Attendance updated!");
      } else {
        await markAttendance({
          userId: user!.uid, courseId: form.courseId,
          date: form.date, status: form.status, markedBy: user!.uid,
        });
        toast.success("Attendance marked!");
      }
      setShowModal(false);
      load();
    } catch { toast.error("Failed to mark attendance"); }
    finally { setSaving(false); }
  };

  // ── Derived stats ─────────────────────────────────────────
  const present = records.filter(r => r.status === "present").length;
  const absent  = records.filter(r => r.status === "absent").length;
  const late    = records.filter(r => r.status === "late").length;
  const rate    = records.length ? Math.round(((present + late) / records.length) * 100) : 0;

  const courseStats = courses.map(c => {
    const cr    = records.filter(r => r.courseId === c.id);
    const cp    = cr.filter(r => r.status === "present").length;
    const cl    = cr.filter(r => r.status === "late").length;
    const cRate = cr.length ? Math.round(((cp + cl) / cr.length) * 100) : null;
    const sessionsNeeded = cRate !== null && cRate < 75
      ? Math.ceil((0.75 * cr.length - (cp + cl)) / 0.25)
      : 0;
    return { course: c, total: cr.length, present: cp, late: cl, rate: cRate, sessionsNeeded };
  }).filter(x => x.total > 0);

  const atRisk = courseStats.filter(x => x.rate !== null && x.rate < 75);

  const sorted = [...records]
    .filter(r => courseFilter === "all" || r.courseId === courseFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCourse = (id: string) => courses.find(c => c.id === id);

  // Group records by month
  const grouped = sorted.reduce<Record<string, AttendanceRecord[]>>((acc, r) => {
    const key = r.date.slice(0, 7); // YYYY-MM
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const monthLabel = (key: string) =>
    new Date(key + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <DashboardLayout>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900 leading-tight">Attendance</h1>
          <p className="text-[13px] text-slate-400 mt-1">
            {records.length} record{records.length !== 1 ? "s" : ""} across {courseStats.length} course{courseStats.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, #0e3326, #175c3a)" }}>
          <Plus size={15} /> Mark Attendance
        </button>
      </div>

      {/* ── Stat row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger">
        <StatCard value={`${rate}%`} label="Attendance Rate"
          icon={rate >= 75 ? TrendingUp : TrendingDown}
          color={rateColor(rate)} bg={rate >= 75 ? "#f0fdf4" : "#fef2f2"} />
        <StatCard value={present} label="Present"
          icon={CheckCircle2} color="#16a34a" bg="#f0fdf4" />
        <StatCard value={absent}  label="Absent"
          icon={XCircle}     color="#dc2626" bg="#fef2f2" />
        <StatCard value={late}    label="Late"
          icon={Clock}       color="#d97706" bg="#fffbeb" />
      </div>

      {/* ── Overall progress bar ───────────────────────────── */}
      {records.length > 0 && (
        <div className="bg-white rounded-2xl px-5 py-4 border border-[#e8e4da] mb-4 card-lift">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[13px] font-semibold text-slate-700">Overall Attendance Rate</p>
            <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${rateBg(rate)}`}>
              {rate}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${rate}%`, background: rateColor(rate) }} />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-[11px] text-slate-400">{present + late} attended · {absent} missed</p>
            <p className="text-[11px] text-slate-400">Target: 75%</p>
          </div>
        </div>
      )}

      {/* ── At-risk banner ─────────────────────────────────── */}
      {atRisk.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle size={14} className="text-red-600" />
            </div>
            <p className="text-sm font-semibold text-red-800">
              {atRisk.length} course{atRisk.length > 1 ? "s" : ""} below 75%
            </p>
          </div>
          <div className="space-y-2">
            {atRisk.map(({ course, rate: r, total, present: p, late: l, sessionsNeeded }) => (
              <div key={course.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100">
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{course.code}
                    <span className="text-slate-400 font-normal ml-1.5 text-xs">{course.name}</span>
                  </p>
                  <p className="text-[11px] text-red-500 mt-0.5">
                    {sessionsNeeded} more session{sessionsNeeded !== 1 ? "s" : ""} needed to reach 75%
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-600">{r}%</p>
                  <p className="text-[11px] text-red-400">{p + l}/{total} attended</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Per-course breakdown ───────────────────────────── */}
      {courseStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e8e4da] mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f5f2ec]">
            <p className="text-[13px] font-semibold text-slate-800">By Course</p>
          </div>
          <div className="divide-y divide-[#f8f5f0]">
            {courseStats.map(({ course, rate: r, total, present: p, late: l }) => (
              <div key={course.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: "rgba(14,51,38,0.08)", color: "#0e3326" }}>
                      {course.code}
                    </span>
                    <span className="text-[12px] text-slate-500 truncate">{course.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[11px] text-slate-400">{p + l}/{total}</span>
                    <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${r === null ? "text-slate-400" : rateBg(r)}`}>
                      {r ?? "—"}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${r ?? 0}%`, background: r === null ? "#cbd5e1" : rateColor(r) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Course filter pills ────────────────────────────── */}
      {courses.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {["all", ...courses.map(c => c.id)].map(id => {
            const label = id === "all" ? "All" : (courses.find(c => c.id === id)?.code || id);
            const active = courseFilter === id;
            return (
              <button key={id} onClick={() => setCourseFilter(id)}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-[0.97]"
                style={active
                  ? { background: "linear-gradient(135deg, #0e3326, #175c3a)", color: "#fff" }
                  : { background: "#fff", color: "#64748b", border: "1px solid #e8e4da" }}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Records ────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-2xl border border-[#e8e4da] animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #0e3326, #175c3a)" }}>
            <ClipboardList size={28} className="text-white/70" />
          </div>
          <p className="font-semibold text-slate-600">No attendance records yet</p>
          <p className="text-sm text-slate-400 mt-1">Start tracking your class attendance</p>
          <button onClick={() => setShowModal(true)}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #0e3326, #175c3a)" }}>
            <Plus size={15} /> Mark First Attendance
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([month, recs]) => (
            <div key={month}>
              {/* Month header */}
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                {monthLabel(month)}
              </p>
              <div className="bg-white rounded-2xl border border-[#e8e4da] overflow-hidden">
                <ul className="divide-y divide-[#f8f5f0]">
                  {recs.map(record => {
                    const cfg    = STATUS[record.status];
                    const Icon   = cfg.icon;
                    const course = getCourse(record.courseId);
                    const d      = new Date(record.date);
                    return (
                      <li key={record.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#faf8f4] transition-colors">
                        {/* Date badge */}
                        <div className="w-11 shrink-0 flex flex-col items-center justify-center bg-[#f5f2ec] rounded-xl py-1.5">
                          <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider leading-none">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-[18px] font-bold text-slate-800 leading-tight">
                            {d.getDate()}
                          </span>
                          <span className="text-[9px] text-slate-400 leading-none">
                            {d.toLocaleDateString("en-US", { weekday: "short" })}
                          </span>
                        </div>

                        {/* Course info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {course && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                                style={{ background: "rgba(14,51,38,0.08)", color: "#0e3326" }}>
                                {course.code}
                              </span>
                            )}
                            <span className="text-[13px] font-medium text-slate-700 truncate">
                              {course?.name || "Unknown Course"}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full ${cfg.badge}`}>
                          <Icon size={12} />
                          {cfg.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f5f2ec]">
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">Mark Attendance</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">Record your attendance for a session</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleMark} className="px-6 py-5 flex flex-col gap-4">
              {/* Course */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Course *
                </label>
                <select value={form.courseId}
                  onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                  className={INPUT_CLS}>
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  Date *
                </label>
                <input type="date" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className={INPUT_CLS} />
              </div>

              {/* Status picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["present", "absent", "late"] as const).map(s => {
                    const cfg    = STATUS[s];
                    const Icon   = cfg.icon;
                    const active = form.status === s;
                    return (
                      <button key={s} type="button"
                        onClick={() => setForm(p => ({ ...p, status: s }))}
                        className={`flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 text-[12px] font-semibold transition-all active:scale-[0.97] ${
                          active
                            ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                            : "bg-white border-[#e8e4da] text-slate-400 hover:bg-slate-50"
                        }`}>
                        <Icon size={18} className={active ? cfg.text : "text-slate-300"} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#e8e4da] text-sm font-semibold text-slate-600 hover:bg-[#f5f2ec] active:scale-[0.97] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #0e3326, #175c3a)" }}>
                  {saving
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
