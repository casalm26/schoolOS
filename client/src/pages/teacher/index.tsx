import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { Assignment, Grade, GradeStatus, api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const gradeStatusOptions: { label: string; value: GradeStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Pending release", value: "pending_release" },
  { label: "Released", value: "released" },
];

function formatDate(value?: string) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString();
}

export default function TeacherWorkspace() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [createAssignmentError, setCreateAssignmentError] = useState<string | null>(
    null,
  );
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "teacher" && user.role !== "admin"))) {
      void router.replace("/login");
    }
  }, [loading, user, router]);

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.getClasses(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!selectedClassId && classes?.length) {
      setSelectedClassId(classes[0]._id);
    }
  }, [classes, selectedClassId]);

  const { data: assignments } = useQuery({
    queryKey: ["assignments", selectedClassId],
    queryFn: () => api.getAssignmentsForClass(selectedClassId),
    enabled: Boolean(selectedClassId && user),
  });

  useEffect(() => {
    if (assignments?.length) {
      setSelectedAssignmentId((prev) => prev || assignments[0]._id);
    } else {
      setSelectedAssignmentId("");
    }
  }, [assignments]);

  const { data: grades } = useQuery({
    queryKey: ["grades", selectedAssignmentId],
    queryFn: () => api.getGradesForAssignment(selectedAssignmentId),
    enabled: Boolean(selectedAssignmentId && user),
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments", selectedClassId],
    queryFn: () => api.getClassEnrollments(selectedClassId),
    enabled: Boolean(selectedClassId && user),
  });

  const createAssignment = useMutation({
    mutationFn: (payload: Parameters<typeof api.createAssignment>[1]) =>
      api.createAssignment(selectedClassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments", selectedClassId] });
    },
    onError: (error: Error) => setCreateAssignmentError(error.message),
  });

  const upsertGrade = useMutation({
    mutationFn: (variables: { assignmentId: string; payload: Parameters<typeof api.upsertGrade>[1] }) =>
      api.upsertGrade(variables.assignmentId, variables.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades", selectedAssignmentId] });
    },
    onError: (error: Error) => setGradeError(error.message),
  });

  const releaseGrade = useMutation({
    mutationFn: (variables: { gradeId: string; releaseAt?: string }) =>
      api.releaseGrade(variables.gradeId, { releaseAt: variables.releaseAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades", selectedAssignmentId] });
    },
    onError: (error: Error) => setGradeError(error.message),
  });

  const enrollStudent = useMutation({
    mutationFn: (payload: Parameters<typeof api.enrollStudentInClass>[1]) =>
      api.enrollStudentInClass(selectedClassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", selectedClassId] });
      setEnrollmentError(null);
    },
    onError: (error: Error) => setEnrollmentError(error.message),
  });

  const handleAssignmentCreation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateAssignmentError(null);
    if (!selectedClassId) {
      setCreateAssignmentError("Select a class first");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const dueAt = String(formData.get("dueAt") ?? "");

    if (!title || !dueAt) {
      setCreateAssignmentError("Title and due date are required");
      return;
    }

    createAssignment.mutate({
      title,
      description: String(formData.get("description") ?? "") || undefined,
      type: formData.get("type") as Assignment["type"],
      dueAt,
      publishAt: String(formData.get("publishAt") ?? "") || undefined,
      gradingSchema: formData.get("gradingSchema") as Assignment["gradingSchema"],
      maxPoints: Number(formData.get("maxPoints")) || undefined,
    });

    event.currentTarget.reset();
  };

  const handleGradeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGradeError(null);
    if (!selectedAssignmentId) {
      setGradeError("Select an assignment first");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const studentId = String(formData.get("studentId") ?? "").trim();

    if (!studentId) {
      setGradeError("Select a student to grade");
      return;
    }

    const scoreValue = formData.get("score");
    const score = scoreValue ? Number(scoreValue) : undefined;
    if (score !== undefined && Number.isNaN(score)) {
      setGradeError("Score must be a number");
      return;
    }
    const payload = {
      studentId,
      score,
      letterGrade: String(formData.get("letterGrade") ?? "") || undefined,
      feedback: String(formData.get("feedback") ?? "") || undefined,
      status: (formData.get("status") as GradeStatus) ?? "draft",
    };

    upsertGrade.mutate({ assignmentId: selectedAssignmentId, payload });
  };

  const handleEnrollStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEnrollmentError(null);
    if (!selectedClassId) {
      setEnrollmentError("Select a class first");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const studentEmail = String(formData.get("studentEmail") ?? "").trim();

    if (!studentEmail) {
      setEnrollmentError("Enter a student email");
      return;
    }

    enrollStudent.mutate({ studentEmail });
    event.currentTarget.reset();
  };

  const gradeByStudentId = useMemo(() => {
    const map = new Map<string, Grade | undefined>();
    grades?.forEach((grade) => {
      map.set(grade.studentId, grade);
    });
    return map;
  }, [grades]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Teacher</p>
            <h1 className="text-3xl font-semibold">Assignment & grade control</h1>
            <p className="mt-1 text-sm text-slate-300">
              Publish work, capture scores, and release grades in one place.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Active class
              </label>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              >
                {classes?.map((classItem) => (
                  <option key={classItem._id} value={classItem._id}>
                    {classItem.title} ({classItem.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Assignment focus
              </label>
              <select
                value={selectedAssignmentId}
                onChange={(event) => setSelectedAssignmentId(event.target.value)}
                className="min-w-[200px] rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              >
                {assignments?.length ? (
                  assignments.map((assignment) => (
                    <option key={assignment._id} value={assignment._id}>
                      {assignment.title}
                    </option>
                  ))
                ) : (
                  <option value="">No assignments yet</option>
                )}
              </select>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Assignments</h2>
                {assignments?.length ? (
                  <span className="text-xs uppercase tracking-wide text-slate-400">
                    {assignments.length} published
                  </span>
                ) : null}
              </div>
              <div className="mt-4 space-y-3">
                {assignments?.length ? (
                  assignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      className={`rounded-lg border px-4 py-3 text-sm transition ${selectedAssignmentId === assignment._id ? "border-emerald-400/60 bg-slate-950" : "border-white/5 bg-slate-950/60"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">
                            {assignment.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            Due {formatDate(assignment.dueAt)} • {assignment.type}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">
                          {assignment.gradingSchema}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No assignments created yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Create assignment</h2>
              <p className="mt-1 text-sm text-slate-300">
                New assignments become visible to enrolled students immediately after publish date.
              </p>
              <form onSubmit={handleAssignmentCreation} className="mt-4 grid gap-4 md:grid-cols-2">
                <input
                  name="title"
                  placeholder="Assignment title"
                  className="md:col-span-2 rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                />
                <textarea
                  name="description"
                  placeholder="Optional description"
                  className="md:col-span-2 rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Type
                  </label>
                  <select
                    name="type"
                    defaultValue="task"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <option value="task">Task</option>
                    <option value="project">Project</option>
                    <option value="test">Test</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Grading
                  </label>
                  <select
                    name="gradingSchema"
                    defaultValue="points"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <option value="points">Points</option>
                    <option value="percentage">Percentage</option>
                    <option value="pass_fail">Pass / Fail</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Due date
                  </label>
                  <input
                    type="date"
                    name="dueAt"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Publish date (optional)
                  </label>
                  <input
                    type="date"
                    name="publishAt"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">
                    Max points
                  </label>
                  <input
                    type="number"
                    name="maxPoints"
                    defaultValue={100}
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                </div>
                {createAssignmentError && (
                  <p className="md:col-span-2 text-sm text-red-400">
                    {createAssignmentError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={createAssignment.isPending}
                  className="md:col-span-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {createAssignment.isPending ? "Creating…" : "Add assignment"}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Class roster</h2>
              <p className="mt-1 text-sm text-slate-300">
                Enrolled learners appear with their latest grade progress per assignment.
              </p>
              <form onSubmit={handleEnrollStudent} className="mt-4 space-y-3 rounded-lg border border-white/10 bg-slate-950/50 p-4">
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Enroll by student email
                </label>
                <input
                  name="studentEmail"
                  type="email"
                  placeholder="student@example.com"
                  className="w-full rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm"
                />
                {enrollmentError && <p className="text-xs text-red-400">{enrollmentError}</p>}
                <button
                  type="submit"
                  disabled={enrollStudent.isPending}
                  className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {enrollStudent.isPending ? "Adding…" : "Add to class"}
                </button>
              </form>
              <div className="mt-4 space-y-2">
                {enrollments?.length ? (
                  enrollments.map((enrollment) => {
                    const grade = gradeByStudentId.get(enrollment.studentId);
                    const profile = enrollment.student;
                    const displayName = profile
                      ? `${profile.name} • ${profile.email}`
                      : enrollment.studentId;
                    return (
                      <div
                        key={enrollment._id}
                        className="rounded-lg border border-white/5 bg-slate-950/60 px-4 py-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            {displayName}
                          </span>
                          <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-200">
                            {grade?.status ?? "no grade"}
                          </span>
                        </div>
                        {grade?.score !== undefined && grade?.score !== null ? (
                          <p className="mt-1 text-slate-300">
                            Score: {grade.score}
                          </p>
                        ) : null}
                        {grade?.feedback ? (
                          <p className="mt-1 text-slate-400">{grade.feedback}</p>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-400">
                    No students enrolled yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Capture grade</h2>
              <form onSubmit={handleGradeSubmit} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-wide text-slate-400">
                    Student
                  </label>
                  <select
                    name="studentId"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {enrollments?.length ? "Select student" : "No students enrolled"}
                    </option>
                    {enrollments?.map((enrollment) => (
                      <option key={enrollment._id} value={enrollment.studentId}>
                        {enrollment.student
                          ? `${enrollment.student.name} • ${enrollment.student.email}`
                          : enrollment.studentId}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="number"
                    name="score"
                    placeholder="Score"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                  <input
                    name="letterGrade"
                    placeholder="Letter grade (optional)"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  name="feedback"
                  placeholder="Feedback to student"
                  className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    name="status"
                    defaultValue="draft"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    {gradeStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {gradeError && <p className="text-sm text-red-400">{gradeError}</p>}
                <button
                  type="submit"
                  disabled={upsertGrade.isPending}
                  className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {upsertGrade.isPending ? "Saving…" : "Save grade"}
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Recorded grades</h2>
              <div className="mt-4 space-y-3">
                {grades?.length ? (
                  grades.map((grade) => (
                    <div
                      key={grade._id}
                      className="space-y-2 rounded-lg border border-white/5 bg-slate-950/60 px-4 py-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {grade.student
                            ? `${grade.student.name} • ${grade.student.email}`
                            : grade.studentId}
                        </span>
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-200">
                          {grade.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Score: {grade.score ?? "–"}</span>
                        <span>Letter: {grade.letterGrade ?? "–"}</span>
                      </div>
                      {grade.feedback && <p className="text-slate-400">{grade.feedback}</p>}
                      {grade.releasedAt && (
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          Released {new Date(grade.releasedAt).toLocaleString()}
                        </p>
                      )}
                      <button
                        onClick={() =>
                          releaseGrade.mutate({
                            gradeId: grade._id,
                          })
                        }
                        disabled={releaseGrade.isPending || grade.status === "released"}
                        className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {grade.status === "released"
                          ? "Grade released"
                          : releaseGrade.isPending
                            ? "Releasing…"
                            : "Release grade"}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No grades captured yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
