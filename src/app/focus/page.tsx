"use client";

import {
  useEffect, useRef, useState, useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getUserCourses, getUserTasks, updateTask,
  getFocusNotes, saveFocusNote, updateFocusNote, deleteFocusNote, createStudyLog,
} from "@/lib/firestore";
import { Course, Task } from "@/types";
import {
  Play, Pause, RotateCcw, CheckCircle2,
  Volume2, VolumeX, Target, Sparkles, AlertTriangle,
  NotebookPen, ListTodo, BarChart2, X, Pencil, SkipForward,
  Plus, Trash2, ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Themes ───────────────────────────────────────────────────
const THEMES = [
  { key: "space",   label: "Deep Space", emoji: "🌌",
    bg: "linear-gradient(135deg,#060d1f 0%,#0d1a3a 55%,#060d1f 100%)",
    card: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.1)",
    text: "#e2e8f0", muted: "#94a3b8", accent: "#6366f1",
    timerColor: "#818cf8", trackColor: "rgba(255,255,255,0.08)" },
  { key: "forest",  label: "Forest",     emoji: "🌿",
    bg: "linear-gradient(135deg,#071410 0%,#0d2b1e 55%,#071410 100%)",
    card: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.1)",
    text: "#e2e8f0", muted: "#86efac", accent: "#22c55e",
    timerColor: "#4ade80", trackColor: "rgba(255,255,255,0.08)" },
  { key: "ocean",   label: "Ocean",      emoji: "🌊",
    bg: "linear-gradient(135deg,#020e1f 0%,#05213d 55%,#020e1f 100%)",
    card: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.1)",
    text: "#e2e8f0", muted: "#7dd3fc", accent: "#0ea5e9",
    timerColor: "#38bdf8", trackColor: "rgba(255,255,255,0.08)" },
  { key: "sunset",  label: "Sunset",     emoji: "🌅",
    bg: "linear-gradient(135deg,#130510 0%,#2d0f22 50%,#1a0d03 100%)",
    card: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.1)",
    text: "#e2e8f0", muted: "#fca5a5", accent: "#f97316",
    timerColor: "#fb923c", trackColor: "rgba(255,255,255,0.08)" },
  { key: "minimal", label: "Minimal",    emoji: "⬜",
    bg: "#f1f5f9",
    card: "#ffffff", border: "#e2e8f0",
    text: "#0f172a", muted: "#64748b", accent: "#3b82f6",
    timerColor: "#3b82f6", trackColor: "#e2e8f0" },
] as const;
type ThemeKey = typeof THEMES[number]["key"];

// ─── Timer modes ──────────────────────────────────────────────
const MODES = [
  { key: "focus", label: "Focus",       defaultMins: 25, emoji: "🍅" },
  { key: "short", label: "Short Break", defaultMins: 5,  emoji: "☕" },
  { key: "long",  label: "Long Break",  defaultMins: 15, emoji: "🌿" },
] as const;
type ModeKey = typeof MODES[number]["key"];

// ─── Sounds ───────────────────────────────────────────────────
const SOUNDS = [
  { key: "none",   label: "None",        emoji: "🔇" },
  { key: "brown",  label: "Brown Noise", emoji: "🌫️" },
  { key: "rain",   label: "Rain",        emoji: "☔" },
  { key: "ocean",  label: "Ocean",       emoji: "🌊" },
  { key: "cafe",   label: "Café",        emoji: "☕" },
  { key: "forest", label: "Forest",      emoji: "🌿" },
  { key: "white",  label: "White Noise", emoji: "📻" },
] as const;
type SoundKey = typeof SOUNDS[number]["key"];

