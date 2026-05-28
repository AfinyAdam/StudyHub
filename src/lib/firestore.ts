import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  UserProfile, Course, Task, AttendanceRecord,
  Event, Expense, Enrollment, Grade, StudyLog, FocusNote, EventRSVP, Announcement, Class,
} from "@/types";

// ─── Users ───────────────────────────────────────────────────
export const createUserProfile = async (profile: UserProfile) => {
  await setDoc(doc(db, "users", profile.uid), profile);
};

export const getUserProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  await setDoc(doc(db, "users", uid), data, { merge: true });
};

// ─── Courses ─────────────────────────────────────────────────
export const getUserCourses = async (userId: string, classId?: string) => {
  const queries: Promise<any>[] = [
    getDocs(query(collection(db, "courses"), where("userId", "==", userId))),
  ];
  // Only fetch official courses if the student has a class
  if (classId) {
    queries.push(getDocs(query(collection(db, "courses"), where("isOfficial", "==", true), where("classId", "==", classId))));
  }
  const [personalSnap, officialSnap] = await Promise.all(queries);
  const personal = personalSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Course));
  const official = officialSnap ? officialSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Course)) : [];
  const seen = new Set(personal.map((c: Course) => c.id));
  return [...personal, ...official.filter((c: Course) => !seen.has(c.id))];
};

export const createCourse = async (data: Omit<Course, "id">) => {
  const ref = await addDoc(collection(db, "courses"), data);
  return ref.id;
};

export const updateCourse = async (id: string, data: Partial<Course>) => {
  await updateDoc(doc(db, "courses", id), data);
};

export const deleteCourse = async (id: string) => {
  await deleteDoc(doc(db, "courses", id));
};

// ─── Enrollments ─────────────────────────────────────────────
export const enrollStudent = async (userId: string, courseId: string) => {
  await addDoc(collection(db, "enrollments"), {
    userId, courseId, enrolledAt: new Date().toISOString(),
  });
};

export const getUserEnrollments = async (userId: string) => {
  const q = query(
    collection(db, "enrollments"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
};

export const unenrollStudent = async (enrollmentId: string) => {
  await deleteDoc(doc(db, "enrollments", enrollmentId));
};

// ─── Tasks ───────────────────────────────────────────────────
export const getUserTasks = async (userId: string) => {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Task))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
};

export const createTask = async (data: Omit<Task, "id">) => {
  const ref = await addDoc(collection(db, "tasks"), data);
  return ref.id;
};

export const updateTask = async (id: string, data: Partial<Task>) => {
  await updateDoc(doc(db, "tasks", id), data);
};

export const deleteTask = async (id: string) => {
  await deleteDoc(doc(db, "tasks", id));
};

// ─── Attendance ──────────────────────────────────────────────
export const getAttendance = async (userId: string, courseId?: string) => {
  const q = query(collection(db, "attendance"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
  return courseId ? records.filter(r => r.courseId === courseId) : records;
};

export const markAttendance = async (data: Omit<AttendanceRecord, "id">) => {
  const ref = await addDoc(collection(db, "attendance"), data);
  return ref.id;
};

export const updateAttendance = async (id: string, data: Partial<AttendanceRecord>) => {
  await updateDoc(doc(db, "attendance", id), data);
};

// ─── Events ──────────────────────────────────────────────────
export const getEvents = async () => {
  const snap = await getDocs(collection(db, "events"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Event))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
};

export const createEvent = async (data: Omit<Event, "id">) => {
  const ref = await addDoc(collection(db, "events"), data);
  return ref.id;
};

export const updateEvent = async (id: string, data: Partial<Event>) => {
  await updateDoc(doc(db, "events", id), data);
};

export const deleteEvent = async (id: string) => {
  await deleteDoc(doc(db, "events", id));
};

// ─── Expenses ────────────────────────────────────────────────
export const getUserExpenses = async (userId: string) => {
  const q = query(
    collection(db, "expenses"),
    where("userId", "==", userId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Expense))
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
};

export const createExpense = async (data: Omit<Expense, "id">) => {
  const ref = await addDoc(collection(db, "expenses"), data);
  return ref.id;
};

export const deleteExpense = async (id: string) => {
  await deleteDoc(doc(db, "expenses", id));
};

// ─── Grades ──────────────────────────────────────────────────
export const getUserGrades = async (userId: string) => {
  const q = query(collection(db, "grades"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Grade));
};

export const createGrade = async (data: Omit<Grade, "id">) => {
  const ref = await addDoc(collection(db, "grades"), data);
  return ref.id;
};

export const updateGrade = async (id: string, data: Partial<Grade>) => {
  await updateDoc(doc(db, "grades", id), data);
};

export const deleteGrade = async (id: string) => {
  await deleteDoc(doc(db, "grades", id));
};

// ─── Study Logs ───────────────────────────────────────────────
export const getUserStudyLogs = async (userId: string) => {
  const q = query(collection(db, "studyLogs"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StudyLog));
};

export const createStudyLog = async (data: Omit<StudyLog, "id">) => {
  const ref = await addDoc(collection(db, "studyLogs"), data);
  return ref.id;
};

export const deleteStudyLog = async (id: string) => {
  await deleteDoc(doc(db, "studyLogs", id));
};

// ─── Focus Notes ──────────────────────────────────────────────
export const getFocusNotes = async (userId: string) => {
  const q = query(collection(db, "focusNotes"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as FocusNote))
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const saveFocusNote = async (data: Omit<FocusNote, "id">) => {
  const ref = await addDoc(collection(db, "focusNotes"), data);
  return ref.id;
};

export const updateFocusNote = async (id: string, data: Partial<FocusNote>) => {
  await updateDoc(doc(db, "focusNotes", id), data);
};

export const deleteFocusNote = async (id: string) => {
  await deleteDoc(doc(db, "focusNotes", id));
};

// ─── Event RSVPs ──────────────────────────────────────────────
export const rsvpToEvent = async (userId: string, eventId: string) => {
  const ref = await addDoc(collection(db, "eventRSVPs"), {
    userId, eventId, rsvpedAt: new Date().toISOString(),
  });
  return ref.id;
};

export const cancelRSVP = async (rsvpId: string) => {
  await deleteDoc(doc(db, "eventRSVPs", rsvpId));
};

export const getEventRSVPs = async (eventId: string) => {
  const q = query(collection(db, "eventRSVPs"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as EventRSVP));
};

export const getUserRSVPs = async (userId: string) => {
  const q = query(collection(db, "eventRSVPs"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as EventRSVP));
};

// ─── Official Courses (admin) ─────────────────────────────────
export const getOfficialCourses = async () => {
  const snap = await getDocs(query(collection(db, "courses"), where("isOfficial", "==", true)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
};

// ─── Classes ──────────────────────────────────────────────────
export const createClass = async (data: Omit<Class, "id">) => {
  const ref = await addDoc(collection(db, "classes"), data);
  return ref.id;
};

export const getClassById = async (classId: string) => {
  const snap = await getDoc(doc(db, "classes", classId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Class) : null;
};

export const getClassByCode = async (joinCode: string) => {
  const q    = query(collection(db, "classes"), where("joinCode", "==", joinCode.toUpperCase()));
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Class);
};

// ─── Announcements ────────────────────────────────────────────
export const getAnnouncements = async () => {
  const snap = await getDocs(collection(db, "announcements"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Announcement))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createAnnouncement = async (data: Omit<Announcement, "id">) => {
  const ref = await addDoc(collection(db, "announcements"), data);
  return ref.id;
};

export const deleteAnnouncement = async (id: string) => {
  await deleteDoc(doc(db, "announcements", id));
};