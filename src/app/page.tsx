"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface Department {
  departmentId: number;
  isActive: boolean;
}
interface Project {
  projectId: number;
  projectName: string;
  endDate: string | null;
}
interface Task {
  taskId: number;
  title: string;
  status: number;
  priority: number;
  dueDate: string | null;
  projectId: number;
}

const statusMeta = [
  { label: 'To do', color: '#3b82f6' },
  { label: 'In progress', color: '#8b5cf6' },
  { label: 'Done', color: '#10b981' },
  { label: 'Cancelled', color: '#f43f5e' },
];

const projectThemes = [
  { tile: 'bg-blue-600', bar: 'bg-blue-600', text: 'group-hover:text-blue-600' },
  { tile: 'bg-violet-600', bar: 'bg-violet-600', text: 'group-hover:text-violet-600' },
  { tile: 'bg-orange-500', bar: 'bg-orange-500', text: 'group-hover:text-orange-600' },
  { tile: 'bg-indigo-500', bar: 'bg-indigo-500', text: 'group-hover:text-indigo-600' },
  { tile: 'bg-fuchsia-600', bar: 'bg-fuchsia-600', text: 'group-hover:text-fuchsia-600' },
  { tile: 'bg-cyan-600', bar: 'bg-cyan-600', text: 'group-hover:text-cyan-600' },
];

const priorityMeta = [
  'bg-sky-50 text-sky-700',
  'bg-amber-50 text-amber-700',
  'bg-red-50 text-red-700',
  'bg-fuchsia-50 text-fuchsia-700',
];

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No due date';
}

