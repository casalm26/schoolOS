import Link from "next/link";

const links = [
  {
    title: "Admin Console",
    description:
      "Configure programmes, cohorts, users, and classes before the term begins.",
    href: "/admin",
  },
  {
    title: "Teacher Workspace",
    description:
      "Publish assignments, capture grades, and coordinate releases for your classes.",
    href: "/teacher",
  },
  {
    title: "Student Dashboard",
    description:
      "Track upcoming deadlines and view released feedback in one focused view.",
    href: "/student",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-slate-400">
              SchoolOS
            </p>
            <h1 className="text-3xl font-semibold">Grading Control Center</h1>
          </div>
          <Link
            href="/teacher"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:bg-emerald-400"
          >
            Jump to Teaching
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <section className="max-w-3xl space-y-4">
          <h2 className="text-4xl font-bold">Bring clarity to grades.</h2>
          <p className="text-lg text-slate-300">
            Set up your programmes, create assignments with due dates, and release
            grades to students at the same time. SchoolOS keeps administrators,
            teachers, and students aligned on expectations and outcomes.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-white/10 bg-slate-900/60 p-6 transition hover:border-emerald-400/60 hover:bg-slate-900"
            >
              <h3 className="text-xl font-semibold text-white group-hover:text-emerald-300">
                {link.title}
              </h3>
              <p className="mt-3 text-sm text-slate-300">{link.description}</p>
              <span className="mt-6 inline-flex items-center text-sm font-medium text-emerald-300">
                Enter →
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
