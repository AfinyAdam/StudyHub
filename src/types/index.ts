export type UserRole = "student" | "admin";

export interface UserProfile {
  uid:         string;
  email:       string;
  displayName: string;
  role:        UserRole;
  studentId?:  string;
  phone?:      string;
  createdAt:   string;
  monthlyBudgetUSD?: number;
  classId?:    string;   // class/cohort the user belongs to or manages
}

export interface Class {
  id:        string;
  name:      string;   // e.g. "Computer Science - Batch 2024"
  major:     string;   // e.g. "Computer Science"
  joinCode:  string;   // short unique code students use to join
  adminUid:  string;   // uid of the class rep who created it
  createdAt: string;
}

export interface Course {
  id:          string;
  userId:      string;
  name:        string;
  code:        string;
  description: string;
  instructor:  string;
  room?:       string;
  days:        string[];
  startTime:   string;
  endTime:     string;
  color:       string;
  createdAt:   string;
  isOfficial?: boolean;  // true = admin-created, students cannot edit/delete
  createdBy?:  string;   // uid of admin who created it
}

export interface Enrollment {
  id:         string;
  userId:     string;
  courseId:   string;
  enrolledAt: string;
}

export type TaskStatus   = "pending" | "in-progress" | "completed";
export type TaskPriority = "high" | "medium" | "low";

export interface Task {
  id:           string;
  userId:       string;
  courseId?:    string;
  title:        string;
  description?: string;
  dueDate:      string;
  status:       TaskStatus;
  priority?:    TaskPriority;
  createdAt:    string;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id:       string;
  userId:   string;
  courseId: string;
  date:     string;
  status:   AttendanceStatus;
  markedBy: string;
}

export interface Event {
  id:          string;
  title:       string;
  description: string;
  eventDate:   string;
  location?:   string;
  createdBy:   string;
  createdAt:   string;
}

export type ExpenseCategory =
  | "food"
  | "transport"
  | "housing"
  | "education"
  | "entertainment"
  | "health"
  | "other";

export interface Expense {
  id:           string;
  userId:       string;
  amountUSD:    number;
  amountKHR:    number;
  exchangeRate: number;
  category:     ExpenseCategory;
  note?:        string;
  expenseDate:  string;
  createdAt:    string;
}

export type AssessmentType = "Quiz" | "Assignment" | "Midterm" | "Final" | "Project" | "Lab";

export interface Grade {
  id:        string;
  userId:    string;
  courseId:  string;
  title:     string;
  type:      AssessmentType;
  score:     number;
  total:     number;
  date:      string;
  createdAt: string;
}

export interface StudyLog {
  id:        string;
  userId:    string;
  courseId:  string;
  date:      string;
  hours:     number;
  note?:     string;
  createdAt: string;
}

export interface EventRSVP {
  id:        string;
  userId:    string;
  eventId:   string;
  rsvpedAt:  string;
}

export interface Announcement {
  id:        string;
  title:     string;
  body:      string;
  pinned:    boolean;
  createdBy: string;
  createdAt: string;
}

export interface FocusNote {
  id:         string;
  userId:     string;
  title:      string;
  content:    string;
  date:       string;   // YYYY-MM-DD
  createdAt:  string;
  updatedAt:  string;
}
