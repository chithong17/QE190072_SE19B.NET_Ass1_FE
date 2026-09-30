"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FolderKanban,
  KanbanSquare,
  Layers,
  ListChecks,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Tag {
  tagId: number;
  tagName: string;
  color?: string | null;
}

interface Task {
  taskId: number;
  title: string;
  description?: string | null;
  status: number;
  priority: number;
  dueDate?: string | null;
  projectId: number;
  isActive: boolean;
  tags?: Tag[];
}

interface Project {
  projectId: number;
  projectName: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: number;
  departmentId: number;
  isActive: boolean;
  tasks?: Task[];
}

interface Department {
  departmentId: number;
  departmentName: string;
  departmentDescription?: string | null;
  isActive: boolean;
  projects?: Project[];
}

const projectStatuses = [
  { label: 'Not Started', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  { label: 'In Progress', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'On Hold', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const taskStatuses = [
  { label: 'To Do', badge: 'bg-slate-100 text-slate-700' },
  { label: 'In Progress', badge: 'bg-blue-50 text-blue-700' },
  { label: 'Done', badge: 'bg-emerald-50 text-emerald-700' },
  { label: 'Cancelled', badge: 'bg-rose-50 text-rose-700' },
];

const priorityLevels = [
  { label: 'Low', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  { label: 'Medium', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'High', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Critical', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
];

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'No date set';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!params.id) return;
    loadDepartment();
  }, [params.id]);

  async function loadDepartment() {
    setLoading(true);
    try {
      const res = await api.get(`/departments/${params.id}`);
      setDepartment(res.data);
    } catch (err) {
      console.error('Failed to load department details:', err);
      toast.error('Department not found or failed to load');
      router.push('/departments/manage');
    } finally {
      setLoading(false);
    }
  }

  // Summary Metrics
  const metrics = useMemo(() => {
    if (!department) return { totalProjects: 0, totalTasks: 0, completedTasks: 0, inProgressTasks: 0, progress: 0 };
    const projects = department.projects || [];
    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;

    projects.forEach((p) => {
      (p.tasks || []).forEach((t) => {
        totalTasks += 1;
        if (t.status === 2) completedTasks += 1;
        if (t.status === 1) inProgressTasks += 1;
      });
    });

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalProjects: projects.length,
      totalTasks,
      completedTasks,
      inProgressTasks,
      progress,
    };
  }, [department]);

  // Filter projects and nested tasks based on search & filter
  const filteredProjects = useMemo(() => {
    if (!department?.projects) return [];

    return department.projects
      .filter((project) => {
        if (selectedProjectId !== 'all' && project.projectId !== selectedProjectId) {
          return false;
        }
        return true;
      })
      .map((project) => {
        const matchingTasks = (project.tasks || []).filter((task) => {
          if (!search.trim()) return true;
          const query = search.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(query);
          const matchDesc = task.description?.toLowerCase().includes(query) ?? false;
          const matchTags = task.tags?.some((t) => t.tagName.toLowerCase().includes(query)) ?? false;
          return matchTitle || matchDesc || matchTags;
        });

        return {
          ...project,
          matchingTasks,
        };
      })
      .filter((project) => {
        if (!search.trim()) return true;
        const projectMatches =
          project.projectName.toLowerCase().includes(search.toLowerCase()) ||
          project.description?.toLowerCase().includes(search.toLowerCase());
        return projectMatches || project.matchingTasks.length > 0;
      });
  }, [department, selectedProjectId, search]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Loading department details...</p>
      </div>
    );
  }

  if (!department) {
    return null;
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/departments/manage"
            className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Departments
          </Link>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-900">{department.departmentName}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/departments/manage')}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            Manage Departments
          </Button>
          <Link href="/projects/manage">
            <Button size="sm" className="bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700">
              <FolderKanban className="mr-1.5 h-4 w-4" />
              Add Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Department Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-50/70 pointer-events-none" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {department.departmentName}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    department.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {department.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="font-mono text-xs text-slate-400">ID #{department.departmentId}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                {department.departmentDescription || 'No description provided for this department.'}
              </p>
            </div>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Projects</span>
              <FolderKanban className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalProjects}</p>
            <p className="mt-0.5 text-xs text-slate-500">Active projects</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Total Tasks</span>
              <Layers className="h-4 w-4 text-violet-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalTasks}</p>
            <p className="mt-0.5 text-xs text-slate-500">Across all projects</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Completed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">{metrics.completedTasks}</p>
            <p className="mt-0.5 text-xs text-slate-500">{metrics.progress}% completion rate</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>In Progress</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700">{metrics.inProgressTasks}</p>
            <p className="mt-0.5 text-xs text-slate-500">Tasks ongoing</p>
          </div>
        </div>
      </div>

      {/* Projects & Workload Heading + Filter controls */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Department Workload</h2>
            <p className="text-sm text-slate-500">
              Projects assigned to {department.departmentName} and all tasks within them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by project */}
            {department.projects && department.projects.length > 1 && (
              <select
                aria-label="Filter by project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Projects ({department.projects.length})</option>
                {department.projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectName}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search tasks, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Projects Cards List */}
        {filteredProjects.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-400">
              <FolderKanban className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              {search ? 'No projects or tasks match your search' : 'No projects in this department'}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {search
                ? 'Try clearing the search query or project filter.'
                : 'Get started by creating a project and assigning it to this department.'}
            </p>
            {search ? (
              <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-4">
                Clear Search
              </Button>
            ) : (
              <Link href="/projects/manage" className="mt-4">
                <Button size="sm" className="bg-blue-600 text-white">
                  <FolderKanban className="mr-1.5 h-4 w-4" />
                  Create Project
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProjects.map((project) => {
              const allTasks = project.tasks || [];
              const displayTasks = project.matchingTasks;
              const projectStatus = projectStatuses[project.status] || {
                label: 'Unknown',
                badge: 'bg-slate-100 text-slate-700',
              };
              const completedCount = allTasks.filter((t) => t.status === 2).length;
              const progressPct = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;

              return (
                <div
                  key={project.projectId}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
                >
                  {/* Project Header Bar */}
                  <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold text-slate-400">#{project.projectId}</span>
                          <Link
                            href={`/projects/${project.projectId}`}
                            className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
                          >
                            {project.projectName}
                            <ExternalLink className="h-4 w-4 opacity-40 hover:opacity-100" />
                          </Link>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${projectStatus.badge}`}
                          >
                            {projectStatus.label}
                          </span>
                        </div>
                        {project.description && (
                          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(project.startDate)} &rarr; {formatDate(project.endDate)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ListChecks className="h-3.5 w-3.5 text-slate-400" />
                            {allTasks.length} {allTasks.length === 1 ? 'task' : 'tasks'}
                          </span>
                        </div>
                      </div>

                      {/* Right actions & progress */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-full sm:w-44">
                          <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                            <span>Progress</span>
                            <span className="font-bold text-slate-900">{progressPct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        <Link href={`/projects/${project.projectId}`}>
                          <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            <KanbanSquare className="mr-1.5 h-4 w-4" />
                            Open Board
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Tasks Table / List */}
                  <div className="p-0">
                    {displayTasks.length === 0 ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        {allTasks.length === 0
                          ? 'No tasks created inside this project yet.'
                          : 'No tasks match the active search query.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-slate-100 bg-white text-xs font-semibold uppercase tracking-wider text-slate-400">
                            <tr>
                              <th className="px-5 py-3">Task ID</th>
                              <th className="px-5 py-3">Title</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3">Priority</th>
                              <th className="px-5 py-3">Due Date</th>
                              <th className="px-5 py-3">Tags</th>
                              <th className="px-5 py-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {displayTasks.map((task) => {
                              const st = taskStatuses[task.status] || {
                                label: 'Unknown',
                                badge: 'bg-slate-100 text-slate-700',
                              };
                              const pr = priorityLevels[task.priority] || {
                                label: 'Normal',
                                badge: 'bg-slate-100 text-slate-700 border-slate-200',
                              };

                              return (
                                <tr key={task.taskId} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-5 py-3.5 font-mono text-xs text-slate-400">#{task.taskId}</td>
                                  <td className="px-5 py-3.5">
                                    <Link
                                      href={`/tasks/${task.taskId}`}
                                      className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                                    >
                                      {task.title}
                                    </Link>
                                    {task.description && (
                                      <p className="line-clamp-1 text-xs text-slate-500 mt-0.5">
                                        {task.description}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span
                                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.badge}`}
                                    >
                                      {st.label}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span
                                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${pr.badge}`}
                                    >
                                      {pr.label}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                                    {formatDate(task.dueDate)}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {task.tags && task.tags.length > 0 ? (
                                        task.tags.map((tag) => {
                                          const tagColor = tag.color || '#3b82f6';
                                          return (
                                            <span
                                              key={tag.tagId}
                                              className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
                                              style={{
                                                color: tagColor,
                                                backgroundColor: `${tagColor}14`,
                                                borderColor: `${tagColor}30`,
                                              }}
                                            >
                                              {tag.tagName}
                                            </span>
                                          );
                                        })
                                      ) : (
                                        <span className="text-xs text-slate-300">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                    <Link
                                      href={`/tasks/${task.taskId}`}
                                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                                    >
                                      View <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
