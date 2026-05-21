"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getFocusNotes, saveFocusNote, updateFocusNote,
  deleteFocusNote, getUserCourses,
} from "@/lib/firestore";
import { FocusNote, Course } from "@/types";
import {
  Plus, X, Trash2, Pencil, Save, Search,
  FileText, BookOpen, Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const TODAY = new Date().toISOString().split("T")[0];

const NOTE_COLORS = [
  { label: "Blue",   value: "blue",   card: "bg-blue-50 border-blue-100",   tag: "bg-blue-100 text-blue-700"   },
  { label: "Purple", value: "purple", card: "bg-purple-50 border-purple-100", tag: "bg-purple-100 text-purple-700" },
  { label: "Green",  value: "green",  card: "bg-green-50 border-green-100",  tag: "bg-green-100 text-green-700"  },
  { label: "Amber",  value: "amber",  card: "bg-amber-50 border-amber-100",  tag: "bg-amber-100 text-amber-700"  },
  { label: "Pink",   value: "pink",   card: "bg-pink-50 border-pink-100",    tag: "bg-pink-100 text-pink-700"    },
  { label: "White",  value: "white",  card: "bg-white border-gray-100",      tag: "bg-gray-100 text-gray-600"    },
];

const getColor = (val?: string) => NOTE_COLORS.find(c => c.value === val) ?? NOTE_COLORS[5];

// ─── Note Form Modal ──────────────────────────────────────────
function NoteModal({
  initial, courses, onClose, onSave,
}: {
  initial?: FocusNote & { courseId?: string; color?: string };
  courses: Course[];
  onClose: () => void;
  onSave: (data: {
    title: string; content: string; courseId: string;
    date: string; color: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title:    initial?.title    ?? "",
    content:  initial?.content  ?? "",
    courseId: (initial as any)?.courseId ?? "",
    date:     initial?.date     ?? TODAY,
    color:    (initial as any)?.color ?? "white",
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
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{initial ? "Edit Note" : "New Note"}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Capture your thoughts and learnings</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          {/* Title */}
          <Input label="Title *" placeholder="e.g. Chapter 4 — Binary Trees"
            value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />

          {/* Course + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Course</label>
              <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white">
                <option value="">No course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <Input label="Date" type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <div className="flex gap-2 flex-wrap">
              {NOTE_COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setForm(p => ({ ...p, color: c.value }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    form.color === c.value ? "border-blue-500 scale-110" : "border-transparent"
                  } ${c.card}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Content *</label>
            <textarea rows={10} placeholder="Write your notes here…"
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed"
            />
          </div>

          <div className="flex gap-3 pt-1 shrink-0">
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

// ─── View Modal ───────────────────────────────────────────────
function NoteViewModal({
  note, courses, onClose, onEdit, onDelete,
}: {
  note: FocusNote & { courseId?: string; color?: string };
  courses: Course[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const course = courses.find(c => c.id === note.courseId);
  const col = getColor(note.color);
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] border ${col.card}`}>
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-black/5 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{note.title}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {course && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.tag}`}>{course.code}</span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar size={11} />
                {new Date(note.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onEdit}
              className="w-8 h-8 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete}
              className="w-8 h-8 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-500 transition-colors">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function NotesPage() {
  const { user } = useAuth();
  const [notes,    setNotes]    = useState<(FocusNote & { courseId?: string; color?: string })[]>([]);
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);
  const [editing,  setEditing]  = useState<(FocusNote & { courseId?: string; color?: string }) | null>(null);
  const [viewing,  setViewing]  = useState<(FocusNote & { courseId?: string; color?: string }) | null>(null);
  const [search,   setSearch]   = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterColor,  setFilterColor]  = useState("all");

  const load = async () => {
    if (!user) return;
    try {
      const [n, c] = await Promise.all([getFocusNotes(user.uid), getUserCourses(user.uid)]);
      setNotes(n as any);
      setCourses(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async (data: { title: string; content: string; courseId: string; date: string; color: string }) => {
    const now = new Date().toISOString();
    if (editing) {
      await updateFocusNote(editing.id, { ...data, updatedAt: now });
      toast.success("Note updated!");
      setEditing(null);
      setViewing(null);
    } else {
      await saveFocusNote({ userId: user!.uid, ...data, createdAt: now, updatedAt: now } as any);
      toast.success("Note created!");
      setShowNew(false);
    }
    load();
  };

  const handleDelete = async (note: FocusNote) => {
    if (!confirm(`Delete "${note.title}"?`)) return;
    try {
      await deleteFocusNote(note.id);
      toast.success("Note deleted!");
      setViewing(null);
      load();
    } catch { toast.error("Failed to delete"); }
  };

  const filtered = notes
    .filter(n => {
      const q = search.toLowerCase();
      const matchSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      const matchCourse = filterCourse === "all" || n.courseId === filterCourse;
      const matchColor  = filterColor  === "all" || (n as any).color === filterColor;
      return matchSearch && matchCourse && matchColor;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-gray-500 text-sm mt-1">{notes.length} note{notes.length !== 1 ? "s" : ""} saved</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} /> New Note
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white" />
        </div>
        {courses.length > 0 && (
          <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white text-gray-600">
            <option value="all">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        )}
        <select value={filterColor} onChange={e => setFilterColor(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white text-gray-600">
          <option value="all">All Colors</option>
          {NOTE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Notes grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">
            {search || filterCourse !== "all" ? "No notes match your search" : "No notes yet"}
          </h3>
          <p className="text-sm text-gray-400 mb-5">Create your first note to start building your knowledge base.</p>
          <Button onClick={() => setShowNew(true)}><Plus size={16} /> Create First Note</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(note => {
            const col    = getColor((note as any).color);
            const course = courses.find(c => c.id === note.courseId);
            return (
              <div key={note.id}
                onClick={() => setViewing(note)}
                className={`rounded-2xl border p-5 cursor-pointer hover:shadow-md transition-all group flex flex-col min-h-[160px] ${col.card}`}>
                {/* Title */}
                <h3 className="font-semibold text-gray-900 leading-snug mb-2 line-clamp-2">{note.title}</h3>
                {/* Content preview */}
                <p className="text-sm text-gray-500 line-clamp-3 flex-1 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
                  <div className="flex items-center gap-1.5">
                    {course && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.tag}`}>{course.code}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {new Date(note.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {/* Action buttons — visible on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditing(note); setViewing(null); }}
                        className="w-6 h-6 rounded-lg bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600 transition-colors">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => handleDelete(note)}
                        className="w-6 h-6 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-500 transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NoteModal courses={courses} onClose={() => setShowNew(false)} onSave={handleSave} />
      )}
      {editing && (
        <NoteModal initial={editing} courses={courses} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
      {viewing && !editing && (
        <NoteViewModal
          note={viewing}
          courses={courses}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onDelete={() => handleDelete(viewing)}
        />
      )}
    </DashboardLayout>
  );
}