// ─── Web Audio sound engine ───────────────────────────────────
function useSoundEngine() {
  const ctxRef   = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const stoppers = useRef<(() => void)[]>([]);

  const stop = useCallback(() => {
    stoppers.current.forEach(fn => { try { fn(); } catch {} });
    stoppers.current = [];
    masterRef.current?.disconnect();
    masterRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const play = useCallback((type: SoundKey, vol: number) => {
    stop();
    if (type === "none") return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx() as AudioContext;
    const master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);
    ctxRef.current  = ctx;
    masterRef.current = master;

    const sr  = ctx.sampleRate;
    const len = sr * 4; // 4-second looping buffer

    const makeBuf = (fill: (d: Float32Array) => void) => {
      const b = ctx.createBuffer(1, len, sr);
      fill(b.getChannelData(0));
      return b;
    };

    const loopSrc = (buf: AudioBuffer) => {
      const s = ctx.createBufferSource();
      s.buffer = buf; s.loop = true;
      stoppers.current.push(() => s.stop());
      return s;
    };

    const whiteBuf = makeBuf(d => {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    });
    const brownBuf = makeBuf(d => {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        d[i] = (last + 0.02 * w) / 1.02;
        last = d[i]; d[i] *= 3.5;
      }
    });

    const connect = (src: AudioNode, ...nodes: AudioNode[]) => {
      let prev = src;
      nodes.forEach(n => { prev.connect(n); prev = n; });
      (prev as AudioNode).connect(master);
    };

    if (type === "white") {
      const g = ctx.createGain(); g.gain.value = 0.35;
      const s = loopSrc(whiteBuf);
      connect(s, g); s.start();

    } else if (type === "brown") {
      const g = ctx.createGain(); g.gain.value = 0.5;
      const s = loopSrc(brownBuf);
      connect(s, g); s.start();

    } else if (type === "rain") {
      const g = ctx.createGain(); g.gain.value = 0.55;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.4;
      const s = loopSrc(whiteBuf);
      connect(s, bp, g); s.start();
      // low rumble layer
      const g2 = ctx.createGain(); g2.gain.value = 0.2;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 300;
      const s2 = loopSrc(brownBuf);
      connect(s2, lp, g2); s2.start();

    } else if (type === "ocean") {
      const g = ctx.createGain(); g.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const lfoG = ctx.createGain(); lfoG.gain.value = 0.22;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      lfo.start();
      stoppers.current.push(() => lfo.stop());
      const s = loopSrc(brownBuf);
      connect(s, g); s.start();

    } else if (type === "cafe") {
      [[250, 1.2, 0.18], [800, 2, 0.12], [2200, 3, 0.07]].forEach(
        ([freq, Q, gain]) => {
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = Q;
          const g = ctx.createGain(); g.gain.value = gain;
          const s = loopSrc(whiteBuf);
          connect(s, bp, g); s.start();
        }
      );

    } else if (type === "forest") {
      // wind (low-passed brown)
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 600;
      const g = ctx.createGain(); g.gain.value = 0.35;
      const s = loopSrc(brownBuf);
      connect(s, lp, g); s.start();
      // subtle high rustling
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 3000;
      const g2 = ctx.createGain(); g2.gain.value = 0.08;
      const s2 = loopSrc(whiteBuf);
      connect(s2, hp, g2); s2.start();
    }
  }, [stop]);

  const setVol = useCallback((v: number) => {
    if (masterRef.current) masterRef.current.gain.value = v;
  }, []);

  useEffect(() => () => stop(), [stop]);
  return { play, stop, setVol };
}

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

// ─── Timer ring ───────────────────────────────────────────────
function Ring({ pct, color, track, size = 220 }: {
  pct: number; color: string; track: string; size?: number;
}) {
  const sw = 9, r = (size - sw) / 2, cx = size / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90"
      style={{ filter: `drop-shadow(0 0 14px ${color}66)` }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={track} strokeWidth={sw} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }} />
    </svg>
  );
}

