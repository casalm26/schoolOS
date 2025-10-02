import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { Assignment, Grade, GradeStatus, api } from "@/lib/api";
import type { User } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const gradeStatusOptions: { label: string; value: GradeStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Pending release", value: "pending_release" },
  { label: "Released", value: "released" },
];

const gradeStatusStyleMap: Record<GradeStatus, string> = {
  draft: "border-slate-700 bg-slate-900/80 text-slate-200",
  pending_release: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  released: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
};

function formatDate(value?: string) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return "–";
  return new Date(value).toLocaleString();
}

function getGradeStatusLabel(status?: GradeStatus) {
  if (!status) return "No grade";
  return gradeStatusOptions.find((option) => option.value === status)?.label ?? status;
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
      <p className="font-semibold text-white">{title}</p>
      {description ? <p className="text-xs text-slate-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export default function TeacherWorkspace() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [createAssignmentError, setCreateAssignmentError] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [studentGroupError, setStudentGroupError] = useState<string | null>(null);
  const [graderGroupError, setGraderGroupError] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [classFormError, setClassFormError] = useState<string | null>(null);

  const [newClassTitle, setNewClassTitle] = useState("");
  const [newClassCode, setNewClassCode] = useState("");
  const [newClassCohortId, setNewClassCohortId] = useState<string>("");

  const [newStudentGroupName, setNewStudentGroupName] = useState("");
  const [newStudentGroupMembers, setNewStudentGroupMembers] = useState<string[]>([]);
  const [selectedStudentGroupId, setSelectedStudentGroupId] = useState<string>("");
  const [selectedStudentGroupMembers, setSelectedStudentGroupMembers] = useState<string[]>([]);

  const [newGraderGroupName, setNewGraderGroupName] = useState("");
  const [newGraderGroupGraders, setNewGraderGroupGraders] = useState<string[]>([]);
  const [selectedGraderGroupId, setSelectedGraderGroupId] = useState<string>("");
  const [selectedGraderGroupGraders, setSelectedGraderGroupGraders] = useState<string[]>([]);

  const [selectedBundleStudentGroupId, setSelectedBundleStudentGroupId] = useState<string>("");
  const [selectedBundleGraderGroupId, setSelectedBundleGraderGroupId] = useState<string>("");
  const [bundleNotes, setBundleNotes] = useState("");

  const [activeGroupTab, setActiveGroupTab] = useState<"students" | "graders" | "bundles">("students");

  const extractSelectedValues = (event: ChangeEvent<HTMLSelectElement>) =>
    Array.from(event.target.selectedOptions, (option) => option.value);

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

  const { data: studentGroups } = useQuery({
    queryKey: ["studentGroups", selectedClassId],
    queryFn: () => api.getStudentGroups(selectedClassId),
    enabled: Boolean(selectedClassId && user),
  });

  const { data: graderGroups } = useQuery({
    queryKey: ["graderGroups", selectedClassId],
    queryFn: () => api.getGraderGroups(selectedClassId),
    enabled: Boolean(selectedClassId && user),
  });

  const { data: groupBundles } = useQuery({
    queryKey: ["groupBundles", selectedClassId],
    queryFn: () => api.getGroupBundles(selectedClassId),
    enabled: Boolean(selectedClassId && user),
  });

  useEffect(() => {
    if (!studentGroups?.length) {
      setSelectedStudentGroupId("");
      setSelectedStudentGroupMembers([]);
      return;
    }

    const current =
      studentGroups.find((group) => group._id === selectedStudentGroupId) ?? studentGroups[0];

    if (current._id !== selectedStudentGroupId) {
      setSelectedStudentGroupId(current._id);
    }

    setSelectedStudentGroupMembers(current.memberIds ?? []);
  }, [studentGroups, selectedStudentGroupId]);

  useEffect(() => {
    if (!graderGroups?.length) {
      setSelectedGraderGroupId("");
      setSelectedGraderGroupGraders([]);
      return;
    }

    const current =
      graderGroups.find((group) => group._id === selectedGraderGroupId) ?? graderGroups[0];

    if (current._id !== selectedGraderGroupId) {
      setSelectedGraderGroupId(current._id);
    }

    setSelectedGraderGroupGraders(current.graderIds ?? []);
  }, [graderGroups, selectedGraderGroupId]);

  useEffect(() => {
    if (!studentGroups?.length) {
      setSelectedBundleStudentGroupId("");
      return;
    }

    if (!studentGroups.some((group) => group._id === selectedBundleStudentGroupId)) {
      setSelectedBundleStudentGroupId(studentGroups[0]._id);
    }
  }, [studentGroups, selectedBundleStudentGroupId]);

  useEffect(() => {
    if (!graderGroups?.length) {
      setSelectedBundleGraderGroupId("");
      return;
    }

    if (!graderGroups.some((group) => group._id === selectedBundleGraderGroupId)) {
      setSelectedBundleGraderGroupId(graderGroups[0]._id);
    }
  }, [graderGroups, selectedBundleGraderGroupId]);

  const { data: cohorts } = useQuery({
    queryKey: ["cohorts", "all"],
    queryFn: () => api.getCohorts(),
    enabled: !!user,
  });

  const availableCohorts = useMemo(() => cohorts ?? [], [cohorts]);

  useEffect(() => {
    if (!newClassCohortId && availableCohorts.length) {
      setNewClassCohortId(availableCohorts[0]._id);
    }
  }, [availableCohorts, newClassCohortId]);

  const createClassMutation = useMutation({
    mutationFn: (payload: { cohortId: string; title: string; code: string }) =>
      api.createClass({
        cohortId: payload.cohortId,
        title: payload.title,
        code: payload.code,
        instructorIds: user ? [user._id] : [],
      }),
    onSuccess: (newClass) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setSelectedClassId(newClass._id);
      setNewClassTitle("");
      setNewClassCode("");
      setClassFormError(null);
    },
    onError: (error: Error) => setClassFormError(error.message),
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

  const createStudentGroupMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createStudentGroup>[1]) =>
      api.createStudentGroup(selectedClassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentGroups", selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ["groupBundles", selectedClassId] });
      setNewStudentGroupName("");
      setNewStudentGroupMembers([]);
      setStudentGroupError(null);
    },
    onError: (error: Error) => setStudentGroupError(error.message),
  });

  const updateStudentGroupMembersMutation = useMutation({
    mutationFn: (variables: { groupId: string; memberIds: string[] }) =>
      api.updateStudentGroupMembers(selectedClassId, variables.groupId, variables.memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentGroups", selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ["groupBundles", selectedClassId] });
      setStudentGroupError(null);
    },
    onError: (error: Error) => setStudentGroupError(error.message),
  });

  const createGraderGroupMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createGraderGroup>[1]) =>
      api.createGraderGroup(selectedClassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graderGroups", selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ["groupBundles", selectedClassId] });
      setNewGraderGroupName("");
      setNewGraderGroupGraders([]);
      setGraderGroupError(null);
    },
    onError: (error: Error) => setGraderGroupError(error.message),
  });

  const updateGraderGroupMutation = useMutation({
    mutationFn: (variables: { groupId: string; graderIds: string[] }) =>
      api.updateGraderGroup(selectedClassId, variables.groupId, {
        graderIds: variables.graderIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graderGroups", selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ["groupBundles", selectedClassId] });
      setGraderGroupError(null);
    },
    onError: (error: Error) => setGraderGroupError(error.message),
  });

  const createBundleMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.createGroupBundle>[1]) =>
      api.createGroupBundle(selectedClassId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupBundles", selectedClassId] });
      setSelectedBundleStudentGroupId("");
      setSelectedBundleGraderGroupId("");
      setBundleNotes("");
      setBundleError(null);
    },
    onError: (error: Error) => setBundleError(error.message),
  });

  const handleCreateClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClassFormError(null);

    if (!user) {
      setClassFormError("You must be signed in to create a class");
      return;
    }

    if (!newClassTitle.trim() || !newClassCode.trim()) {
      setClassFormError("Class title and code are required");
      return;
    }

    if (!newClassCohortId) {
      setClassFormError("Select a cohort");
      return;
    }

    createClassMutation.mutate({
      cohortId: newClassCohortId,
      title: newClassTitle.trim(),
      code: newClassCode.trim(),
    });
  };

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

  const handleCreateStudentGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStudentGroupError(null);
    if (!selectedClassId) {
      setStudentGroupError("Select a class first");
      return;
    }
    if (!newStudentGroupName.trim()) {
      setStudentGroupError("Group name is required");
      return;
    }

    createStudentGroupMutation.mutate({
      name: newStudentGroupName.trim(),
      memberIds: newStudentGroupMembers,
    });
  };

  const handleUpdateStudentGroupMembers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStudentGroupError(null);
    if (!selectedClassId) {
      setStudentGroupError("Select a class first");
      return;
    }
    if (!selectedStudentGroupId) {
      setStudentGroupError("Select a student group");
      return;
    }

    updateStudentGroupMembersMutation.mutate({
      groupId: selectedStudentGroupId,
      memberIds: selectedStudentGroupMembers,
    });
  };

  const handleCreateGraderGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGraderGroupError(null);
    if (!selectedClassId) {
      setGraderGroupError("Select a class first");
      return;
    }
    if (!newGraderGroupName.trim()) {
      setGraderGroupError("Group name is required");
      return;
    }
    if (!newGraderGroupGraders.length) {
      setGraderGroupError("Select at least one grader");
      return;
    }

    createGraderGroupMutation.mutate({
      name: newGraderGroupName.trim(),
      graderIds: newGraderGroupGraders,
    });
  };

  const handleUpdateGraderGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGraderGroupError(null);
    if (!selectedClassId) {
      setGraderGroupError("Select a class first");
      return;
    }
    if (!selectedGraderGroupId) {
      setGraderGroupError("Select a grader group");
      return;
    }
    if (!selectedGraderGroupGraders.length) {
      setGraderGroupError("Select at least one grader");
      return;
    }

    updateGraderGroupMutation.mutate({
      groupId: selectedGraderGroupId,
      graderIds: selectedGraderGroupGraders,
    });
  };

  const handleCreateBundle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBundleError(null);
    if (!selectedClassId) {
      setBundleError("Select a class first");
      return;
    }
    if (!selectedBundleStudentGroupId || !selectedBundleGraderGroupId) {
      setBundleError("Select both a student group and a grader group");
      return;
    }

    createBundleMutation.mutate({
      studentGroupId: selectedBundleStudentGroupId,
      graderGroupId: selectedBundleGraderGroupId,
      notes: bundleNotes || undefined,
    });
  };

  const gradeByStudentId = useMemo(() => {
    const map = new Map<string, Grade | undefined>();
    grades?.forEach((grade) => {
      map.set(grade.studentId, grade);
    });
    return map;
  }, [grades]);

  const selectedClass = useMemo(
    () => classes?.find((classItem) => classItem._id === selectedClassId),
    [classes, selectedClassId],
  );

  const instructorOptions = useMemo(
    () =>
      (selectedClass?.instructors ?? []).filter(
        (instructor): instructor is Pick<User, "_id" | "name" | "email"> => Boolean(instructor),
      ),
    [selectedClass],
  );

  const gradeSummary = useMemo(
    () =>
      grades?.reduce(
        (acc, grade) => {
          acc.total += 1;
          if (grade.status === "released") acc.released += 1;
          if (grade.status === "pending_release") acc.pending += 1;
          if (grade.status === "draft") acc.draft += 1;
          return acc;
        },
        { total: 0, released: 0, pending: 0, draft: 0 },
      ) ?? { total: 0, released: 0, pending: 0, draft: 0 },
    [grades],
  );

  const nextDueAssignment = useMemo(() => {
    if (!assignments?.length) return null;
    const upcoming = [...assignments]
      .filter((assignment) => Boolean(assignment.dueAt))
      .sort((a, b) => {
        const timeA = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
        const timeB = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
        return timeA - timeB;
      });
    return upcoming[0] ?? null;
  }, [assignments]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading teacher workspace...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Teacher</p>
              <h1 className="text-3xl font-semibold">Assignment & grade control</h1>
              <p className="mt-1 text-sm text-slate-300">
                Publish work, capture scores, and release grades in one place.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Active class</p>
              <p className="mt-1 font-semibold text-white">
                {selectedClass ? selectedClass.title : "No class selected"}
              </p>
              <p className="text-xs text-slate-400">
                {selectedClass ? selectedClass.code : "Choose a class to get started."}
              </p>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
            Signed in as <span className="text-white">{user?.name ?? user?.email ?? ""}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Roster</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {selectedClass ? (enrollments?.length ?? 0) : "–"}
            </p>
            <p className="text-xs text-slate-400">Students enrolled in this class</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Assignments</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {selectedClass ? (assignments?.length ?? 0) : "–"}
            </p>
            <p className="text-xs text-slate-400">Visible to this class</p>
          </div>
          <div
            className={`rounded-xl border bg-slate-900/60 p-5 ${gradeSummary.pending ? "border-amber-400/40" : "border-white/10"}`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">Pending releases</p>
            <p className="mt-2 text-2xl font-semibold text-white">{gradeSummary.pending}</p>
            <p className="text-xs text-slate-400">Grades awaiting release</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Next due</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {nextDueAssignment ? formatDate(nextDueAssignment.dueAt) : "–"}
            </p>
            <p className="text-xs text-slate-400">
              {nextDueAssignment ? nextDueAssignment.title : "No upcoming deadlines"}
            </p>
          </div>
        </section>

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

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Create a class</h2>
              <p className="text-sm text-slate-300">
                Launch a fresh class, connect it to an existing cohort, and you will be added as the
                default instructor.
              </p>
            </div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {availableCohorts.length ? `${availableCohorts.length} cohort${availableCohorts.length === 1 ? "" : "s"}` : "No cohorts available"}
            </p>
          </div>
          <form onSubmit={handleCreateClass} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2 flex flex-col gap-1">
              <label htmlFor="class-title" className="text-xs uppercase tracking-wide text-slate-400">
                Class title
              </label>
              <input
                id="class-title"
                name="title"
                value={newClassTitle}
                onChange={(event) => setNewClassTitle(event.target.value)}
                placeholder="e.g. Algebra II"
                className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="class-code" className="text-xs uppercase tracking-wide text-slate-400">
                Class code
              </label>
              <input
                id="class-code"
                name="code"
                value={newClassCode}
                onChange={(event) => setNewClassCode(event.target.value)}
                placeholder="e.g. ALG-204"
                className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="class-cohort" className="text-xs uppercase tracking-wide text-slate-400">
                Cohort
              </label>
              <select
                id="class-cohort"
                name="cohort"
                value={newClassCohortId}
                onChange={(event) => setNewClassCohortId(event.target.value)}
                disabled={!availableCohorts.length}
                className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              >
                {availableCohorts.length ? (
                  availableCohorts.map((cohort) => (
                    <option key={cohort._id} value={cohort._id}>
                      {cohort.label}
                    </option>
                  ))
                ) : (
                  <option value="">No cohorts available</option>
                )}
              </select>
            </div>
            {classFormError ? (
              <p className="md:col-span-2 lg:col-span-4 text-sm text-red-400">{classFormError}</p>
            ) : null}
            <button
              type="submit"
              disabled={createClassMutation.isPending || !availableCohorts.length}
              className="md:col-span-2 lg:col-span-1 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createClassMutation.isPending ? "Creating…" : "Create class"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Groups & bundles</h2>
              <p className="text-sm text-slate-300">
                Organize students and graders for collaborative evaluation workflows.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 p-1 text-xs">
              {([
                { value: "students", label: "Student groups" },
                { value: "graders", label: "Grader groups" },
                { value: "bundles", label: "Bundles" },
              ] as const).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveGroupTab(tab.value)}
                  className={`rounded-full px-4 py-2 font-medium transition ${
                    activeGroupTab === tab.value
                      ? "bg-emerald-500 text-black"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeGroupTab === "students" ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={handleCreateStudentGroup}
                className="rounded-lg border border-white/10 bg-slate-950/60 p-4 space-y-3"
              >
                <h3 className="text-sm font-semibold text-white">New student group</h3>
                <div className="flex flex-col gap-1">
                  <label htmlFor="student-group-name" className="text-xs uppercase tracking-wide text-slate-400">
                    Group name
                  </label>
                  <input
                    id="student-group-name"
                    value={newStudentGroupName}
                    onChange={(event) => setNewStudentGroupName(event.target.value)}
                    placeholder="e.g. Project Team A"
                    className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="student-group-members" className="text-xs uppercase tracking-wide text-slate-400">
                    Members
                  </label>
                  <select
                    id="student-group-members"
                    multiple
                    value={newStudentGroupMembers}
                    onChange={(event) => setNewStudentGroupMembers(extractSelectedValues(event))}
                    className="h-32 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                  >
                    {enrollments?.map((enrollment) => (
                      <option key={enrollment._id} value={enrollment.studentId}>
                        {enrollment.student
                          ? `${enrollment.student.name} • ${enrollment.student.email}`
                          : enrollment.studentId}
                      </option>
                    ))}
                  </select>
                </div>
                {studentGroupError ? (
                  <p className="text-xs text-red-400">{studentGroupError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={createStudentGroupMutation.isPending}
                  className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createStudentGroupMutation.isPending ? "Creating…" : "Create group"}
                </button>
              </form>

              <div className="space-y-4">
                <form
                  onSubmit={handleUpdateStudentGroupMembers}
                  className="rounded-lg border border-white/10 bg-slate-950/60 p-4 space-y-3"
                >
                  <h3 className="text-sm font-semibold text-white">Update membership</h3>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="student-group-select" className="text-xs uppercase tracking-wide text-slate-400">
                      Select group
                    </label>
                    <select
                      id="student-group-select"
                      value={selectedStudentGroupId}
                      onChange={(event) => {
                        setSelectedStudentGroupId(event.target.value);
                        const group = studentGroups?.find((item) => item._id === event.target.value);
                        if (group) {
                          setSelectedStudentGroupMembers(group.memberIds ?? []);
                        }
                      }}
                      className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                    >
                      {studentGroups?.map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="student-group-edit-members" className="text-xs uppercase tracking-wide text-slate-400">
                      Members
                    </label>
                    <select
                      id="student-group-edit-members"
                      multiple
                      value={selectedStudentGroupMembers}
                      onChange={(event) => setSelectedStudentGroupMembers(extractSelectedValues(event))}
                      className="h-32 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                    >
                      {enrollments?.map((enrollment) => (
                        <option key={enrollment._id} value={enrollment.studentId}>
                          {enrollment.student
                            ? `${enrollment.student.name} • ${enrollment.student.email}`
                            : enrollment.studentId}
                        </option>
                      ))}
                    </select>
                  </div>
                  {studentGroupError ? (
                    <p className="text-xs text-red-400">{studentGroupError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={updateStudentGroupMembersMutation.isPending}
                    className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updateStudentGroupMembersMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                </form>

                <div className="space-y-2">
                  {studentGroups?.length ? (
                    studentGroups.map((group) => (
                      <div key={group._id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-300">
                        <p className="font-semibold text-white">{group.name}</p>
                        <p className="mt-1">Members:</p>
                        <ul className="mt-1 list-inside list-disc space-y-1">
                          {(group.members?.length ? group.members : group.memberIds)?.map((member, index) => {
                            if (typeof member === "string") {
                              return <li key={`member-${group._id}-${member}`}>{member}</li>;
                            }

                            const resolvedMember = member as Pick<User, "_id" | "name" | "email"> | null;
                            if (!resolvedMember) {
                              return <li key={`member-${group._id}-${index}`}>Unknown</li>;
                            }

                            return (
                              <li key={resolvedMember._id}>
                                {resolvedMember.name} • {resolvedMember.email}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No student groups"
                      description="Create a group to coordinate collaborative or differentiated work."
                    />
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeGroupTab === "graders" ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <form
                onSubmit={handleCreateGraderGroup}
                className="rounded-lg border border-white/10 bg-slate-950/60 p-4 space-y-3"
              >
                <h3 className="text-sm font-semibold text-white">New grader group</h3>
                <div className="flex flex-col gap-1">
                  <label htmlFor="grader-group-name" className="text-xs uppercase tracking-wide text-slate-400">
                    Group name
                  </label>
                  <input
                    id="grader-group-name"
                    value={newGraderGroupName}
                    onChange={(event) => setNewGraderGroupName(event.target.value)}
                    placeholder="e.g. Staff Reviewers"
                    className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="grader-group-members" className="text-xs uppercase tracking-wide text-slate-400">
                    Graders
                  </label>
                  <select
                    id="grader-group-members"
                    multiple
                    value={newGraderGroupGraders}
                    onChange={(event) => setNewGraderGroupGraders(extractSelectedValues(event))}
                    className="h-32 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                  >
                    {instructorOptions.map((instructor) => (
                      <option key={instructor._id} value={instructor._id}>
                        {instructor.name} • {instructor.email}
                      </option>
                    ))}
                  </select>
                </div>
                {graderGroupError ? (
                  <p className="text-xs text-red-400">{graderGroupError}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={createGraderGroupMutation.isPending || !instructorOptions.length}
                  className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createGraderGroupMutation.isPending ? "Creating…" : "Create grader group"}
                </button>
              </form>

              <div className="space-y-4">
                <form
                  onSubmit={handleUpdateGraderGroup}
                  className="rounded-lg border border-white/10 bg-slate-950/60 p-4 space-y-3"
                >
                  <h3 className="text-sm font-semibold text-white">Update grader assignments</h3>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="grader-group-select" className="text-xs uppercase tracking-wide text-slate-400">
                      Select group
                    </label>
                    <select
                      id="grader-group-select"
                      value={selectedGraderGroupId}
                      onChange={(event) => {
                        setSelectedGraderGroupId(event.target.value);
                        const group = graderGroups?.find((item) => item._id === event.target.value);
                        if (group) {
                          setSelectedGraderGroupGraders(group.graderIds ?? []);
                        }
                      }}
                      className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                    >
                      {graderGroups?.map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="grader-group-edit" className="text-xs uppercase tracking-wide text-slate-400">
                      Graders
                    </label>
                    <select
                      id="grader-group-edit"
                      multiple
                      value={selectedGraderGroupGraders}
                      onChange={(event) => setSelectedGraderGroupGraders(extractSelectedValues(event))}
                      className="h-32 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                    >
                      {instructorOptions.map((instructor) => (
                        <option key={instructor._id} value={instructor._id}>
                          {instructor.name} • {instructor.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  {graderGroupError ? (
                    <p className="text-xs text-red-400">{graderGroupError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={updateGraderGroupMutation.isPending || !instructorOptions.length}
                    className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {updateGraderGroupMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                </form>

                <div className="space-y-2">
                  {graderGroups?.length ? (
                    graderGroups.map((group) => (
                      <div key={group._id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-300">
                        <p className="font-semibold text-white">{group.name}</p>
                        <p className="mt-1">Graders:</p>
                        <ul className="mt-1 list-inside list-disc space-y-1">
                          {(group.graders?.length ? group.graders : group.graderIds)?.map((grader, index) => {
                            if (typeof grader === "string") {
                              return <li key={`grader-${group._id}-${grader}`}>{grader}</li>;
                            }

                            const resolvedGrader = grader as Pick<User, "_id" | "name" | "email"> | null;
                            if (!resolvedGrader) {
                              return <li key={`grader-${group._id}-${index}`}>Unknown</li>;
                            }

                            return (
                              <li key={resolvedGrader._id}>
                                {resolvedGrader.name} • {resolvedGrader.email}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No grader groups"
                      description="Add graders to split review workload across staff."
                    />
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeGroupTab === "bundles" ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <form
                onSubmit={handleCreateBundle}
                className="rounded-lg border border-white/10 bg-slate-950/60 p-4 space-y-3"
              >
                <h3 className="text-sm font-semibold text-white">Bundle groups</h3>
                <div className="flex flex-col gap-1">
                  <label htmlFor="bundle-student-group" className="text-xs uppercase tracking-wide text-slate-400">
                    Student group
                  </label>
                  <select
                    id="bundle-student-group"
                    value={selectedBundleStudentGroupId}
                    onChange={(event) => setSelectedBundleStudentGroupId(event.target.value)}
                    className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                  >
                    {studentGroups?.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="bundle-grader-group" className="text-xs uppercase tracking-wide text-slate-400">
                    Grader group
                  </label>
                  <select
                    id="bundle-grader-group"
                    value={selectedBundleGraderGroupId}
                    onChange={(event) => setSelectedBundleGraderGroupId(event.target.value)}
                    className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                  >
                    {graderGroups?.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="bundle-notes" className="text-xs uppercase tracking-wide text-slate-400">
                    Notes (optional)
                  </label>
                  <textarea
                    id="bundle-notes"
                    value={bundleNotes}
                    onChange={(event) => setBundleNotes(event.target.value)}
                    rows={3}
                    className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm"
                    placeholder="Clarify the review focus for this bundle"
                  />
                </div>
                {bundleError ? <p className="text-xs text-red-400">{bundleError}</p> : null}
                <button
                  type="submit"
                  disabled={createBundleMutation.isPending || !studentGroups?.length || !graderGroups?.length}
                  className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createBundleMutation.isPending ? "Linking…" : "Create bundle"}
                </button>
              </form>

              <div className="space-y-3">
                {groupBundles?.length ? (
                  groupBundles.map((bundle) => (
                    <div key={bundle._id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4 text-xs text-slate-300">
                      <p className="font-semibold text-white">Bundle</p>
                      <p className="mt-2">
                        <span className="text-slate-400">Student group:</span> {bundle.studentGroup?.name ?? bundle.studentGroupId}
                      </p>
                      <p>
                        <span className="text-slate-400">Grader group:</span> {bundle.graderGroup?.name ?? bundle.graderGroupId}
                      </p>
                      {bundle.notes ? <p className="mt-2 text-slate-400">{bundle.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No bundles configured"
                    description="Pair student and grader groups to streamline the review queue."
                  />
                )}
              </div>
            </div>
          ) : null}
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
                    <button
                      key={assignment._id}
                      type="button"
                      onClick={() => setSelectedAssignmentId(assignment._id)}
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 ${selectedAssignmentId === assignment._id ? "border-emerald-400/60 bg-slate-950 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]" : "border-white/5 bg-slate-950/60 hover:border-emerald-400/40 hover:bg-slate-900/80"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-white">{assignment.title}</p>
                          <p className="text-xs text-slate-400">
                            Due {formatDate(assignment.dueAt)} • {assignment.type}
                          </p>
                          {assignment.description && (
                            <p className="mt-2 text-xs text-slate-300">{assignment.description}</p>
                          )}
                        </div>
                        <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">
                          {assignment.gradingSchema}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-slate-400">
                        <span className="rounded bg-slate-900/80 px-2 py-1">
                          Max {assignment.maxPoints ?? "—"} pts
                        </span>
                        {assignment.publishAt ? (
                          <span className="rounded bg-slate-900/80 px-2 py-1">
                            Publishes {formatDate(assignment.publishAt)}
                          </span>
                        ) : (
                          <span className="rounded bg-slate-900/80 px-2 py-1">Publishes immediately</span>
                        )}
                      </div>
                    </button>
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
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label htmlFor="assignment-title" className="text-xs uppercase tracking-wide text-slate-400">
                    Title
                  </label>
                  <input
                    id="assignment-title"
                    name="title"
                    placeholder="Assignment title"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label htmlFor="assignment-description" className="text-xs uppercase tracking-wide text-slate-400">
                    Description
                  </label>
                  <textarea
                    id="assignment-description"
                    name="description"
                    placeholder="Share expectations or resources"
                    className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="assignment-type" className="text-xs uppercase tracking-wide text-slate-400">
                    Type
                  </label>
                  <select
                    id="assignment-type"
                    name="type"
                    defaultValue="task"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text_white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="task">Task</option>
                    <option value="project">Project</option>
                    <option value="test">Test</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="assignment-grading" className="text-xs uppercase tracking-wide text-slate-400">
                    Grading
                  </label>
                  <select
                    id="assignment-grading"
                    name="gradingSchema"
                    defaultValue="points"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="points">Points</option>
                    <option value="percentage">Percentage</option>
                    <option value="pass_fail">Pass / Fail</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="assignment-due" className="text-xs uppercase tracking-wide text-slate-400">
                    Due date
                  </label>
                  <input
                    id="assignment-due"
                    type="date"
                    name="dueAt"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="assignment-publish" className="text-xs uppercase tracking-wide text-slate-400">
                    Publish date (optional)
                  </label>
                  <input
                    id="assignment-publish"
                    type="date"
                    name="publishAt"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="assignment-points" className="text-xs uppercase tracking-wide text-slate-400">
                    Max points
                  </label>
                  <input
                    id="assignment-points"
                    type="number"
                    name="maxPoints"
                    defaultValue={100}
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                {createAssignmentError && (
                  <p className="md:col-span-2 text-sm text-red-400">{createAssignmentError}</p>
                )}
                <button
                  type="submit"
                  disabled={createAssignment.isPending}
                  className="md:col-span-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font_medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {createAssignment.isPending ? "Publishing…" : "Publish assignment"}
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
                <label htmlFor="enrollment-email" className="text-xs uppercase tracking-wide text-slate-400">
                  Enroll by student email
                </label>
                <input
                  id="enrollment-email"
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
                        className="rounded-lg border border-white/5 bg-slate-950/60 px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-white">
                            {displayName}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${grade?.status ? gradeStatusStyleMap[grade.status] : "border-white/10 bg-slate-900/80 text-slate-200"}`}
                          >
                            {getGradeStatusLabel(grade?.status)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-slate-300">
                          {grade?.score !== undefined && grade?.score !== null ? (
                            <p>
                              <span className="text-slate-400">Score:</span> {grade.score}
                            </p>
                          ) : (
                            <p className="text-slate-500">No score recorded yet.</p>
                          )}
                          {grade?.feedback ? (
                            <p className="text-slate-400">{grade.feedback}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    title="No students enrolled"
                    description="Invite learners by email to start grading."
                  />
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Capture grade</h2>
              <form onSubmit={handleGradeSubmit} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="grade-student" className="block text-xs uppercase tracking-wide text-slate-400">
                    Student
                  </label>
                  <select
                    id="grade-student"
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
                  <div className="flex flex-col gap-1">
                    <label htmlFor="grade-score" className="text-xs uppercase tracking-wide text-slate-400">
                      Score
                    </label>
                    <input
                      id="grade-score"
                      type="number"
                      name="score"
                      placeholder="Score"
                      className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="grade-letter" className="text-xs uppercase tracking-wide text-slate-400">
                      Letter grade
                    </label>
                    <input
                      id="grade-letter"
                      name="letterGrade"
                      placeholder="Optional"
                      className="rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="grade-feedback" className="text-xs uppercase tracking-wide text-slate-400">
                    Feedback
                  </label>
                  <textarea
                    id="grade-feedback"
                    name="feedback"
                    placeholder="Feedback to student"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="grade-status" className="text-xs uppercase tracking-wide text-slate-400">
                    Status
                  </label>
                  <select
                    id="grade-status"
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
                  grades.map((grade) => {
                    const lastChange = grade.history?.[grade.history.length - 1]?.changedAt;
                    return (
                      <div
                        key={grade._id}
                        className="space-y-3 rounded-lg border border-white/5 bg-slate-950/60 px-4 py-4 text-xs"
                      >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-white">
                          {grade.student
                            ? `${grade.student.name} • ${grade.student.email}`
                            : grade.studentId}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${gradeStatusStyleMap[grade.status]}`}
                        >
                          {getGradeStatusLabel(grade.status)}
                        </span>
                      </div>
                      <div className="grid gap-2 text-slate-300 sm:grid-cols-2">
                        <div>
                          <p className="text-slate-400">Score</p>
                          <p className="text-sm text-white">{grade.score ?? "–"}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Letter</p>
                          <p className="text-sm text-white">{grade.letterGrade ?? "–"}</p>
                        </div>
                      </div>
                      {grade.feedback && <p className="text-slate-400">{grade.feedback}</p>}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-slate-500">
                        <span>
                          {lastChange ? `Updated ${formatDateTime(lastChange)}` : "Awaiting updates"}
                        </span>
                        {grade.releasedAt ? <span>Released {formatDateTime(grade.releasedAt)}</span> : <span>Not released</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          releaseGrade.mutate({
                            gradeId: grade._id,
                          })
                        }
                        disabled={releaseGrade.isPending || grade.status === "released"}
                        className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-medium text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {grade.status === "released"
                          ? "Grade released"
                          : releaseGrade.isPending
                            ? "Releasing…"
                            : "Release grade"}
                      </button>
                    </div>
                    );
                  })
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
