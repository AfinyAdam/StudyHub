"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getUserStudyLogs, createStudyLog, deleteStudyLog, getUserCourses,
  getFocusNotes, saveFocusNote, updateFocusNote, deleteFocusNote,
} from "@/lib/firestore";
import { StudyLog, Course, FocusNote } from "@/types";
import {
  BookOpen, Plus, X, Trash2, Clock, Flame, Calendar,
  FileText, Pencil, Save, Search,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const COURSE_COLORS = [
  "#3B82F6","#8B5CF6","#10B981","#F59E0B",
  "#EF4444","#06B6D4","#F97316","#EC4899",
];

function getWeekDates() {
  const today = new Date();
  const day   = today.getDay();
  const mon   = new Date(today);
  mon.setDate(today.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const DAYS_LABEL = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const TODAY      = new Date().toISOString().split("T")[0];

function calcStreak(logs: StudyLog[]) {
  const dateset = new Set(logs.map(l => l.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split("T")[0];
    if (!dateset.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ─── Note modal (create / edit) ───────────────────────────────
function NoteModal({
  initial, courses, onClose, onSave,
}: {
  initial?: FocusNote;
  courses: Course[];
  onClose: () => void;
  onSave: (data: { title: string; content: string; courseId?: string; date: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title:    initial?.title    ?? "",
    content:  initial?.content  ?? "",
    courseId: (initial as any)?.courseId ?? "",
    date:     initial?.date     ?? TODAY,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.title.trim())   return toast.error("Title is required");
    if (!form.content.trim()) return toast.error("Content is required");
    setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit Note" : "New Study Note"}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Capture what you learned</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <Input label="Title *" placeholder="e.g. Chapter 4 — Data Structures"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Course</label>
              <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white">
                <option value="">No course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <Input label="Date" type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Content *</label>
            <textarea
              rows={8}
              placeholder="Write your notes here…"
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
            <Button type="submit" fullWidth loading={saving}>
              <Save size={15} /> {initial ? "Save Changes" : "Create Note"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function StudyPage() {
  const { user } = useAuth();
  const [logs,        setLogs]        = useState<StudyLog[]>([]);
  const [notes,       setNotes]       = useState<FocusNote[]>([]);
  const [courses,     setCourses]     = useState<Course[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [tab,         setTab]         = useState<"sessions" | "notes">("sessions");
  const [showSession, setShowSession] = useState(false);
  const [showNote,    setShowNote]    = useState(false);
  const [editNote,    setEditNote]    = useState<FocusNote | null>(null);
  const [noteSearch,  setNoteSearch]  = useState("");
  const [noteCourse,  setNoteCourse]  = useState("all");
  const [weekDates]                   = useState(getWeekDates());
  const [form, setForm] = useState({ courseId: "", date: TODAY, hours: "", note: "" });

  const load = async () => {
    if (!user) return;
    try {
      const [l, c, n] = await Promise.all([
        getUserStudyLogs(user.uid),
        getUserCourses(user.uid),
        getFocusNotes(user.uid),
      ]);
      setLogs(l); setCourses(c); setNotes(n);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  // ── Session handlers ──────────────────────────────────────
  const handleCreateSession = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const h = parseFloat(form.hours);
    if (!form.courseId)     return toast.error("Select a course");
    if (isNaN(h) || h <= 0) return toast.error("Enter valid hours");
    if (h > 24)             return toast.error("Hours cannot exceed 24");
    setSaving(true);
    try {
      await createStudyLog({
        userId: user!.uid, courseId: form.courseId,
        date: form.date, hours: h, note: form.note,
        createdAt: new Date().toISOString(),
      });
      toast.success("Study session logged!");
      setShowSession(false);
      setForm({ courseId: "", date: TODAY, hours: "", note: "" });
      load();
    } catch { toast.error("Failed to log session"); }
    finally { setSaving(false); }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Delete this log?")) return;
    try { await deleteStudyLog(id); toast.success("Deleted!"); load(); }
    catch { toast.error("Failed to delete"); }
  };

  // ── Note handlers ─────────────────────────────────────────
  const handleSaveNote = async (data: { title: string; content: string; courseId?: string; date: string }) => {
    const now = new Date().toISOString();
    if (editNote) {
      await updateFocusNote(editNote.id, { ...data, updatedAt: now });
      toast.success("Note updated!");
      setEditNote(null);
    } else {
      await saveFocusNote({ userId: user!.uid, ...data, createdAt: now, updatedAt: now } as any);
      toast.success("Note saved!");
      setShowNote(false);
    }
    load();
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try { await deleteFocusNote(id); toast.success("Note deleted!"); load(); }
    catch { toast.error("Failed to delete"); }
  };

  // ── Stats ─────────────────────────────────────────────────
  const totalHours = logs.reduce((s, l) => s + l.hours, 0);
  const weekHours  = logs.filter(l => weekDates.includes(l.date)).reduce((s, l) => s + l.hours, 0);
  const todayHours = logs.filter(l => l.date === TODAY).reduce((s, l) => s + l.hours, 0);
  const streak     = calcStreak(logs);

  const weekData = weekDates.map((date, i) => ({
    day: DAYS_LABEL[i],
    hours: logs.filter(l => l.date === date).reduce((s, l) => s + l.hours, 0),
  }));

  const byCourse = courses.map((c, i) => ({
    course: c,
    hours: logs.filter(l => l.courseId === c.id).reduce((s, l) => s + l.hours, 0),
    color: COURSE_COLORS[i % COURSE_COLORS.length],
  })).filter(x => x.hours > 0).sort((a, b) => b.hours - a.hours);

  const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const getCourse = (id: string) => courses.find(c => c.id === id);

  // Filtered notes
  const filteredNotes = notes
    .filter(n => {
      const matchSearch = n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
                          n.content.toLowerCase().includes(noteSearch.toLowerCase());
      const matchCourse = noteCourse === "all" || (n as any).courseId === noteCourse;
      return matchSearch && matchCourse;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Study</h1>
          <p className="text-gray-500 text-sm mt-1">Track sessions and capture notes</p>
        </div>
        <Button onClick={() => tab === "notes" ? setShowNote(true) : setShowSession(true)}>
          <Plus size={16} /> {tab === "notes" ? "New Note" : "Log Session"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Flame,      label: "Study Streak",  value: `${streak}d`,                color: "text-orange-600", bg: "bg-orange-50",  sub: streak > 3 ? "On fire! 🔥" : "Keep it up!" },
          { icon: Clock,      label: "Today",          value: `${todayHours.toFixed(1)}h`, color: "text-blue-600",   bg: "bg-blue-50",   sub: "hours studied"   },
          { icon: Calendar,   label: "This Week",      value: `${weekHours.toFixed(1)}h`,  color: "text-violet-600", bg: "bg-violet-50", sub: "hours this week" },
          { icon: FileText,   label: "Study Notes",    value: notes.length,                color: "text-green-600",  bg: "bg-green-50",  sub: `${logs.length} sessions`  },
        ].map(({ icon: Icon, label, value, color, bg, sub }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {(["sessions", "notes"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "sessions" ? "📊 Sessions" : "📝 Notes"}
          </button>
        ))}
      </div>

      {/* ── SESSIONS TAB ──────────────────────────────────── */}
      {tab === "sessions" && (
        <>
          {logs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4">This Week</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weekData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip formatter={(v: any) => [`${v}h`, "Hours"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }} />
                    <Bar dataKey="hours" radius={[6,6,0,0]} maxBarSize={48} fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h2 className="font-semibold text-gray-900 mb-4">By Course</h2>
                {byCourse.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {byCourse.map(({ course, hours, color }) => (
                      <div key={course.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{course.code}</span>
                          <span className="text-xs text-gray-500 font-semibold">{hours.toFixed(1)}h</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${(hours / totalHours) * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">All Sessions</h2>
              <span className="text-sm text-gray-400">{logs.length} total</span>
            </div>
            {loading ? (
              <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">No sessions logged yet</h3>
                <p className="text-sm text-gray-400 mb-5">Start logging your study sessions to build your streak.</p>
                <Button onClick={() => setShowSession(true)}><Plus size={16} /> Log First Session</Button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recent.map(log => {
                  const c = getCourse(log.courseId);
                  return (
                    <li key={log.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                      <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {c && <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{c.code}</span>}
                          {log.note && <span className="text-xs text-gray-400 truncate">{log.note}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(log.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-gray-900">{log.hours}h</p>
                        <p className="text-xs text-gray-400">
                          {log.hours >= 1 ? `${Math.floor(log.hours)}h ${Math.round((log.hours % 1) * 60)}m` : `${Math.round(log.hours * 60)}m`}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteSession(log.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ── NOTES TAB ─────────────────────────────────────── */}
      {tab === "notes" && (
        <>
          {/* Search + filter */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search notes…"
                value={noteSearch}
                onChange={e => setNoteSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white"
              />
            </div>
            {courses.length > 0 && (
              <select value={noteCourse} onChange={e => setNoteCourse(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white text-gray-600">
                <option value="all">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">
                {noteSearch || noteCourse !== "all" ? "No notes match your search" : "No notes yet"}
              </h3>
              <p className="text-sm text-gray-400 mb-5">Capture what you learn during study sessions.</p>
              <Button onClick={() => setShowNote(true)}><Plus size={16} /> Create First Note</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNotes.map(note => {
                const course = getCourse((note as any).courseId);
                return (
                  <div key={note.id}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">{note.title}</h3>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditNote(note)}
                          className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-500 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDeleteNote(note.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-4 flex-1 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        {course && (
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{course.code}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(note.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Log Session Modal ──────────────────────────────── */}
      {showSession && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Log Study Session</h2>
                <p className="text-sm text-gray-400 mt-0.5">Record a study session for a course</p>
              </div>
              <button onClick={() => setShowSession(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSession} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Course *</label>
                <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                  className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white">
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Hours *</label>
                  <div className="relative">
                    <input type="number" step="0.5" min="0.5" max="24" placeholder="e.g. 1.5"
                      value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
                      className="w-full px-3 pr-10 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">hrs</span>
                  </div>
                  {form.hours && !isNaN(parseFloat(form.hours)) && (
                    <p className="text-xs text-gray-400">= {Math.floor(parseFloat(form.hours))}h {Math.round((parseFloat(form.hours) % 1) * 60)}m</p>
                  )}
                </div>
                <Input label="Date *" type="date" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <Input label="Notes (optional)" placeholder="e.g. Chapter 4 revision"
                value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowSession(false)}>Cancel</Button>
                <Button type="submit" fullWidth loading={saving}>Log Session</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Note Modals ────────────────────────────────────── */}
      {showNote && (
        <NoteModal courses={courses} onClose={() => setShowNote(false)} onSave={handleSaveNote} />
      )}
      {editNote && (
        <NoteModal initial={editNote} courses={courses} onClose={() => setEditNote(null)} onSave={handleSaveNote} />
      )}
    </DashboardLayout>
  );
}
