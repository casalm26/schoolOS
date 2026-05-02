import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) void router.replace("/login");
  }, [loading, user, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["courseGrades", user?._id],
    queryFn: () => api.getCourseGradesForStudent(user!._id),
    enabled: Boolean(user?._id),
  });

  if (loading || !user) return <div className="min-h-screen bg-slate-950 text-white p-6">Loading…</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-3xl font-semibold mb-2">My Course Grades</h1>
      <p className="text-slate-300 mb-6">Simple view of your grades per course.</p>
      {isLoading && <p>Loading grades…</p>}
      {error && <p className="text-red-300">{(error as Error).message}</p>}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="text-left p-3">Course ID</th>
              <th className="text-left p-3">Letter Grade</th>
              <th className="text-left p-3">Score</th>
              <th className="text-left p-3">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((grade) => (
              <tr key={grade._id} className="border-t border-white/10">
                <td className="p-3">{grade.classId}</td>
                <td className="p-3">{grade.letterGrade ?? "-"}</td>
                <td className="p-3">{grade.score ?? "-"}</td>
                <td className="p-3">{grade.feedback || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
