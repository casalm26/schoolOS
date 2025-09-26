import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { api, Cohort, Programme, User, UserRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const roleOptions: { label: string; value: UserRole }[] = [
  { label: "Administrator", value: "admin" },
  { label: "Teacher", value: "teacher" },
  { label: "Student", value: "student" },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createProgrammeError, setCreateProgrammeError] = useState<string | null>(
    null,
  );
  const [createCohortError, setCreateCohortError] = useState<string | null>(null);
  const [createClassError, setCreateClassError] = useState<string | null>(null);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>([]);
  const [focusProgrammeId, setFocusProgrammeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      void router.replace("/login");
    }
  }, [loading, user, router]);

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: api.getUsers,
    enabled: user?.role === "admin",
  });
  const { data: programmes } = useQuery({
    queryKey: ["programmes"],
    queryFn: api.getProgrammes,
    enabled: user?.role === "admin",
  });

  useEffect(() => {
    if (programmes?.length) {
      setFocusProgrammeId((prev) => prev ?? programmes[0]._id);
    }
  }, [programmes]);

  const { data: cohorts } = useQuery({
    queryKey: ["cohorts", focusProgrammeId ?? "all"],
    queryFn: () => api.getCohorts(focusProgrammeId),
    enabled: Boolean(focusProgrammeId),
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: () => api.getClasses(),
    enabled: user?.role === "admin",
  });

  const createUser = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => setCreateUserError(error.message),
  });

  const createProgramme = useMutation({
    mutationFn: api.createProgramme,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programmes"] });
    },
    onError: (error: Error) => setCreateProgrammeError(error.message),
  });

  const createCohort = useMutation({
    mutationFn: api.createCohort,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cohorts", variables.programmeId] });
    },
    onError: (error: Error) => setCreateCohortError(error.message),
  });

  const createClass = useMutation({
    mutationFn: api.createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error: Error) => setCreateClassError(error.message),
  });

  const handleCreateUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateUserError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const role = formData.get("role") as UserRole;
    const password = String(formData.get("password") ?? "");

    if (!name || !email || !role || !password) {
      setCreateUserError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setCreateUserError("Password must be at least 8 characters");
      return;
    }

    createUser.mutate({ name, email, role, password });
    form.reset();
  };

  const handleCreateProgramme = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateProgrammeError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!name) {
      setCreateProgrammeError("Programme name is required");
      return;
    }
    createProgramme.mutate({ name, description: description || undefined });
    event.currentTarget.reset();
  };

  const handleCreateCohort = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateCohortError(null);
    const formData = new FormData(event.currentTarget);
    const programmeId = String(formData.get("programmeId") ?? "");
    const label = String(formData.get("label") ?? "").trim();
    const startAt = String(formData.get("startAt") ?? "");
    const endAt = String(formData.get("endAt") ?? "");

    if (!programmeId || !label || !startAt || !endAt) {
      setCreateCohortError("All cohort fields are required");
      return;
    }

    createCohort.mutate({ programmeId, label, startAt, endAt });
    event.currentTarget.reset();
  };

  const handleCreateClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateClassError(null);
    const formData = new FormData(event.currentTarget);
    const cohortId = String(formData.get("cohortId") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const code = String(formData.get("code") ?? "").trim();
    if (!cohortId || !title || !code) {
      setCreateClassError("All class fields are required");
      return;
    }

    if (selectedInstructorIds.length === 0) {
      setCreateClassError("Select at least one instructor");
      return;
    }

    createClass.mutate({ cohortId, title, code, instructorIds: selectedInstructorIds });
    setSelectedInstructorIds([]);
    event.currentTarget.reset();
  };

  const cohortsByProgramme = useMemo(() => {
    if (!cohorts) return new Map<string, Cohort[]>();
    return cohorts.reduce((acc, cohort) => {
      const items = acc.get(cohort.programmeId) ?? [];
      items.push(cohort);
      acc.set(cohort.programmeId, items);
      return acc;
    }, new Map<string, Cohort[]>());
  }, [cohorts]);

  const getCohortsForProgramme = (programme: Programme | undefined) => {
    if (!programme) return [];
    return cohortsByProgramme.get(programme._id) ?? [];
  };

  const cohortsForFocus = useMemo(() => {
    if (!focusProgrammeId) return [];
    return cohortsByProgramme.get(focusProgrammeId) ?? [];
  }, [focusProgrammeId, cohortsByProgramme]);

  const teachers = useMemo(() => users?.filter((entry) => entry.role === "teacher") ?? [], [users]);
  const userById = useMemo(() => {
    const map = new Map<string, User>();
    users?.forEach((entry) => map.set(entry._id, entry));
    return map;
  }, [users]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p>{loading ? "Loading admin console…" : "Redirecting…"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-3xl font-semibold">Programme Configuration</h1>
            <p className="mt-1 text-sm text-slate-300">
              Create users, programmes, cohorts, and classes before inviting staff.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[2fr_3fr]">
        <section className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Create user</h2>
            <p className="mt-1 text-sm text-slate-300">
              Add teachers and students so they can be assigned to classes and grades.
            </p>
            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <input
                name="name"
                placeholder="Full name"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              <select
                name="role"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                defaultValue="teacher"
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <input
                type="password"
                name="password"
                placeholder="Temporary password"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              {createUserError && (
                <p className="text-sm text-red-400">{createUserError}</p>
              )}
              <button
                type="submit"
                disabled={createUser.isPending}
                className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {createUser.isPending ? "Creating…" : "Create user"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Create programme</h2>
            <form onSubmit={handleCreateProgramme} className="mt-4 space-y-4">
              <input
                name="name"
                placeholder="Programme name"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              <textarea
                name="description"
                placeholder="Optional description"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
                rows={3}
              />
              {createProgrammeError && (
                <p className="text-sm text-red-400">{createProgrammeError}</p>
              )}
              <button
                type="submit"
                disabled={createProgramme.isPending}
                className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {createProgramme.isPending ? "Creating…" : "Create programme"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Create cohort</h2>
            <form onSubmit={handleCreateCohort} className="mt-4 space-y-4">
              <select
                name="programmeId"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                defaultValue=""
                onChange={(event) => setFocusProgrammeId(event.target.value)}
              >
                <option value="" disabled>
                  Select programme
                </option>
                {programmes?.map((programme) => (
                  <option key={programme._id} value={programme._id}>
                    {programme.name}
                  </option>
                ))}
              </select>
              <input
                name="label"
                placeholder="Cohort label (e.g. Autumn 2024)"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                    Start date
                  </label>
                  <input
                    type="date"
                    name="startAt"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                    End date
                  </label>
                  <input
                    type="date"
                    name="endAt"
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {createCohortError && (
                <p className="text-sm text-red-400">{createCohortError}</p>
              )}
              <button
                type="submit"
                disabled={createCohort.isPending}
                className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {createCohort.isPending ? "Creating…" : "Create cohort"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Create class</h2>
            <form onSubmit={handleCreateClass} className="mt-4 space-y-4">
              {programmes?.length ? (
                <div className="space-y-2">
                  <label className="block text-xs uppercase tracking-wide text-slate-400">
                    Programme
                  </label>
                  <select
                    value={focusProgrammeId ?? ""}
                    onChange={(event) => setFocusProgrammeId(event.target.value)}
                    className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    {programmes.map((programme) => (
                      <option key={programme._id} value={programme._id}>
                        {programme.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <select
                key={focusProgrammeId ?? "no-programme"}
                name="cohortId"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Select cohort
                </option>
                {cohortsForFocus.map((cohort) => (
                  <option key={cohort._id} value={cohort._id}>
                    {cohort.label}
                  </option>
                ))}
              </select>
              <input
                name="title"
                placeholder="Class title"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              <input
                name="code"
                placeholder="Class code (e.g. JS201)"
                className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500"
              />
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-wide text-slate-400">
                  Assign instructors
                </label>
                <select
                  multiple
                  value={selectedInstructorIds}
                  onChange={(event) =>
                    setSelectedInstructorIds(
                      Array.from(event.currentTarget.selectedOptions).map((option) => option.value),
                    )
                  }
                  className="h-32 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.name} • {teacher.email}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">
                  Hold Ctrl/⌘ to select multiple instructors.
                </p>
              </div>
              {createClassError && (
                <p className="text-sm text-red-400">{createClassError}</p>
              )}
              <button
                type="submit"
                disabled={createClass.isPending}
                className="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
              >
                {createClass.isPending ? "Creating…" : "Create class"}
              </button>
            </form>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Users</h2>
            <div className="mt-4 space-y-3">
              {users?.length ? (
                users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-start justify-between rounded-lg border border-white/5 bg-slate-950/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">
                      {user.role}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No users yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Programmes & cohorts</h2>
            {programmes?.length ? (
              <ul className="mt-4 space-y-4">
                {programmes.map((programme) => (
                  <li key={programme._id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {programme.name}
                      </p>
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {getCohortsForProgramme(programme).length} cohorts
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {getCohortsForProgramme(programme).map((cohort) => (
                        <li
                          key={cohort._id}
                          className="rounded-lg border border-white/5 bg-slate-950/60 px-4 py-2 text-xs text-slate-300"
                        >
                          <div className="flex items-center justify-between">
                            <span>{cohort.label}</span>
                            <span>
                              {cohort.startAt.slice(0, 10)} → {cohort.endAt.slice(0, 10)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No programmes yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Classes</h2>
            {classes?.length ? (
              <ul className="mt-4 space-y-3">
                {classes.map((classItem) => (
                  <li
                    key={classItem._id}
                    className="rounded-lg border border-white/5 bg-slate-950/60 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{classItem.title}</p>
                        <p className="text-xs text-slate-400">{classItem.code}</p>
                      </div>
                      <span className="text-xs text-slate-300">
                        {classItem.instructorIds
                          .map((id) => userById.get(id)?.name ?? "Unknown")
                          .join(", ") || "No instructors"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No classes yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
