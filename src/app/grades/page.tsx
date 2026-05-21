"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getUserGrades, createGrade, updateGrade, deleteGrade,
  getUserCourses,
} from "@/lib/firestore";
import { Grade, Course, AssessmentType } from "@/types";
import {
  GraduationCap, Plus, X, Pencil, Trash2,
  Award, BookOpen, ChevronDown, ChevronUp,
  Calculator, Trash, Download, AlertTriangle, Trophy, TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Constants ───────────────────────────────────────────────
const ASSESSMENT_TYPES: AssessmentType[] = [
  "Quiz", "Assignment", "Midterm", "Final", "Project", "Lab",
];

const TYPE_COLORS: Record<AssessmentType, string> = {
  Quiz:       "bg-blue-100 text-blue-700",
  Assignment: "bg-violet-100 text-violet-700",
  Midterm:    "bg-amber-100 text-amber-700",
  Final:      "bg-red-100 text-red-700",
  Project:    "bg-green-100 text-green-700",
  Lab:        "bg-teal-100 text-teal-700",
};

const pct    = (s: number, t: number) => t > 0 ? (s / t) * 100 : 0;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function letterGrade(p: number) {
  if (p >= 90) return { letter: "A",  gpa: 4.0, color: "text-green-600"  };
  if (p >= 80) return { letter: "B",  gpa: 3.0, color: "text-blue-600"   };
  if (p >= 70) return { letter: "C",  gpa: 2.0, color: "text-amber-600"  };
  if (p >= 60) return { letter: "D",  gpa: 1.0, color: "text-orange-600" };
  return               { letter: "F",  gpa: 0.0, color: "text-red-600"    };
}

function gradeBarColor(p: number) {
  if (p >= 80) return "bg-green-500";
  if (p >= 70) return "bg-blue-500";
  if (p >= 60) return "bg-amber-500";
  return "bg-red-500";
}

const BLANK = {
  courseId: "", title: "", type: "Assignment" as AssessmentType,
  score: "", total: "100", date: new Date().toISOString().split("T")[0],
};

// ─── Grade Row ───────────────────────────────────────────────
function GradeRow({
  grade, onEdit, onDelete,
}: {
  grade: Grade;
  onEdit: (g: Grade) => void;
  onDelete: (id: string) => void;
}) {
  const p   = pct(grade.score, grade.total);
  const lg  = letterGrade(p);
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-gray-800">{grade.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{grade.date}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[grade.type]}`}>
          {grade.type}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 font-medium">
        {grade.score} / {grade.total}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
            <div className={`h-1.5 rounded-full ${gradeBarColor(p)}`} style={{ width: `${p}%` }} />
          </div>
          <span className="text-sm font-semibold text-gray-700 w-12 text-right">{fmtPct(p)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-base font-bold ${lg.color}`}>{lg.letter}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(grade)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(grade.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Course Section ───────────────────────────────────────────
function CourseSection({
  course, grades, onAdd, onEdit, onDelete,
}: {
  course: Course;
  grades: Grade[];
  onAdd:  (courseId: string) => void;
  onEdit: (g: Grade) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const avg  = grades.length
    ? grades.reduce((s, g) => s + pct(g.score, g.total), 0) / grades.length
    : null;
  const lg   = avg !== null ? letterGrade(avg) : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{course.name}</p>
            <p className="text-xs text-gray-400">{course.code} · {grades.length} assessment{grades.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {avg !== null && (
            <div className="text-right hidden sm:block">
              <p className={`text-xl font-bold ${lg!.color}`}>{lg!.letter}</p>
              <p className="text-xs text-gray-400">{fmtPct(avg)} · {lg!.gpa.toFixed(1)} GPA</p>
            </div>
          )}
          <button
            onClick={e => { e.stopPropagation(); onAdd(course.id); }}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Plus size={12} /> Add
          </button>
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Average bar */}
      {avg !== null && (
        <div className="px-5 pb-2">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${gradeBarColor(avg)}`} style={{ width: `${avg}%` }} />
          </div>
        </div>
      )}

      {/* Grade table */}
      {open && (
        grades.length === 0 ? (
          <div className="px-5 py-6 text-center border-t border-gray-50">
            <p className="text-sm text-gray-400">No grades yet —{" "}
              <button onClick={() => onAdd(course.id)} className="text-blue-600 hover:underline font-medium">add one</button>
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-50 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assessment</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">Progress</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {grades
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(g => (
                    <GradeRow key={g.id} grade={g} onEdit={onEdit} onDelete={onDelete} />
                  ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─── GPA Calculator ──────────────────────────────────────────
const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F":  0.0,
};
const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

interface CalcRow { id: number; course: string; credits: string; grade: string; }

function GPACalculator() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CalcRow[]>([
    { id: 1, course: "", credits: "3", grade: "A" },
    { id: 2, course: "", credits: "3", grade: "B" },
  ]);
  const nextId = () => Date.now();

  const addRow = () =>
    setRows(r => [...r, { id: nextId(), course: "", credits: "3", grade: "A" }]);

  const removeRow = (id: number) =>
    setRows(r => r.filter(x => x.id !== id));

  const update = (id: number, field: keyof CalcRow, value: string) =>
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));

  const validRows = rows.filter(r => {
    const cr = parseFloat(r.credits);
    return !isNaN(cr) && cr > 0 && GRADE_POINTS[r.grade] !== undefined;
  });

  const totalCredits = validRows.reduce((s, r) => s + parseFloat(r.credits), 0);
  const gpa = totalCredits > 0
    ? validRows.reduce((s, r) => s + GRADE_POINTS[r.grade] * parseFloat(r.credits), 0) / totalCredits
    : null;

  const gpaColor = gpa === null ? "text-slate-400"
    : gpa >= 3.5 ? "text-green-600"
    : gpa >= 3.0 ? "text-blue-600"
    : gpa >= 2.0 ? "text-amber-600"
    : "text-red-600";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
            <Calculator className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">GPA Calculator</p>
            <p className="text-xs text-gray-400">Estimate your semester GPA by credits</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {gpa !== null && open && (
            <span className={`text-xl font-bold ${gpaColor}`}>{gpa.toFixed(2)}</span>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-5">
          {/* Result banner */}
          {gpa !== null && (
            <div className={`rounded-2xl px-5 py-4 mb-5 flex items-center justify-between ${
              gpa >= 3.5 ? "bg-green-50" : gpa >= 3.0 ? "bg-blue-50" : gpa >= 2.0 ? "bg-amber-50" : "bg-red-50"
            }`}>
              <div>
                <p className="text-xs text-gray-500 font-medium">Estimated GPA</p>
                <p className={`text-4xl font-bold ${gpaColor}`}>{gpa.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">out of 4.00 · {totalCredits} credits</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Scale</p>
                {[
                  ["3.5–4.0", "Distinction"],
                  ["3.0–3.4", "Merit"],
                  ["2.0–2.9", "Pass"],
                  ["0.0–1.9", "Fail"],
                ].map(([range, label]) => (
                  <p key={range} className="text-[11px] text-gray-400">{range} — {label}</p>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-[1fr_80px_90px_32px] gap-2 px-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Course</p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Credits</p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Grade</p>
              <div />
            </div>
            {rows.map(row => (
              <div key={row.id} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                <input
                  value={row.course}
                  onChange={e => update(row.id, "course", e.target.value)}
                  placeholder="Course name"
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                />
                <input
                  type="number" min="1" max="6" step="0.5"
                  value={row.credits}
                  onChange={e => update(row.id, "credits", e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white text-center"
                />
                <select
                  value={row.grade}
                  onChange={e => update(row.id, "grade", e.target.value)}
                  className="px-2 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white">
                  {GRADE_OPTIONS.map(g => (
                    <option key={g} value={g}>{g} ({GRADE_POINTS[g].toFixed(1)})</option>
                  ))}
                </select>
                <button onClick={() => removeRow(row.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-1">
            <Plus size={15} /> Add course
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────
function GradeModal({
  courses, initial, onClose, onSave, saving,
}: {
  courses: Course[];
  initial: typeof BLANK & { id?: string; courseId: string };
  onClose: () => void;
  onSave:  (form: typeof BLANK) => Promise<void>;
  saving:  boolean;
}) {
  const [form, setForm] = useState(initial);
  const isEdit = !!initial.id;

  const scoreNum = parseFloat(form.score);
  const totalNum = parseFloat(form.total);
  const preview  = !isNaN(scoreNum) && !isNaN(totalNum) && totalNum > 0
    ? pct(scoreNum, totalNum) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId)     return toast.error("Select a course");
    if (!form.title)        return toast.error("Enter a title");
    const s = parseFloat(form.score);
    const t = parseFloat(form.total);
    if (isNaN(s) || isNaN(t) || t <= 0) return toast.error("Enter valid score and total");
    if (s > t)              return toast.error("Score cannot exceed total");
    await onSave({ ...form, score: String(s), total: String(t) });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Grade" : "Add Grade"}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Record an assessment result</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Course */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Course *</label>
            <select value={form.courseId} onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white">
              <option value="">Select a course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>

          {/* Title + Type */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Title *" placeholder="e.g. Quiz 1" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as AssessmentType }))}
                className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white">
                {ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Score / Total */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Score *" type="number" min="0" step="0.5" placeholder="e.g. 85"
              value={form.score} onChange={e => setForm(p => ({ ...p, score: e.target.value }))} />
            <Input label="Out of *" type="number" min="1" step="0.5" placeholder="e.g. 100"
              value={form.total} onChange={e => setForm(p => ({ ...p, total: e.target.value }))} />
          </div>

          {/* Live preview */}
          {preview !== null && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
              preview >= 80 ? "bg-green-50" : preview >= 60 ? "bg-amber-50" : "bg-red-50"
            }`}>
              <div>
                <p className="text-xs text-gray-500">Result preview</p>
                <p className={`text-2xl font-bold ${letterGrade(preview).color}`}>
                  {letterGrade(preview).letter}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${letterGrade(preview).color}`}>{fmtPct(preview)}</p>
                <p className="text-xs text-gray-400">GPA {letterGrade(preview).gpa.toFixed(1)}</p>
              </div>
            </div>
          )}

          <Input label="Date *" type="date" value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
            <Button type="submit" fullWidth loading={saving}>{isEdit ? "Save" : "Add Grade"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────
export default function GradesPage() {
  const { user, profile } = useAuth();
  const [grades,    setGrades]    = useState<Grade[]>([]);
  const [courses,   setCourses]   = useState<Course[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<Grade | null>(null);
  const [prefillCourse, setPrefillCourse] = useState("");

  const load = async () => {
    if (!user) return;
    try {
      const [g, c] = await Promise.all([getUserGrades(user.uid), getUserCourses(user.uid, profile?.classId)]);
      setGrades(g);
      setCourses(c);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const openAdd = (courseId = "") => {
    setEditing(null);
    setPrefillCourse(courseId);
    setShowModal(true);
  };
  const openEdit = (g: Grade) => { setEditing(g); setPrefillCourse(g.courseId); setShowModal(true); };
  const close    = () => { setShowModal(false); setEditing(null); setPrefillCourse(""); };

  const handleSave = async (form: typeof BLANK) => {
    setSaving(true);
    try {
      const payload = {
        courseId: form.courseId,
        title:    form.title,
        type:     form.type,
        score:    parseFloat(form.score),
        total:    parseFloat(form.total),
        date:     form.date,
      };
      if (editing) {
        await updateGrade(editing.id, payload);
        toast.success("Grade updated!");
      } else {
        await createGrade({ ...payload, userId: user!.uid, createdAt: new Date().toISOString() });
        toast.success("Grade added!");
      }
      close();
      load();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this grade?")) return;
    try { await deleteGrade(id); toast.success("Deleted!"); load(); }
    catch { toast.error("Failed to delete"); }
  };

  const exportCSV = () => {
    const header = ["Date", "Course", "Title", "Type", "Score", "Total", "Percentage", "Letter"];
    const rows = grades.map(g => {
      const course = courses.find(c => c.id === g.courseId);
      const p = pct(g.score, g.total);
      return [
        g.date,
        course ? `${course.code} - ${course.name}` : g.courseId,
        g.title,
        g.type,
        g.score,
        g.total,
        p.toFixed(1) + "%",
        letterGrade(p).letter,
      ];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "grades.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Summary stats ─────────────────────────────────────────
  const allPcts    = grades.map(g => pct(g.score, g.total));
  const overallAvg = allPcts.length ? allPcts.reduce((s, p) => s + p, 0) / allPcts.length : null;
  const overallLG  = overallAvg !== null ? letterGrade(overallAvg) : null;
  const overallGPA = overallAvg !== null ? letterGrade(overallAvg).gpa : null;

  const best  = allPcts.length ? Math.max(...allPcts) : null;
  const worst = allPcts.length ? Math.min(...allPcts) : null;

  // ── Needs attention (below 60%) ───────────────────────────
  const needsAttention = grades
    .filter(g => pct(g.score, g.total) < 60)
    .sort((a, b) => pct(a.score, a.total) - pct(b.score, b.total));

  // ── Best / worst course ───────────────────────────────────
  const courseAvgs = courses.map(c => {
    const cGrades = grades.filter(g => g.courseId === c.id);
    const avg = cGrades.length
      ? cGrades.reduce((s, g) => s + pct(g.score, g.total), 0) / cGrades.length
      : null;
    return { course: c, avg };
  }).filter(x => x.avg !== null) as { course: Course; avg: number }[];

  const bestCourse  = courseAvgs.length ? courseAvgs.reduce((a, b) => a.avg >= b.avg ? a : b) : null;
  const worstCourse = courseAvgs.length ? courseAvgs.reduce((a, b) => a.avg <= b.avg ? a : b) : null;

  // ── Type breakdown chart ──────────────────────────────────
  const typeChartData = ASSESSMENT_TYPES.map(type => {
    const typeGrades = grades.filter(g => g.type === type);
    const avg = typeGrades.length
      ? typeGrades.reduce((s, g) => s + pct(g.score, g.total), 0) / typeGrades.length
      : null;
    return { type, avg: avg !== null ? parseFloat(avg.toFixed(1)) : null, count: typeGrades.length };
  }).filter(d => d.avg !== null) as { type: string; avg: number; count: number }[];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
          <p className="text-gray-500 text-sm mt-1">
            {grades.length} assessment{grades.length !== 1 ? "s" : ""} across {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {grades.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-xl transition-colors">
              <Download size={15} /> Export CSV
            </button>
          )}
          <Button onClick={() => openAdd()}>
            <Plus size={16} /> Add Grade
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {overallAvg !== null && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-gray-500 font-medium">Overall Grade</p>
            </div>
            <p className={`text-4xl font-bold ${overallLG!.color}`}>{overallLG!.letter}</p>
            <p className="text-sm text-gray-400 mt-1">{fmtPct(overallAvg)} · {overallGPA!.toFixed(2)} / 4.00</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Average Score</p>
            <p className="text-2xl font-bold text-gray-900">{fmtPct(overallAvg)}</p>
            <p className="text-xs text-gray-400 mt-1">across all assessments</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-green-500" />
              <p className="text-xs text-gray-500 font-medium">Best Course</p>
            </div>
            {bestCourse ? (
              <>
                <p className="text-sm font-bold text-green-600 truncate">{bestCourse.course.code}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{bestCourse.course.name}</p>
                <p className="text-lg font-bold text-green-600 mt-1">{fmtPct(bestCourse.avg)}</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-green-600">{fmtPct(best!)}</p>
            )}
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <p className="text-xs text-gray-500 font-medium">Needs Work</p>
            </div>
            {worstCourse ? (
              <>
                <p className={`text-sm font-bold truncate ${letterGrade(worstCourse.avg).color}`}>{worstCourse.course.code}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{worstCourse.course.name}</p>
                <p className={`text-lg font-bold mt-1 ${letterGrade(worstCourse.avg).color}`}>{fmtPct(worstCourse.avg)}</p>
              </>
            ) : (
              <p className={`text-2xl font-bold ${letterGrade(worst!).color}`}>{fmtPct(worst!)}</p>
            )}
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <h3 className="font-semibold text-red-800 text-sm">Needs Attention — Below 60%</h3>
          </div>
          <div className="flex flex-col gap-2">
            {needsAttention.map(g => {
              const course = courses.find(c => c.id === g.courseId);
              const p = pct(g.score, g.total);
              return (
                <div key={g.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-red-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{g.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {course ? `${course.code} · ` : ""}{g.type} · {g.date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-red-600">{g.score} / {g.total}</p>
                    <p className="text-xs text-red-400">{fmtPct(p)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Type breakdown chart */}
      {typeChartData.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Average by Assessment Type</h3>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={typeChartData} barSize={32} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(v) => [`${v}%`, "Avg Score"]}
              />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}
                shape={(props: any) => {
                  const { x, y, width, height, avg } = props;
                  const fill = avg >= 80 ? "#22c55e" : avg >= 70 ? "#3b82f6" : avg >= 60 ? "#f59e0b" : "#ef4444";
                  return <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 flex-wrap">
            {typeChartData.map(d => (
              <div key={d.type} className="flex items-center gap-1.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[d.type as AssessmentType]}`}>{d.type}</span>
                <span className="text-[11px] text-gray-400">{d.count} · {d.avg}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GPA Calculator */}
      <GPACalculator />

      {/* Per-course sections */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">No courses yet</h2>
          <p className="text-gray-400 text-sm mb-2">Add courses in your schedule first, then track grades here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {courses.map(course => (
            <CourseSection
              key={course.id}
              course={course}
              grades={grades.filter(g => g.courseId === course.id)}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <GradeModal
          courses={courses}
          initial={editing
            ? { id: editing.id, courseId: editing.courseId, title: editing.title, type: editing.type,
                score: String(editing.score), total: String(editing.total), date: editing.date }
            : { ...BLANK, courseId: prefillCourse }
          }
          onClose={close}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </DashboardLayout>
  );
}
