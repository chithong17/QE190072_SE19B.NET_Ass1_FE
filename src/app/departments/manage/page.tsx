"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { extractErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit2,
  ExternalLink,
  FolderKanban,
  Grid2X2,
  KanbanSquare,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Tag {
  tagId: number;
  tagName: string;
  color?: string | null;
}

interface Project {
  projectId: number;
  projectName?: string;
  description?: string | null;
  departmentId: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: number;
}

interface Task {
  taskId: number;
  title?: string;
  description?: string | null;
  status?: number;
  priority?: number;
  dueDate?: string | null;
  projectId: number;
  tags?: Tag[];
}

interface Department {
  departmentId: number;
  departmentName: string;
  departmentDescription: string;
  isActive: boolean;
}

const projectStatusBadges = [
  { label: 'Not Started', badge: 'bg-slate-100 text-slate-700' },
  { label: 'In Progress', badge: 'bg-blue-50 text-blue-700' },
  { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700' },
  { label: 'On Hold', badge: 'bg-amber-50 text-amber-700' },
];

const taskStatusBadges = [
  { label: 'To Do', badge: 'bg-slate-100 text-slate-700' },
  { label: 'In Progress', badge: 'bg-blue-50 text-blue-700' },
  { label: 'Done', badge: 'bg-emerald-50 text-emerald-700' },
  { label: 'Cancelled', badge: 'bg-rose-50 text-rose-700' },
];

const priorityBadges = [
  { label: 'Low', badge: 'bg-sky-50 text-sky-700 border-sky-200' },
  { label: 'Medium', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'High', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Critical', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
];

function formatDate(dateStr?: string | null) {
  if (!dateStr) return 'Ongoing';
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

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [expandedDeptId, setExpandedDeptId] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<Department>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
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
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) => {
      const matchesSearch =
        department.departmentName.toLowerCase().includes(search.toLowerCase()) ||
        department.departmentDescription?.toLowerCase().includes(search.toLowerCase());
      return (
        matchesSearch &&
        (status === 'all' || (status === 'active' ? department.isActive : !department.isActive))
      );
    });
  }, [departments, search, status]);

  function getDepartmentWorkload(id: number) {
    const departmentProjects = projects.filter((project) => project.departmentId === id);
    const projectIds = new Set(departmentProjects.map((project) => project.projectId));
    const departmentTasks = tasks.filter((task) => projectIds.has(task.projectId));
    return {
      projects: departmentProjects,
      tasks: departmentTasks,
      projectCount: departmentProjects.length,
      taskCount: departmentTasks.length,
    };
  }

  const toggleExpand = (id: number) => {
    setExpandedDeptId((prev) => (prev === id ? null : id));
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setCurrentDept({ departmentName: '', departmentDescription: '', isActive: true });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    setIsEditMode(true);
    setCurrentDept(department);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const confirmDelete = (id: number) => {
    setDeptToDelete(id);
    setErrorMsg('');
    setDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentDept.departmentName?.trim()) {
      setErrorMsg('Department name is required.');
      return;
    }
    if (!currentDept.departmentDescription?.trim()) {
      setErrorMsg('Department description is required.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      if (isEditMode) {
        await api.put(`/departments/${currentDept.departmentId}`, currentDept);
        toast.success(`Department "${currentDept.departmentName}" updated successfully!`);
      } else {
        await api.post('/departments', currentDept);
        toast.success(`Department "${currentDept.departmentName}" created successfully!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      const msg = extractErrorMessage(error, 'Failed to save department.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deptToDelete === null) return;
    try {
      setSaving(true);
      await api.delete(`/departments/${deptToDelete}`);
      toast.success('Department deleted successfully!');
      setDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      const msg = extractErrorMessage(error, 'Failed to delete department.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            <Building2 className="h-4 w-4" /> Organization
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Departments</h1>
          <p className="mt-1 text-slate-500">Manage company departments and their project workload.</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="h-11 bg-blue-600 px-5 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add department
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search departments..."
            className="h-11 border-0 bg-slate-50 pl-10 shadow-none focus-visible:ring-blue-500"
          />
        </div>
        <label className="flex min-w-36 flex-col px-2 text-xs font-semibold text-slate-400">
          <span className="mb-1 uppercase tracking-wide">Status</span>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <span className="px-2 text-sm font-medium text-slate-500">
            {filteredDepartments.length} departments
          </span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setView('table')}
              aria-label="Table view"
              title="Table view"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                view === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="h-4 w-4" /> Table
            </button>
            <button
              onClick={() => setView('grid')}
              aria-label="Grid view"
              title="Grid view"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                view === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid2X2 className="h-4 w-4" /> Grid
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-100 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-slate-900">No departments found</p>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filters to find what you are looking for.
          </p>
        </div>
      ) : view === 'table' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-4 text-center"></th>
                  <th className="px-4 py-4">ID</th>
                  <th className="px-5 py-4">Department Name</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4 text-center">Projects</th>
                  <th className="px-5 py-4 text-center">Tasks</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDepartments.map((department) => {
                  const workload = getDepartmentWorkload(department.departmentId);
                  const isExpanded = expandedDeptId === department.departmentId;

                  return (
                    <tr
                      key={department.departmentId}
                      className="group"
                    >
                      <td colSpan={8} className="p-0">
                        {/* Main Department Row */}
                        <div
                          className={`flex items-center transition-colors ${
                            isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="w-10 shrink-0 px-3 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(department.departmentId)}
                              aria-label={isExpanded ? 'Collapse projects and tasks' : 'Expand projects and tasks'}
                              title={isExpanded ? 'Collapse projects and tasks' : 'Expand projects and tasks'}
                              className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <div className="w-16 shrink-0 px-4 py-4 font-mono text-xs font-semibold text-slate-400">
                            #{department.departmentId}
                          </div>

                          <div className="flex-1 min-w-[200px] px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <Link
                                  href={`/departments/${department.departmentId}`}
                                  className="font-semibold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1 group/name"
                                >
                                  {department.departmentName}
                                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                </Link>
                              </div>
                            </div>
                          </div>

                          <div className="hidden md:block flex-1 min-w-[220px] max-w-xs px-5 py-4 text-slate-500">
                            <p className="line-clamp-2 leading-relaxed">
                              {department.departmentDescription || '—'}
                            </p>
                          </div>

                          <div className="w-28 shrink-0 px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(department.departmentId)}
                              title="Click to view projects"
                              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <FolderKanban className="h-3.5 w-3.5" />
                              {workload.projectCount}
                            </button>
                          </div>

                          <div className="w-28 shrink-0 px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpand(department.departmentId)}
                              title="Click to view tasks"
                              className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                            >
                              <ListChecks className="h-3.5 w-3.5" />
                              {workload.taskCount}
                            </button>
                          </div>

                          <div className="w-28 shrink-0 px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                department.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {department.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="w-24 shrink-0 px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(department)}
                                aria-label={`Edit ${department.departmentName}`}
                                className="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete(department.departmentId)}
                                aria-label={`Delete ${department.departmentName}`}
                                className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Inline Accordion Workload Drawer */}
                        {isExpanded && (
                          <div className="border-t border-slate-200/80 bg-slate-50/80 p-5 sm:p-6 animate-in slide-in-from-top-2 duration-200">
                            {/* Drawer Header */}
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4 mb-4">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                <span className="font-bold text-slate-900">
                                  {department.departmentName} &mdash; Projects &amp; Tasks
                                </span>
                                <span className="text-xs text-slate-500">
                                  ({workload.projectCount} {workload.projectCount === 1 ? 'project' : 'projects'}, {workload.taskCount} {workload.taskCount === 1 ? 'task' : 'tasks'})
                                </span>
                              </div>
                              <Link
                                href={`/departments/${department.departmentId}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                View complete department page <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>

                            {/* Projects & Tasks Content */}
                            {workload.projects.length === 0 ? (
                              <div className="py-6 text-center text-sm text-slate-500">
                                <p>No projects assigned to this department yet.</p>
                                <Link
                                  href="/projects/manage"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                >
                                  + Create project in Projects Management
                                </Link>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {workload.projects.map((project) => {
                                  const projectTasks = workload.tasks.filter((t) => t.projectId === project.projectId);
                                  const prStatus =
                                    project.status !== undefined && projectStatusBadges[project.status]
                                      ? projectStatusBadges[project.status]
                                      : { label: 'Ongoing', badge: 'bg-slate-100 text-slate-700' };

                                  return (
                                    <div
                                      key={project.projectId}
                                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                    >
                                      {/* Project Header Bar */}
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2.5">
                                          <FolderKanban className="h-4 w-4 text-blue-600 shrink-0" />
                                          <Link
                                            href={`/projects/${project.projectId}`}
                                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                                          >
                                            {project.projectName}
                                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                                          </Link>
                                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${prStatus.badge}`}>
                                            {prStatus.label}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                          <span className="inline-flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            {formatDate(project.startDate)} &rarr; {formatDate(project.endDate)}
                                          </span>
                                          <Link
                                            href={`/projects/${project.projectId}`}
                                            className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 font-semibold text-blue-600 hover:bg-blue-50"
                                          >
                                            <KanbanSquare className="h-3.5 w-3.5" />
                                            Open Board
                                          </Link>
                                        </div>
                                      </div>

                                      {/* Project Tasks */}
                                      <div className="pt-3">
                                        {projectTasks.length === 0 ? (
                                          <p className="py-2 text-xs text-slate-400 italic">
                                            No tasks created under this project.
                                          </p>
                                        ) : (
                                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                            {projectTasks.map((t) => {
                                              const tStatus =
                                                t.status !== undefined && taskStatusBadges[t.status]
                                                  ? taskStatusBadges[t.status]
                                                  : { label: 'To Do', badge: 'bg-slate-100 text-slate-700' };

                                              const tPriority =
                                                t.priority !== undefined && priorityBadges[t.priority]
                                                  ? priorityBadges[t.priority]
                                                  : { label: 'Low', badge: 'bg-slate-100 text-slate-700 border-slate-200' };

                                              return (
                                                <div
                                                  key={t.taskId}
                                                  className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-white hover:border-slate-200 transition-colors"
                                                >
                                                  <div className="flex items-start justify-between gap-1.5">
                                                    <Link
                                                      href={`/tasks/${t.taskId}`}
                                                      className="font-medium text-xs text-slate-900 hover:text-blue-600 line-clamp-1"
                                                    >
                                                      {t.title}
                                                    </Link>
                                                    <span className={`inline-flex rounded-full px-1.5 py-0.2 text-[10px] font-semibold shrink-0 ${tStatus.badge}`}>
                                                      {tStatus.label}
                                                    </span>
                                                  </div>

                                                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                    <span className={`inline-flex rounded border px-1.5 py-0.2 text-[10px] font-semibold ${tPriority.badge}`}>
                                                      {tPriority.label}
                                                    </span>
                                                    {t.dueDate && (
                                                      <span className="text-[10px] text-slate-400">
                                                        Due {formatDate(t.dueDate)}
                                                      </span>
                                                    )}
                                                    {t.tags && t.tags.length > 0 && (
                                                      <div className="flex flex-wrap gap-1">
                                                        {t.tags.map((tag) => {
                                                          const tagColor = tag.color || '#3b82f6';
                                                          return (
                                                            <span
                                                              key={tag.tagId}
                                                              className="inline-flex items-center rounded border px-1.5 py-0.2 text-[9px] font-medium"
                                                              style={{
                                                                color: tagColor,
                                                                backgroundColor: `${tagColor}14`,
                                                                borderColor: `${tagColor}30`,
                                                              }}
                                                            >
                                                              {tag.tagName}
                                                            </span>
                                                          );
                                                        })}
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
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filteredDepartments.map((department) => {
            const workload = getDepartmentWorkload(department.departmentId);
            return (
              <article
                key={department.departmentId}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70 flex flex-col justify-between"
              >
                <div>
                  <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-blue-50" />
                  <div className="relative flex min-w-0 flex-1 items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/departments/${department.departmentId}`}
                          className="truncate text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {department.departmentName}
                        </Link>
                        <span className="text-xs font-medium text-slate-400">
                          #{department.departmentId}
                        </span>
                      </div>
                      {department.departmentDescription && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                          {department.departmentDescription}
                        </p>
                      )}
                      <span
                        className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          department.isActive
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {department.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6">
                      <Link
                        href={`/departments/${department.departmentId}`}
                        className="group/stat block"
                      >
                        <FolderKanban className="mb-1 h-5 w-5 text-blue-600 group-hover/stat:scale-110 transition-transform" />
                        <p className="text-lg font-bold text-slate-900">{workload.projectCount}</p>
                        <p className="text-xs text-slate-500">Projects</p>
                      </Link>
                      <Link
                        href={`/departments/${department.departmentId}`}
                        className="group/stat block"
                      >
                        <ListChecks className="mb-1 h-5 w-5 text-violet-600 group-hover/stat:scale-110 transition-transform" />
                        <p className="text-lg font-bold text-slate-900">{workload.taskCount}</p>
                        <p className="text-xs text-slate-500">Tasks</p>
                      </Link>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditModal(department)}
                        aria-label={`Edit ${department.departmentName}`}
                        className="rounded-md p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(department.departmentId)}
                        aria-label={`Delete ${department.departmentName}`}
                        className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <Link
                    href={`/departments/${department.departmentId}`}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-600"
                  >
                    View projects &amp; tasks <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditMode ? 'Edit department' : 'Create department'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            {errorMsg && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={currentDept.departmentName || ''}
                onChange={(event) =>
                  setCurrentDept({ ...currentDept, departmentName: event.target.value })
                }
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description *</Label>
              <textarea
                id="desc"
                rows={3}
                value={currentDept.departmentDescription || ''}
                onChange={(event) =>
                  setCurrentDept({ ...currentDept, departmentDescription: event.target.value })
                }
                placeholder="Brief summary of department responsibilities..."
                className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={currentDept.isActive ?? true}
                onChange={(event) =>
                  setCurrentDept({ ...currentDept, isActive: event.target.checked })
                }
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Active department
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete department
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600">
            {errorMsg ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                {errorMsg}
              </p>
            ) : (
              <p>
                Are you sure you want to delete this department? This action cannot be undone if the
                department contains active projects.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
