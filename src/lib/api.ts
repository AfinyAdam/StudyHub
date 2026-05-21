/**
 * Client-side API layer — all calls go through Next.js API routes.
 * The server verifies the Firebase ID token on every request.
 */
import { auth } from "./firebase";
import {
  UserProfile, Course, Task, AttendanceRecord,
  Event, Expense, Grade, StudyLog, FocusNote, EventRSVP,
} from "@/types";

async function getToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

// ─── Profile ──────────────────────────────────────────────────
export const getUserProfile = () =>
  apiFetch<UserProfile | null>("/api/profile");

export const updateUserProfile = (_uid: string, data: Partial<UserProfile>) =>
  apiFetch<{ success: true }>("/api/profile", { method: "PATCH", body: JSON.stringify(data) });

// ─── Courses ─────────────────────────────────────────────────
export const getUserCourses = (_userId: string) =>
  apiFetch<Course[]>("/api/courses");

export const createCourse = (data: Omit<Course, "id">) =>
  apiFetch<{ id: string }>("/api/courses", { method: "POST", body: JSON.stringify(data) });

export const updateCourse = (id: string, data: Partial<Course>) =>
  apiFetch<{ success: true }>(`/api/courses/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteCourse = (id: string) =>
  apiFetch<{ success: true }>(`/api/courses/${id}`, { method: "DELETE" });

// ─── Tasks ───────────────────────────────────────────────────
export const getUserTasks = (_userId: string) =>
  apiFetch<Task[]>("/api/tasks");

export const createTask = (data: Omit<Task, "id">) =>
  apiFetch<{ id: string }>("/api/tasks", { method: "POST", body: JSON.stringify(data) });

export const updateTask = (id: string, data: Partial<Task>) =>
  apiFetch<{ success: true }>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteTask = (id: string) =>
  apiFetch<{ success: true }>(`/api/tasks/${id}`, { method: "DELETE" });

// ─── Attendance ──────────────────────────────────────────────
export const getAttendance = (_userId: string, courseId?: string) => {
  const qs = courseId ? `?courseId=${courseId}` : "";
  return apiFetch<AttendanceRecord[]>(`/api/attendance${qs}`);
};

export const markAttendance = (data: Omit<AttendanceRecord, "id">) =>
  apiFetch<{ id: string }>("/api/attendance", { method: "POST", body: JSON.stringify(data) });

export const updateAttendance = (id: string, data: Partial<AttendanceRecord>) =>
  apiFetch<{ success: true }>(`/api/attendance/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// ─── Grades ──────────────────────────────────────────────────
export const getUserGrades = (_userId: string) =>
  apiFetch<Grade[]>("/api/grades");

export const createGrade = (data: Omit<Grade, "id">) =>
  apiFetch<{ id: string }>("/api/grades", { method: "POST", body: JSON.stringify(data) });

export const updateGrade = (id: string, data: Partial<Grade>) =>
  apiFetch<{ success: true }>(`/api/grades/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteGrade = (id: string) =>
  apiFetch<{ success: true }>(`/api/grades/${id}`, { method: "DELETE" });

// ─── Expenses ────────────────────────────────────────────────
export const getUserExpenses = (_userId: string) =>
  apiFetch<Expense[]>("/api/expenses");

export const createExpense = (data: Omit<Expense, "id">) =>
  apiFetch<{ id: string }>("/api/expenses", { method: "POST", body: JSON.stringify(data) });

export const deleteExpense = (id: string) =>
  apiFetch<{ success: true }>(`/api/expenses/${id}`, { method: "DELETE" });

// ─── Events ──────────────────────────────────────────────────
export const getEvents = () =>
  apiFetch<Event[]>("/api/events");

export const createEvent = (data: Omit<Event, "id">) =>
  apiFetch<{ id: string }>("/api/events", { method: "POST", body: JSON.stringify(data) });

export const deleteEvent = (id: string) =>
  apiFetch<{ success: true }>(`/api/events/${id}`, { method: "DELETE" });

// ─── Event RSVPs ─────────────────────────────────────────────
export const getEventRSVPs = (eventId: string) =>
  apiFetch<EventRSVP[]>(`/api/events/${eventId}/rsvp`);

export const getUserRSVPs = async (_userId: string): Promise<EventRSVP[]> => {
  // Fetched per-event; this is a client-side aggregation shortcut
  // Full list is loaded by the events page fetching per-event counts
  return [];
};

export const rsvpToEvent = async (_userId: string, eventId: string) => {
  const res = await apiFetch<{ id: string }>(`/api/events/${eventId}/rsvp`, { method: "POST" });
  return res.id;
};

export const cancelRSVP = async (_rsvpId: string, eventId?: string) => {
  if (!eventId) return;
  return apiFetch<{ success: true }>(`/api/events/${eventId}/rsvp`, { method: "DELETE" });
};

// ─── Study Logs ──────────────────────────────────────────────
export const getUserStudyLogs = (_userId: string) =>
  apiFetch<StudyLog[]>("/api/study-logs");

export const createStudyLog = (data: Omit<StudyLog, "id">) =>
  apiFetch<{ id: string }>("/api/study-logs", { method: "POST", body: JSON.stringify(data) });

export const deleteStudyLog = (id: string) =>
  apiFetch<{ success: true }>(`/api/study-logs/${id}`, { method: "DELETE" });

// ─── Focus Notes ─────────────────────────────────────────────
export const getFocusNotes = (_userId: string) =>
  apiFetch<FocusNote[]>("/api/focus-notes");

export const saveFocusNote = (data: Omit<FocusNote, "id">) =>
  apiFetch<{ id: string }>("/api/focus-notes", { method: "POST", body: JSON.stringify(data) })
    .then(r => r.id);

export const updateFocusNote = (id: string, data: Partial<FocusNote>) =>
  apiFetch<{ success: true }>(`/api/focus-notes/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteFocusNote = (id: string) =>
  apiFetch<{ success: true }>(`/api/focus-notes/${id}`, { method: "DELETE" });

// ─── Enrollments (pass-through — not yet moved to API) ───────
export { enrollStudent, getUserEnrollments, unenrollStudent } from "./firestore";
