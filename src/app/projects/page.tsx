"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, FolderKanban, Loader2, Search } from "lucide-react";
import api from "@/lib/axios";
import { Input } from "@/components/ui/input";

interface Project {
  projectId: number;
  projectName: string;
  description?: string | null;
  departmentName?: string | null;
  department?: { departmentName?: string | null } | null;
  status: number;
}

const statusInfo = [
  { label: "Not Started", className: "bg-slate-100 text-slate-600" },
  { label: "In Progress", className: "bg-blue-50 text-blue-700" },
  { label: "Completed", className: "bg-emerald-50 text-emerald-700" },
  { label: "On Hold", className: "bg-amber-50 text-amber-700" },
];

const initialThemes = ["bg-blue-600", "bg-violet-600", "bg-orange-500", "bg-fuchsia-600", "bg-cyan-600", "bg-emerald-600"];
const initialTheme = (name: string) => initialThemes[(name.charCodeAt(0) || 0) % initialThemes.length];

export default function PublicProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      api.get("/projects").then((response) => setProjects(response.data)).catch(console.error).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleProjects = useMemo(() => projects.filter((project) => project.projectName.toLowerCase().includes(search.toLowerCase())), [projects, search]);

  return <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><FolderKanban className="h-7 w-7" /></div><div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Projects</h1><p className="mt-1 text-slate-500">Browse active projects and their tasks.</p></div></div><Link href="/projects/manage" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-600">Manage projects</Link></div>
    <div className="relative max-w-2xl"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects..." className="h-12 border-slate-200 pl-11 focus-visible:ring-blue-500" /></div>
    {loading ? <div className="grid h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleProjects.map((project) => { const status = statusInfo[project.status] || statusInfo[0]; const departmentName = project.departmentName || project.department?.departmentName || "No department"; return <Link key={project.projectId} href={`/projects/${project.projectId}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className={`grid h-11 w-11 place-items-center rounded-xl text-lg font-bold text-white ${initialTheme(project.projectName)}`}>{project.projectName.charAt(0).toUpperCase()}</div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></div><h2 className="mt-5 font-bold text-slate-900">{project.projectName}</h2><p className="mt-2 min-h-10 text-sm text-slate-500">{project.description || "No project description."}</p><div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500"><Building2 className="h-4 w-4" />{departmentName}</div></Link>; })}</div>}
    {!loading && visibleProjects.length === 0 && <p className="py-12 text-center text-slate-500">No projects found.</p>}
  </div>;
}
