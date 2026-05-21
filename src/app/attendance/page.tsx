"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getAttendance, markAttendance, updateAttendance, getUserCourses } from "@/lib/firestore";
import { AttendanceRecord, Course } from "@/types";
import { ClipboardList, Plus, X, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

const STATUS_CONFIG = {
  present: { label: "Present", icon: CheckCircle2, iconClass: "text-green-500", badge: "bg-green-100 text-green-700" },
  absent:  { label: "Absent",  icon: XCircle,      iconClass: "text-red-500",   badge: "bg-red-100 text-red-700"   },
  late:    { label: "Late",    icon: Clock,         iconClass: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
} as const;

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
        getAttendance(user.uid), getUserCourses(user.uid, profile?.classId),
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
        await markAttendance({ userId: user!.uid, courseId: form.courseId, date: form.date, status: form.status, markedBy: user!.uid });
        toast.success("Attendance marked!");
      }
      setShowModal(false);
      load();
    } catch { toast.error("Failed to mark attendance"); }
    finally { setSaving(false); }
  };

  const sorted = [...records]
    .filter(r => courseFilter === "all" || r.courseId === courseFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || "Unknown";
  const getCourseCode = (id: string) => courses.find(c => c.id === id)?.code || "—";

  const present = records.filter(r => r.status === "present").length;
  const absent  = records.filter(r => r.status === "absent").length;
  const late    = records.filter(r => r.status === "late").length;
  const rate    = records.length ? Math.round((present / records.length) * 100) : 0;

  // Per-course stats
  const [expandCourses, setExpandCourses] = useState(false);
  const courseStats = courses.map(c => {
    const cr      = records.filter(r => r.courseId === c.id);
    const cp      = cr.filter(r => r.status === "present").length;
    const cRate   = cr.length ? Math.round((cp / cr.length) * 100) : null;
    return { course: c, total: cr.length, present: cp, rate: cRate };
  }).filter(x => x.total > 0);

  const atRiskCourses = courseStats.filter(x => x.rate !== null && x.rate < 75);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">{records.length} total records</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Mark Attendance
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Attendance Rate", value: `${rate}%`,  color: rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600", bg: "bg-green-50" },
          { label: "Present",         value: present,      color: "text-green-600", bg: "bg-green-50"  },
          { label: "Absent",          value: absent,       color: "text-red-600",   bg: "bg-red-50"    },
          { label: "Late",            value: late,         color: "text-amber-600", bg: "bg-amber-50"  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* At-risk warning banner */}
      {atRiskCourses.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <h3 className="font-semibold text-red-800 text-sm">
              {atRiskCourses.length} course{atRiskCourses.length > 1 ? "s" : ""} below 75% attendance
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {atRiskCourses.map(({ course, rate: r, total, present: p }) => (
              <div key={course.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-red-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{course.code}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{course.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-red-600">{r}%</p>
                  <p className="text-xs text-red-400">{p} / {total} present</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate bar */}
      {records.length > 0 && (
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Overall Attendance</p>
            <p className={`text-sm font-bold ${rate >= 80 ? "text-green-600" : rate >= 60 ? "text-amber-600" : "text-red-600"}`}>{rate}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${rate >= 80 ? "bg-green-500" : rate >= 60 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Per-course breakdown */}
      {courseStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-5 overflow-hidden">
          <button
            onClick={() => setExpandCourses(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <p className="text-sm font-semibold text-gray-800">Per-Course Breakdown</p>
            {expandCourses ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {expandCourses && (
            <div className="border-t border-gray-100 px-5 py-4 flex flex-col gap-4">
              {courseStats.map(({ course, rate: r, total, present: p }) => (
                <div key={course.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{course.code}</span>
                      <span className="text-xs text-gray-400 ml-2">{course.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r !== null && r < 75 && (
                        <AlertTriangle size={13} className="text-red-500" />
                      )}
                      <span className={`text-sm font-bold ${r === null ? "text-gray-400" : r >= 75 ? "text-green-600" : "text-red-600"}`}>
                        {r ?? "—"}%
                      </span>
                      <span className="text-xs text-gray-400">{p}/{total}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${r === null ? "bg-gray-300" : r >= 75 ? "bg-green-500" : "bg-red-500"}`}
                      style={{ width: `${r ?? 0}%` }}
                    />
                  </div>
                  {r !== null && r < 75 && (
                    <p className="text-[11px] text-red-500 mt-1">
                      Need {Math.ceil((0.75 * total - p) / (1 - 0.75))} more present sessions to reach 75%
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Course Filter */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {["all", ...courses.map(c => c.id)].map(id => {
          const label = id === "all" ? "All" : (courses.find(c => c.id === id)?.code || id);
          return (
            <button key={id} onClick={() => setCourseFilter(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                courseFilter === id ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Records */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">No attendance records yet</p>
          <Button className="mt-5" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Mark First Attendance
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(record => {
                const cfg = STATUS_CONFIG[record.status];
                const Icon = cfg.icon;
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-800">
                      {new Date(record.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {getCourseCode(record.courseId)}
                      </span>
                      <span className="text-gray-500 ml-2 text-xs">{getCourseName(record.courseId)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}>
                        <Icon size={12} className={cfg.iconClass} />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mark Attendance</h2>
                <p className="text-sm text-gray-400 mt-0.5">Record your attendance for a session</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleMark} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Course *</label>
                <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white">
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">Status *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["present", "absent", "late"] as const).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                      <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s }))}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-all ${
                          form.status === s ? `${cfg.badge} border-current` : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Icon size={18} className={form.status === s ? cfg.iconClass : "text-gray-400"} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 mt-1">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" fullWidth loading={saving}>Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
