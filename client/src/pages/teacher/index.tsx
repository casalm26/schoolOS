import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function TeacherWorkspace() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [letterGrade, setLetterGrade] = useState("");
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!loading && (!user || (user.role !== "teacher" && user.role !== "admin"))) void router.replace("/login");
  }, [loading, user, router]);

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: () => api.getClasses(), enabled: !!user });
  useEffect(() => { if (!classId && classes?.length) setClassId(classes[0]._id); }, [classId, classes]);

  const { data: enrollments } = useQuery({ queryKey: ["enrollments", classId], queryFn: () => api.getClassEnrollments(classId), enabled: !!classId });
  useEffect(() => { if (!studentId && enrollments?.length) setStudentId(enrollments[0].studentId); }, [studentId, enrollments]);

  const { data: grades } = useQuery({ queryKey: ["course-grades", classId], queryFn: () => api.getCourseGradesForClass(classId), enabled: !!classId });

  const mutation = useMutation({
    mutationFn: () => api.upsertCourseGrade(classId, { studentId, letterGrade: letterGrade || undefined, score: score ? Number(score) : undefined, feedback }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["course-grades", classId] }); setLetterGrade(""); setScore(""); setFeedback(""); },
  });

  const roster = useMemo(() => enrollments ?? [], [enrollments]);

  if (loading || !user) return <div className="min-h-screen bg-slate-950 text-white p-6">Loading…</div>;

  const onSubmit = (e: FormEvent) => { e.preventDefault(); mutation.mutate(); };

  return <main className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
    <h1 className="text-3xl font-semibold">Course Grades</h1>
    <p className="text-slate-300">Assign a grade to a student for a course.</p>

    <form onSubmit={onSubmit} className="grid md:grid-cols-5 gap-3">
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className="bg-slate-900 p-2 rounded">
        {(classes ?? []).map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
      </select>
      <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="bg-slate-900 p-2 rounded">
        {roster.map(r => <option key={r._id} value={r.studentId}>{r.student?.name ?? r.studentId}</option>)}
      </select>
      <input value={letterGrade} onChange={(e)=>setLetterGrade(e.target.value)} placeholder="Letter grade" className="bg-slate-900 p-2 rounded" />
      <input value={score} onChange={(e)=>setScore(e.target.value)} placeholder="Score" className="bg-slate-900 p-2 rounded" />
      <button className="bg-emerald-500 text-black rounded px-3 py-2">Save</button>
      <input value={feedback} onChange={(e)=>setFeedback(e.target.value)} placeholder="Feedback" className="md:col-span-5 bg-slate-900 p-2 rounded" />
    </form>

    {mutation.error && <p className="text-red-300">{(mutation.error as Error).message}</p>}

    <div className="rounded-xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900"><tr><th className="p-3 text-left">Student</th><th className="p-3 text-left">Letter</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Feedback</th></tr></thead>
        <tbody>
          {(grades ?? []).map((g) => <tr key={g._id} className="border-t border-white/10"><td className="p-3">{g.student?.name ?? g.studentId}</td><td className="p-3">{g.letterGrade ?? "-"}</td><td className="p-3">{g.score ?? "-"}</td><td className="p-3">{g.feedback || "-"}</td></tr>)}
        </tbody>
      </table>
    </div>
  </main>;
}