// ─── Panel card ───────────────────────────────────────────────
function Panel({ theme, children, className = "" }: {
  theme: typeof THEMES[number]; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        backdropFilter: "blur(12px)",
      }}>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function FocusPage() {
  const { user } = useAuth();

  // ── Theme ─────────────────────────────────────────────────
  const [themeKey, setThemeKey] = useState<ThemeKey>("space");
  const theme = THEMES.find(t => t.key === themeKey)!;

  // ── Timer ─────────────────────────────────────────────────
  const [modeKey,     setModeKey]     = useState<ModeKey>("focus");
  const [customMins,  setCustomMins]  = useState<Record<ModeKey, number>>({ focus: 25, short: 5, long: 15 });
  const [editingMode, setEditingMode] = useState<ModeKey | null>(null);
  const [editingVal,  setEditingVal]  = useState("");
  const [secsLeft,    setSecsLeft]    = useState(25 * 60);
  const [running,     setRunning]     = useState(false);
  const [sessions,    setSessions]    = useState(0);
  const [sessionGoal, setSessionGoal] = useState(4);
  const [autoBreak,   setAutoBreak]   = useState(true);
  const [goal,        setGoal]        = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [reflection,  setReflection]  = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mode  = MODES.find(m => m.key === modeKey)!;
  const currentMins = customMins[modeKey];
  const total = currentMins * 60;

  // ── Sound ─────────────────────────────────────────────────
  const [soundKey, setSoundKey] = useState<SoundKey>("none");
  const [volume,   setVolume]   = useState(0.4);
  const [muted,    setMuted]    = useState(false);
  const { play, stop, setVol } = useSoundEngine();

  // ── Notes ─────────────────────────────────────────────────
  const [noteId,    setNoteId]    = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody,  setNoteBody]  = useState("");
  const [noteSaved, setNoteSaved] = useState(true);
  const [allNotes,  setAllNotes]  = useState<import("@/types").FocusNote[]>([]);
  const [notesView, setNotesView] = useState<"list" | "edit">("list");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tasks ─────────────────────────────────────────────────
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [logCourse,  setLogCourse]  = useState("");

  // ── Panel tabs (mobile) ──────────────────────────────────
  const [panel, setPanel] = useState<"notes" | "tasks" | "stats">("notes");

  // ── Today's date ─────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getUserTasks(user.uid),
      getUserCourses(user.uid),
      getFocusNotes(user.uid),
    ]).then(([t, c, notes]) => {
      setTasks(t.filter(x => x.status !== "completed"));
      setCourses(c);
      const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setAllNotes(sorted);
    }).catch(console.error);
  }, [user, today]);

  // ── Sound controls ────────────────────────────────────────
  useEffect(() => {
    if (soundKey === "none") { stop(); return; }
    play(soundKey, muted ? 0 : volume);
  }, [soundKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setVol(muted ? 0 : volume);
  }, [volume, muted, setVol]);

  // ── Timer reset on mode change ────────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setSecsLeft(customMins[modeKey] * 60);
  }, [modeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer tick ────────────────────────────────────────────
  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current!); return; }
    intervalRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          if (modeKey === "focus") {
            setSessions(n => n + 1);
            setShowReflection(true);
            if (Notification.permission === "granted")
              new Notification("🍅 Focus session complete!", { body: "Great work — take a break!", icon: "/favicon.ico" });
            toast.success("Focus session done! 🎉", { style: { background: "#1e293b", color: "#e2e8f0" } });
            if (autoBreak) {
              setTimeout(() => {
                setModeKey("short");
                setSecsLeft(customMins["short"] * 60);
                setRunning(true);
              }, 1500);
            }
          } else {
            toast("Break over — time to focus! 💪", { style: { background: "#1e293b", color: "#e2e8f0" } });
            setModeKey("focus");
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, modeKey, autoBreak, customMins]);

  const toggleTimer = () => {
    if (secsLeft === 0) { setSecsLeft(customMins[modeKey] * 60); return; }
    if (!running && Notification.permission === "default") Notification.requestPermission();
    setRunning(r => !r);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setSecsLeft(customMins[modeKey] * 60);
  };

  const commitEditMins = (mk: ModeKey) => {
    const n = parseInt(editingVal, 10);
    if (!isNaN(n) && n >= 1 && n <= 120) {
      setCustomMins(p => ({ ...p, [mk]: n }));
      if (mk === modeKey) setSecsLeft(n * 60);
    }
    setEditingMode(null);
    setEditingVal("");
  };

  // ── Note auto-save ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (!noteBody && !noteTitle) return;
    setNoteSaved(false);
    clearTimeout(saveTimer.current!);
    saveTimer.current = setTimeout(async () => {
      try {
        const now = new Date().toISOString();
        if (noteId) {
          await updateFocusNote(noteId, { title: noteTitle, content: noteBody, updatedAt: now });
          setAllNotes(prev => prev.map(n => n.id === noteId ? { ...n, title: noteTitle, content: noteBody, updatedAt: now } : n));
        } else {
          const id = await saveFocusNote({
            userId: user.uid, title: noteTitle, content: noteBody,
            date: today, createdAt: now, updatedAt: now,
          });
          setNoteId(id);
          const newNote = { id, userId: user.uid, title: noteTitle, content: noteBody, date: today, createdAt: now, updatedAt: now };
          setAllNotes(prev => [newNote, ...prev]);
        }
        setNoteSaved(true);
      } catch { setNoteSaved(false); }
    }, 800);
  }, [noteTitle, noteBody]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task toggle ───────────────────────────────────────────
  const toggleTask = async (task: Task) => {
    const next = new Set(checkedIds);
    if (next.has(task.id)) {
      next.delete(task.id);
      await updateTask(task.id, { status: "pending" }).catch(() => {});
    } else {
      next.add(task.id);
      await updateTask(task.id, { status: "completed" }).catch(() => {});
    }
    setCheckedIds(next);
  };

  // ── Post-session log ──────────────────────────────────────
  const logSession = async () => {
    if (!user) return;
    try {
      await createStudyLog({
        userId: user.uid,
        courseId: logCourse || (courses[0]?.id ?? ""),
        date: today,
        hours: parseFloat((25 / 60).toFixed(2)),
        note: reflection || "Pomodoro session",
        createdAt: new Date().toISOString(),
      });
      toast.success("Session logged!", { style: { background: "#1e293b", color: "#e2e8f0" } });
    } catch { toast.error("Failed to log"); }
    setShowReflection(false);
    setReflection("");
  };

  // ── Derived stats ─────────────────────────────────────────
  const completedCount = checkedIds.size;
  const totalFocusMins = sessions * 25;

  return (
    <DashboardLayout noPadding>
      {/* Full-bleed themed wrapper */}
      <div className="min-h-screen" style={{ background: theme.bg }}>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">

          {/* ── Top bar ─────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: `${theme.accent}33` }}>
                <Sparkles size={15} style={{ color: theme.accent }} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none" style={{ color: theme.text }}>
                  Focus Space
                </h1>
                <p className="text-[11px] mt-0.5" style={{ color: theme.muted }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>

            {/* Goal input */}
            <div className="flex items-center gap-2 flex-1 max-w-sm mx-4">
              <Target size={14} style={{ color: theme.muted }} className="shrink-0" />
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="What's your focus goal today?"
                className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
                style={{ color: theme.text, borderBottom: `1px solid ${theme.border}`, paddingBottom: "2px" }}
              />
            </div>

            {/* Theme picker */}
            <div className="flex gap-1.5">
              {THEMES.map(t => (
                <button key={t.key} onClick={() => setThemeKey(t.key)}
                  title={t.label}
                  className="w-7 h-7 rounded-lg text-base transition-all hover:scale-110"
                  style={{
                    background: themeKey === t.key ? `${theme.accent}33` : "transparent",
                    outline: themeKey === t.key ? `2px solid ${theme.accent}` : "none",
                    outlineOffset: "1px",
                  }}>
                  {t.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main grid ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

            {/* LEFT — Timer */}
            <div className="flex flex-col gap-4">
              <Panel theme={theme} className="flex flex-col items-center gap-5">

                {/* Mode tabs with editable minutes */}
                <div className="flex gap-1.5 w-full">
                  {MODES.map(m => {
                    const isActive = modeKey === m.key;
                    const isEditing = editingMode === m.key;
                    return (
                      <button key={m.key} onClick={() => !isEditing && setModeKey(m.key)}
                        className="flex-1 py-2 px-1 rounded-xl text-[13px] font-semibold transition-all flex flex-col items-center gap-0.5"
                        style={isActive
                          ? { background: `${theme.accent}22`, color: theme.accent, border: `1px solid ${theme.accent}44` }
                          : { color: theme.muted, border: "1px solid transparent" }}>
                        <span>{m.emoji} {m.label}</span>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingVal}
                            onChange={e => setEditingVal(e.target.value)}
                            onBlur={() => commitEditMins(m.key)}
                            onKeyDown={e => { if (e.key === "Enter") commitEditMins(m.key); if (e.key === "Escape") { setEditingMode(null); setEditingVal(""); } }}
                            onClick={e => e.stopPropagation()}
                            className="w-12 text-center rounded bg-transparent outline-none border-b text-[11px]"
                            style={{ borderColor: theme.accent, color: theme.accent }}
                          />
                        ) : (
                          <span
                            className="text-[11px] opacity-60 cursor-text hover:opacity-100 transition-opacity"
                            onClick={e => { e.stopPropagation(); setEditingMode(m.key); setEditingVal(String(customMins[m.key])); }}
                            title="Click to edit"
                          >
                            {customMins[m.key]}m <Pencil size={9} className="inline" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Ring + countdown */}
                <div className="relative flex items-center justify-center">
                  <Ring pct={(secsLeft / total) * 100}
                    color={theme.timerColor} track={theme.trackColor} size={220} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span className="text-[50px] font-bold leading-none tabular-nums"
                      style={{ color: theme.text }}>
                      {fmt(secsLeft)}
                    </span>
                    <span className="text-[12px] font-medium" style={{ color: theme.muted }}>
                      {mode.label}
                    </span>
                    {goal && (
                      <span className="text-[11px] mt-1 px-3 py-0.5 rounded-full max-w-[180px] truncate text-center"
                        style={{ background: `${theme.accent}22`, color: theme.accent }}>
                        {goal}
                      </span>
                    )}
                  </div>
                </div>

                {/* Session goal progress */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: sessionGoal }).map((_, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full transition-all"
                        style={{ background: i < sessions ? theme.accent : theme.trackColor }} />
                    ))}
                    <button
                      onClick={() => setSessionGoal(g => g < 8 ? g + 1 : 2)}
                      className="text-[10px] px-1.5 py-0.5 rounded-md transition-opacity opacity-40 hover:opacity-80"
                      style={{ color: theme.muted, border: `1px solid ${theme.border}` }}
                      title="Change goal">
                      {sessions}/{sessionGoal}
                    </button>
                  </div>
                  <span className="text-[10px]" style={{ color: theme.muted }}>
                    {sessions >= sessionGoal ? "🎉 Goal reached!" : `${sessionGoal - sessions} session${sessionGoal - sessions !== 1 ? "s" : ""} to go`}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                  <button onClick={resetTimer}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                    <RotateCcw size={17} style={{ color: theme.muted }} />
                  </button>

                  <button onClick={toggleTimer}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg,${theme.accent},${theme.timerColor})` }}>
                    {running
                      ? <Pause size={26} fill="white" />
                      : <Play  size={26} fill="white" className="ml-1" />}
                  </button>

                  <button
                    onClick={() => setAutoBreak(b => !b)}
                    title={autoBreak ? "Auto-break ON — click to disable" : "Auto-break OFF — click to enable"}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={{
                      background: autoBreak ? `${theme.accent}22` : theme.card,
                      border: `1px solid ${autoBreak ? theme.accent : theme.border}`,
                    }}>
                    <SkipForward size={17} style={{ color: autoBreak ? theme.accent : theme.muted }} />
                  </button>
                </div>

                <p className="text-[10px]" style={{ color: theme.muted }}>
                  {autoBreak ? "⚡ Auto-break on" : "Manual break"}
                  {modeKey === "focus" ? ` · ${modeKey === "focus" ? "Focus" : "Break"} mode` : ""}
                </p>
              </Panel>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "🍅", label: "Sessions", value: sessions        },
                  { icon: "⏱️", label: "Mins focused", value: totalFocusMins },
                  { icon: "✅", label: "Tasks done", value: completedCount },
                ].map(({ icon, label, value }) => (
                  <Panel key={label} theme={theme} className="text-center !py-3 !px-2">
                    <p className="text-xl mb-1">{icon}</p>
                    <p className="text-xl font-bold" style={{ color: theme.text }}>{value}</p>
                    <p className="text-[11px]" style={{ color: theme.muted }}>{label}</p>
                  </Panel>
                ))}
              </div>
            </div>

            {/* RIGHT — Notes + Tasks */}
            <div className="flex flex-col gap-4">

              {/* Panel tab switcher */}
              <div className="flex gap-1.5 p-1 rounded-xl"
                style={{ background: "rgba(0,0,0,0.15)" }}>
                {([
                  { key: "notes", icon: NotebookPen, label: "Notes"  },
                  { key: "tasks", icon: ListTodo,    label: "Tasks"  },
                  { key: "stats", icon: BarChart2,   label: "History" },
                ] as const).map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => setPanel(key)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all"
                    style={panel === key
                      ? { background: theme.card, color: theme.text }
                      : { color: theme.muted }}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>

              {/* Notes panel */}
              {panel === "notes" && (
                <Panel theme={theme} className="flex flex-col gap-3 flex-1">
                  {notesView === "list" ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <NotebookPen size={14} style={{ color: theme.accent }} />
                          <span className="text-[13px] font-semibold" style={{ color: theme.text }}>Notes</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: `${theme.accent}22`, color: theme.accent }}>
                            {allNotes.length}
                          </span>
                        </div>
                        <button
                          onClick={() => { setNoteId(null); setNoteTitle(""); setNoteBody(""); setNotesView("edit"); }}
                          className="flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={{ background: `${theme.accent}22`, color: theme.accent }}>
                          <Plus size={12} /> New
                        </button>
                      </div>

                      {allNotes.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-3xl mb-2">📝</p>
                          <p className="text-[13px]" style={{ color: theme.muted }}>No notes yet</p>
                          <p className="text-[11px] mt-1" style={{ color: theme.muted }}>Tap New to write your first note</p>
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                          {allNotes.map(n => (
                            <li key={n.id}
                              className="rounded-xl p-3 cursor-pointer transition-all group"
                              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.border}` }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0" onClick={() => { setNoteId(n.id); setNoteTitle(n.title); setNoteBody(n.content); setNotesView("edit"); }}>
                                  <p className="text-[13px] font-semibold truncate" style={{ color: theme.text }}>
                                    {n.title || "Untitled"}
                                  </p>
                                  <p className="text-[11px] mt-0.5 line-clamp-2 opacity-60" style={{ color: theme.muted }}>
                                    {n.content || "No content"}
                                  </p>
                                  <p className="text-[10px] mt-1 opacity-40" style={{ color: theme.muted }}>
                                    {n.date}
                                  </p>
                                </div>
                                <button
                                  onClick={async () => {
                                    await deleteFocusNote(n.id);
                                    setAllNotes(prev => prev.filter(x => x.id !== n.id));
                                    if (noteId === n.id) { setNoteId(null); setNoteTitle(""); setNoteBody(""); }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20"
                                  style={{ color: "#f87171" }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setNotesView("list")}
                          className="flex items-center gap-1 text-[12px] font-medium transition-opacity hover:opacity-80"
                          style={{ color: theme.muted }}>
                          <ChevronLeft size={14} /> All Notes
                        </button>
                        <span className="text-[11px]" style={{ color: theme.muted }}>
                          {noteSaved ? "✓ Saved" : "Saving…"}
                        </span>
                      </div>
                      <input
                        value={noteTitle}
                        onChange={e => setNoteTitle(e.target.value)}
                        placeholder="Note title…"
                        className="bg-transparent font-semibold text-[15px] outline-none placeholder:opacity-30 w-full"
                        style={{ color: theme.text }}
                      />
                      <textarea
                        value={noteBody}
                        onChange={e => setNoteBody(e.target.value)}
                        placeholder={"Write anything — key ideas, questions, reminders…\n\nYour notes auto-save."}
                        rows={12}
                        className="bg-transparent text-[13px] leading-relaxed resize-none outline-none placeholder:opacity-30 flex-1"
                        style={{ color: theme.text }}
                      />
                      <p className="text-[11px]" style={{ color: theme.muted }}>
                        📅 {today} · auto-saved
                      </p>
                    </>
                  )}
                </Panel>
              )}

              {/* Tasks panel */}
              {panel === "tasks" && (
                <Panel theme={theme} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ListTodo size={14} style={{ color: theme.accent }} />
                    <span className="text-[13px] font-semibold" style={{ color: theme.text }}>
                      Today's Tasks
                    </span>
                    <span className="ml-auto text-[11px]" style={{ color: theme.muted }}>
                      {checkedIds.size}/{tasks.length} done
                    </span>
                  </div>

                  {tasks.length === 0 ? (
                    <p className="text-[13px] text-center py-8" style={{ color: theme.muted }}>
                      No pending tasks 🎉
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                      {[...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(task => {
                        const done     = checkedIds.has(task.id);
                        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
                        const tomorrowStr = tomorrow.toISOString().split("T")[0];
                        const overdue  = !done && task.dueDate < today;
                        const dueToday = !done && task.dueDate === today;
                        const dueTomorrow = !done && task.dueDate === tomorrowStr;
                        const urgencyLabel = overdue ? "Overdue" : dueToday ? "Today" : dueTomorrow ? "Tomorrow" : null;
                        const urgencyColor = overdue ? "#f87171" : dueToday ? "#fb923c" : "#facc15";
                        return (
                          <li key={task.id}
                            onClick={() => toggleTask(task)}
                            className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                            style={{ background: done ? `${theme.accent}15` : overdue ? "rgba(248,113,113,0.07)" : dueToday ? "rgba(251,146,60,0.07)" : "transparent" }}>
                            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                              style={{
                                borderColor: done ? theme.accent : theme.border,
                                background:  done ? theme.accent : "transparent",
                              }}>
                              {done && <CheckCircle2 size={9} color="white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-[13px] font-medium truncate"
                                  style={{
                                    color: done ? theme.muted : theme.text,
                                    textDecoration: done ? "line-through" : "none",
                                  }}>
                                  {task.title}
                                </p>
                                {urgencyLabel && (
                                  <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                    style={{ color: urgencyColor, background: `${urgencyColor}22` }}>
                                    <AlertTriangle size={9} />
                                    {urgencyLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] mt-0.5" style={{ color: theme.muted }}>
                                Due {task.dueDate}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              )}

              {/* Stats panel */}
              {panel === "stats" && (
                <Panel theme={theme} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={14} style={{ color: theme.accent }} />
                    <span className="text-[13px] font-semibold" style={{ color: theme.text }}>This Session</span>
                  </div>
                  {[
                    ["🍅 Pomodoros completed",   `${sessions} session${sessions !== 1 ? "s" : ""}`],
                    ["⏱️ Total focus time",       `${totalFocusMins} minutes`],
                    ["✅ Tasks completed",        `${checkedIds.size} tasks`],
                    ["🎯 Goal",                   goal || "Not set"],
                    ["🎵 Ambient sound",          SOUNDS.find(s => s.key === soundKey)?.label ?? "None"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between items-center py-2"
                      style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <span className="text-[12px]" style={{ color: theme.muted }}>{label}</span>
                      <span className="text-[13px] font-semibold" style={{ color: theme.text }}>{val}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-center" style={{ color: theme.muted }}>
                    Complete a session to log it to your Study Log
                  </p>
                </Panel>
              )}
            </div>
          </div>

          {/* ── Ambient sound bar ───────────────────────────── */}
          <div className="mt-5 rounded-2xl p-4 flex items-center gap-4 flex-wrap"
            style={{
              background: "rgba(0,0,0,0.25)",
              border: `1px solid ${theme.border}`,
              backdropFilter: "blur(12px)",
            }}>
            {/* Sound buttons */}
            <div className="flex gap-2 flex-1 flex-wrap">
              {SOUNDS.map(s => (
                <button key={s.key} onClick={() => setSoundKey(s.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all hover:scale-105"
                  style={soundKey === s.key
                    ? { background: `${theme.accent}33`, color: theme.accent, border: `1px solid ${theme.accent}55` }
                    : { background: "rgba(255,255,255,0.05)", color: theme.muted, border: "1px solid transparent" }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setMuted(m => !m)}>
                {muted
                  ? <VolumeX size={16} style={{ color: theme.muted }} />
                  : <Volume2  size={16} style={{ color: theme.accent }} />}
              </button>
              <input type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                onChange={e => { setMuted(false); setVolume(parseFloat(e.target.value)); }}
                className="w-24 accent-current"
                style={{ accentColor: theme.accent }} />
            </div>
          </div>

        </div>
      </div>

      {/* ── Post-session reflection modal ──────────────────── */}
      {showReflection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-lg">🎉 Session complete!</p>
              <button onClick={() => setShowReflection(false)}>
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-4">
              What did you accomplish in this session?
            </p>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="e.g. Finished chapter 3, solved 5 problems…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white resize-none outline-none focus:border-indigo-500 placeholder:text-slate-600 mb-4"
            />

            {courses.length > 0 && (
              <select value={logCourse} onChange={e => setLogCourse(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white mb-4 outline-none">
                <option value="">Select course to log (optional)</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            )}

            <div className="flex gap-2">
              <button onClick={logSession}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">
                Log to Study Log
              </button>
              <button onClick={() => { setShowReflection(false); setReflection(""); }}
                className="px-4 py-2.5 rounded-xl text-slate-400 text-sm hover:bg-white/5 transition-colors">
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
