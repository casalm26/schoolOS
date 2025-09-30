const DEFAULT_LOCAL_API_BASE = "http://localhost:3001/api";

const isLocalHostname = (hostname: string) =>
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);

let cachedApiBaseUrl: string | null = null;

const resolveApiBaseUrl = () => {
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (configuredBase) {
    cachedApiBaseUrl = configuredBase;
    return cachedApiBaseUrl;
  }

  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    cachedApiBaseUrl = isLocalHostname(hostname)
      ? DEFAULT_LOCAL_API_BASE
      : `${origin.replace(/\/$/, "")}/api`;
    return cachedApiBaseUrl;
  }

  return DEFAULT_LOCAL_API_BASE;
};

let authTokenGetter: (() => string | null) | null = null;

export const setAuthTokenGetter = (getter: () => string | null) => {
  authTokenGetter = getter;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");

  const token = authTokenGetter?.();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const baseUrl = resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return (await response.json()) as T;
}

export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "active" | "inactive";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface Programme {
  _id: string;
  name: string;
  description?: string;
}

export interface Cohort {
  _id: string;
  programmeId: string;
  label: string;
  startAt: string;
  endAt: string;
}

export interface ClassEntity {
  _id: string;
  cohortId: string;
  title: string;
  code: string;
  instructorIds: string[];
  scheduleMeta?: Record<string, unknown>;
}

export type AssignmentType = "project" | "task" | "test";
export type GradingSchema = "points" | "percentage" | "pass_fail";

export interface Assignment {
  _id: string;
  classId: string;
  title: string;
  description?: string;
  type: AssignmentType;
  dueAt: string;
  publishAt?: string | null;
  gradingSchema: GradingSchema;
  maxPoints: number;
}

export type GradeStatus = "draft" | "pending_release" | "released";

export interface GradeHistoryEntry {
  status: GradeStatus;
  score?: number | null;
  letterGrade?: string | null;
  feedback: string;
  actorId?: string | null;
  changedAt: string;
}

export interface Grade {
  _id: string;
  assignmentId: string;
  studentId: string;
  score?: number | null;
  letterGrade?: string | null;
  feedback: string;
  status: GradeStatus;
  releasedAt?: string | null;
  history: GradeHistoryEntry[];
  student?: Pick<User, "_id" | "name" | "email"> | null;
}

export interface Enrollment {
  _id: string;
  classId: string;
  studentId: string;
  status: string;
  student?: Pick<User, "_id" | "name" | "email"> | null;
}

export interface StudentAssignmentOverview {
  assignmentId: string;
  classId: string;
  title: string;
  description?: string;
  dueAt: string;
  publishAt?: string;
  gradingSchema: GradingSchema;
  maxPoints: number;
  status: GradeStatus;
  grade: Grade | null;
}

export const api = {
  login: (payload: { email: string; password: string }) =>
    request<{ accessToken: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  registerAdmin: (payload: { name: string; email: string; password: string }) =>
    request<{ accessToken: string; user: User }>("/auth/register-admin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCurrentUser: () => request<User | null>("/auth/me"),

  getUsers: () => request<User[]>("/users"),
  createUser: (payload: { name: string; email: string; role: UserRole; password: string }) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(payload) }),
  searchUsersByRole: (role: UserRole, query: string) =>
    request<User[]>(`/users/search/by-role?role=${role}&query=${encodeURIComponent(query)}`),

  getProgrammes: () => request<Programme[]>("/programmes"),
  createProgramme: (payload: { name: string; description?: string }) =>
    request<Programme>("/programmes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCohorts: (programmeId?: string) =>
    request<Cohort[]>(
      programmeId
        ? `/programmes/cohorts?programmeId=${programmeId}`
        : "/programmes/cohorts",
    ),
  createCohort: (payload: {
    programmeId: string;
    label: string;
    startAt: string;
    endAt: string;
  }) =>
    request<Cohort>("/programmes/cohorts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getClasses: (filters?: { cohortId?: string; instructorId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cohortId) params.append("cohortId", filters.cohortId);
    if (filters?.instructorId) params.append("instructorId", filters.instructorId);
    const query = params.toString();
    return request<ClassEntity[]>(query ? `/classes?${query}` : "/classes");
  },
  createClass: (payload: {
    cohortId: string;
    title: string;
    code: string;
    instructorIds: string[];
    scheduleMeta?: Record<string, unknown>;
  }) =>
    request<ClassEntity>("/classes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getClass: (id: string) => request<ClassEntity>(`/classes/${id}`),
  getClassEnrollments: (classId: string) =>
    request<Enrollment[]>(`/classes/${classId}/enrollments`),
  enrollStudentInClass: (
    classId: string,
    payload: { studentId?: string; studentEmail?: string; status?: string },
  ) =>
    request<Enrollment>(`/classes/${classId}/enrollments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  createAssignment: (classId: string, payload: {
    title: string;
    description?: string;
    type?: AssignmentType;
    dueAt: string;
    publishAt?: string;
    gradingSchema?: GradingSchema;
    maxPoints?: number;
  }) =>
    request<Assignment>(`/classes/${classId}/assignments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAssignmentsForClass: (classId: string) =>
    request<Assignment[]>(`/classes/${classId}/assignments`),
  updateAssignment: (assignmentId: string, payload: Partial<Assignment>) =>
    request<Assignment>(`/assignments/${assignmentId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getAssignment: (assignmentId: string) =>
    request<Assignment>(`/assignments/${assignmentId}`),

  upsertGrade: (
    assignmentId: string,
    payload: {
      studentId: string;
      score?: number;
      letterGrade?: string;
      feedback?: string;
      status?: GradeStatus;
    },
  ) =>
    request<Grade>(`/assignments/${assignmentId}/grades`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getGradesForAssignment: (assignmentId: string) =>
    request<Grade[]>(`/assignments/${assignmentId}/grades`),
  releaseGrade: (gradeId: string, payload: { releaseAt?: string; feedback?: string }) =>
    request<Grade>(`/grades/${gradeId}/release`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getGradesForStudent: (studentId: string) =>
    request<Grade[]>(`/students/${studentId}/grades`),
  getStudentAssignments: (studentId: string) =>
    request<StudentAssignmentOverview[]>(`/students/${studentId}/assignments`),
};
