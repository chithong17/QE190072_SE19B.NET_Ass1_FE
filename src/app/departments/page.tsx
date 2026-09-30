"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import {
  ArrowRight,
  Building2,
  FolderKanban,
  ListChecks,
  Loader2,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Department {
  departmentId: number;
  departmentName: string;
  departmentDescription?: string | null;
  isActive: boolean;
}

interface Project {
  projectId: number;
  departmentId: number | null;
}

interface Task {
  taskId: number;
  projectId: number;
}

const initialThemes = [
  'bg-blue-600 shadow-blue-500/20',
  'bg-violet-600 shadow-violet-500/20',
  'bg-orange-500 shadow-orange-500/20',
  'bg-fuchsia-600 shadow-fuchsia-500/20',
  'bg-cyan-600 shadow-cyan-500/20',
  'bg-emerald-600 shadow-emerald-500/20',
];

function initialTheme(name: string) {
  return initialThemes[(name.charCodeAt(0) || 0) % initialThemes.length];
}

export default function PublicDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [deptRes, projRes, taskRes] = await Promise.all([
          api.get('/departments'),
          api.get('/projects'),
          api.get('/tasks'),
        ]);
        setDepartments(deptRes.data);
        setProjects(projRes.data);
        setTasks(taskRes.data);
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const countsMap = useMemo(() => {
    const map = new Map<number, { projects: number; tasks: number }>();
    departments.forEach((d) => {
      const deptProjects = projects.filter((p) => p.departmentId === d.departmentId);
      const projectIds = new Set(deptProjects.map((p) => p.projectId));
      const deptTasks = tasks.filter((t) => projectIds.has(t.projectId));
      map.set(d.departmentId, {
        projects: deptProjects.length,
        tasks: deptTasks.length,
      });
    });
    return map;
  }, [departments, projects, tasks]);

  const visibleDepartments = useMemo(() => {
    return departments.filter(
      (d) =>
        d.departmentName.toLowerCase().includes(search.toLowerCase()) ||
        (d.departmentDescription && d.departmentDescription.toLowerCase().includes(search.toLowerCase()))
    );
  }, [departments, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Departments</h1>
            <p className="mt-1 text-slate-500">
              Explore organizational departments and their active project workload.
            </p>
          </div>
        </div>

        <Link
          href="/departments/manage"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
        >
          Manage departments <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search departments..."
          className="h-12 border-slate-200 pl-11 focus-visible:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="grid h-64 place-items-center">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleDepartments.map((dept) => {
            const counts = countsMap.get(dept.departmentId) || { projects: 0, tasks: 0 };

            return (
              <Link
                key={dept.departmentId}
                href={`/departments/${dept.departmentId}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-slate-200/60"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-xl text-lg font-bold text-white shadow-md ${initialTheme(dept.departmentName)}`}>
                      {dept.departmentName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-400">
                      #{dept.departmentId}
                    </span>
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {dept.departmentName}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">
                    {dept.departmentDescription || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <div className="flex gap-4">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <FolderKanban className="h-4 w-4 text-blue-600" />
                      {counts.projects} {counts.projects === 1 ? 'Project' : 'Projects'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <ListChecks className="h-4 w-4 text-violet-600" />
                      {counts.tasks} {counts.tasks === 1 ? 'Task' : 'Tasks'}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    View <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && visibleDepartments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-500">
          No departments match your search.
        </div>
      )}
    </div>
  );
}
