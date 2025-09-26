import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { GradeStatus, StudentAssignmentOverview, api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const statusLabels: Record<GradeStatus, string> = {
  draft: "Draft",
  pending_release: "Awaiting release",
  released: "Released",
};

function statusColor(status: GradeStatus) {
  switch (status) {
    case "released":
      return "bg-emerald-500/80 text-black";
    case "pending_release":
      return "bg-amber-400/80 text-black";
    default:
      return "bg-slate-700 text-slate-100";
  }
}

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [activeStudentId, setActiveStudentId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<GradeStatus | "all">("all");

  useEffect(() => {
    if (!loading && !user) {
      void router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "student") {
      setStudentId(user._id);
      setActiveStudentId(user._id);
    }
  }, [user]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["studentAssignments", activeStudentId],
    queryFn: () => api.getStudentAssignments(activeStudentId),
    enabled: Boolean(activeStudentId && user),
  });

  const handleLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!studentId.trim()) {
      return;
    }
    setActiveStudentId(studentId.trim());
  };

  const assignments = useMemo(
    () => ((data ?? []) as StudentAssignmentOverview[]).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [data],
  );

  const filteredAssignments = useMemo(() => {
    if (statusFilter === "all") return assignments;
    return assignments.filter((assignment) => assignment.status === statusFilter);
  }, [assignments, statusFilter]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p>{loading ? "Loading dashboard…" : "Redirecting…"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Student</p>
            <h1 className="text-3xl font-semibold">My assignments & grades</h1>
            <p className="mt-1 text-sm text-slate-300">
              See upcoming deadlines, grade status, and feedback from your instructors.
            </p>
          </div>
          {user.role !== "student" && (
            <form onSubmit={handleLookup} className="flex w-full max-w-md items-center gap-3">
              <input
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="Enter student ID"
                className="flex-1 rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400"
              >
                View
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {!activeStudentId && (
          <p className="rounded-xl border border-white/10 bg-slate-900/60 px-6 py-8 text-sm text-slate-300">
            Enter your student ID to load personalised tasks and released grades.
          </p>
        )}

        {activeStudentId && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Assignments</h2>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <label htmlFor="status-filter" className="text-xs uppercase tracking-wide text-slate-400">
                  Filter
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as GradeStatus | "all")}
                  className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="draft">Not graded</option>
                  <option value="pending_release">Awaiting release</option>
                  <option value="released">Released</option>
                </select>
                {isFetching && <span className="text-slate-500">Refreshing…</span>}
              </div>
            </div>

            {isError && (
              <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {(error as Error).message}
              </p>
            )}

            {filteredAssignments.length ? (
              <ul className="grid gap-4 md:grid-cols-2">
                {filteredAssignments.map((assignment) => {
                  const dueDate = new Date(assignment.dueAt);
                  const timeDiff = dueDate.getTime() - Date.now();
                  const isOverdue = timeDiff < 0 && assignment.status !== "released";
                  const isDueSoon = timeDiff >= 0 && timeDiff <= 1000 * 60 * 60 * 72;

                  return (
                    <li
                      key={assignment.assignmentId}
                      className="space-y-3 rounded-xl border border-white/10 bg-slate-900/60 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">
                            {assignment.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                            <span>Due {dueDate.toLocaleDateString()}</span>
                            {isOverdue && (
                              <span className="rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-semibold text-black">
                                Overdue
                              </span>
                            )}
                            {!isOverdue && isDueSoon && (
                              <span className="rounded-full bg-amber-400/80 px-2 py-0.5 text-[10px] font-semibold text-black">
                                Due soon
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusColor(assignment.status)}`}
                        >
                          {statusLabels[assignment.status]}
                        </span>
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-slate-300">{assignment.description}</p>
                      )}

                      <div className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
                        <p>
                          Grading: <span className="font-semibold">{assignment.gradingSchema}</span>
                        </p>
                        <p>Max points: {assignment.maxPoints}</p>
                        {assignment.grade ? (
                          <div className="mt-2 space-y-1">
                            <p>
                              Score: <span className="font-semibold">{assignment.grade.score ?? "–"}</span>
                            </p>
                            <p>
                              Letter grade: <span className="font-semibold">{assignment.grade.letterGrade ?? "–"}</span>
                            </p>
                            {assignment.grade.feedback && (
                              <p className="text-slate-200">
                                Feedback: {assignment.grade.feedback}
                              </p>
                            )}
                            {assignment.grade.releasedAt && (
                              <p className="text-slate-400">
                                Released {new Date(assignment.grade.releasedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-slate-400">
                            Grade will appear here after your teacher publishes it.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-white/10 bg-slate-900/60 px-6 py-8 text-sm text-slate-300">
                No assignments yet. Your instructors will publish tasks here once the course begins.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