export default function Home() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [departmentResponse, projectResponse, taskResponse] = await Promise.all([
          api.get('/departments'),
          api.get('/projects'),
          api.get('/tasks'),
        ]);
        setDepartments(departmentResponse.data);
        setProjects(projectResponse.data);
        setTasks(taskResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const dashboard = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statuses = statusMeta.map((meta, status) => ({
      ...meta,
      count: tasks.filter((task) => task.status === status).length,
    }));

    // Overdue: Only open tasks that are NOT completed (status 2) and NOT cancelled (status 3)
    const overdue = tasks.filter(
      (task) =>
        task.status !== 2 &&
        task.status !== 3 &&
        task.dueDate &&
        new Date(task.dueDate) < today
    ).length;

    // Attention tasks: Due date upcoming/overdue for active tasks (not Done, not Cancelled)
    const dueTasks = tasks
      .filter((task) => task.status !== 2 && task.status !== 3 && task.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);

    const projectProgress = projects
      .map((project) => {
        const projectTasks = tasks.filter((task) => task.projectId === project.projectId);
        const complete = projectTasks.filter((task) => task.status === 2).length;
        const cancelled = projectTasks.filter((task) => task.status === 3).length;
        return {
          ...project,
          total: projectTasks.length,
          complete,
          cancelled,
          percent: projectTasks.length
            ? Math.round((complete / projectTasks.length) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.percent - a.percent || b.total - a.total);

    return { statuses, overdue, dueTasks, projectProgress };
  }, [projects, tasks]);

  const totalTasks = tasks.length || 1;
  const donutStops =
    tasks.length === 0
      ? '#e2e8f0 0% 100%'
      : dashboard.statuses
          .reduce(
            (result, item) => {
              const start = result.total;
              const end = start + (item.count / totalTasks) * 100;
              return {
                total: end,
                stops: [...result.stops, `${item.color} ${start}% ${end}%`],
              };
            },
            { total: 0, stops: [] as string[] }
          )
          .stops.join(', ');

  const metricCards = [
    {
      label: 'Departments',
      value: departments.length,
      icon: Building2,
      color: 'text-blue-600 bg-blue-50',
      note: `${departments.filter((department) => department.isActive).length} active`,
    },
    {
      label: 'Projects',
      value: projects.length,
      icon: FolderKanban,
      color: 'text-violet-600 bg-violet-50',
      note: 'From project data',
    },
    {
      label: 'All tasks',
      value: tasks.length,
      icon: ClipboardList,
      color: 'text-cyan-600 bg-cyan-50',
      note: `${dashboard.statuses[2]?.count || 0} completed, ${dashboard.statuses[3]?.count || 0} cancelled`,
    },
    {
      label: 'Overdue tasks',
      value: dashboard.overdue,
      icon: AlertCircle,
      color: 'text-rose-600 bg-rose-50',
      note: 'Active open tasks',
    },
  ];

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-6 py-7 sm:px-8">
        <p className="text-sm font-semibold text-blue-600">TaskTrack overview</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Your work, at a glance</h1>
        <p className="mt-2 text-slate-600">
          Live summary calculated from departments, projects, and tasks in your database.
        </p>
      </section>

      {loading ? (
        <div className="grid min-h-80 place-items-center rounded-2xl border border-slate-100 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{metric.value}</p>
                    </div>
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${metric.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-400">{metric.note}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-5 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Task status</h2>
                  <p className="text-sm text-slate-500">Distribution across all 4 statuses</p>
                </div>
              </div>
              <div className="mt-6 flex flex-col items-center gap-7 sm:flex-row">
                <div
                  className="relative grid h-40 w-40 shrink-0 place-items-center rounded-full shadow-inner"
                  style={{ background: `conic-gradient(${donutStops})` }}
                >
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-xs">
                    <span className="text-3xl font-bold text-slate-950">{tasks.length}</span>
                    <span className="text-xs font-medium text-slate-500">tasks</span>
                  </div>
                </div>
                <div className="w-full space-y-2.5">
                  {dashboard.statuses.map((item) => {
                    const percent = tasks.length
                      ? Math.round((item.count / tasks.length) * 100)
                      : 0;
                    return (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600 font-medium">
                          <i className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">({percent}%)</span>
                          <strong className="text-slate-900 font-semibold">{item.count}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">Tasks needing attention</h2>
                    <p className="text-sm text-slate-500">Active tasks ordered by due date</p>
                  </div>
                </div>
                <Link
                  href="/tasks/manage"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View tasks
                </Link>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                {dashboard.dueTasks.length ? (
                  dashboard.dueTasks.map((task) => {
                    const project = projects.find((item) => item.projectId === task.projectId);
                    return (
                      <Link
                        href={`/tasks/${task.taskId}`}
                        key={task.taskId}
                        className="flex items-center gap-3 py-3 first:pt-0 hover:bg-slate-50 rounded-lg px-2 transition-colors"
                      >
                        <span className="h-4 w-4 rounded-full border-2 border-slate-300" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>
                          <p className="truncate text-xs text-slate-500">
                            {project?.projectName || `Project #${task.projectId}`}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            priorityMeta[task.priority] || priorityMeta[0]
                          }`}
                        >
                          {dateLabel(task.dueDate)}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <p className="py-9 text-center text-sm text-slate-500">
                    No active tasks currently needing attention.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Project progress</h2>
                  <p className="text-sm text-slate-500">
                    Completed tasks out of total tasks for each project
                  </p>
                </div>
              </div>
              <Link
                href="/projects"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View projects
              </Link>
            </div>
            <div className="mt-6 grid gap-x-8 gap-y-5 lg:grid-cols-2">
              {dashboard.projectProgress.length ? (
                dashboard.projectProgress.map((project) => {
                  const theme =
                    projectThemes[
                      (project.projectId - 1 + projectThemes.length) % projectThemes.length
                    ];
                  return (
                    <Link
                      href={`/projects/${project.projectId}`}
                      key={project.projectId}
                      className="group flex items-center gap-4 rounded-xl p-3 hover:bg-slate-50 border border-slate-100 transition-all"
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${theme.tile} text-sm font-bold text-white shadow-xs`}
                      >
                        {project.projectName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex justify-between gap-3 text-sm">
                          <span className={`truncate font-semibold text-slate-800 ${theme.text}`}>
                            {project.projectName}
                          </span>
                          <span className="shrink-0 font-bold text-slate-700">{project.percent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${theme.bar} transition-all duration-500`}
                            style={{ width: `${project.percent}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {project.complete} of {project.total} tasks complete
                          {project.cancelled > 0 ? ` (${project.cancelled} cancelled)` : ''}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="py-9 text-center text-sm text-slate-500">No projects available.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
