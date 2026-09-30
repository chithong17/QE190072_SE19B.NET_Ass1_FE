"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { extractErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  Edit2,
  ExternalLink,
  FolderKanban,
  Grid2X2,
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

interface Project {
  projectId: number;
  projectName: string;
  description?: string | null;
  departmentId: number;
  startDate: string;
  endDate: string | null;
  status: number;
  isActive?: boolean;
}

interface Department {
  departmentId: number;
  departmentName: string;
}

interface Task {
  taskId: number;
  projectId: number;
  status: number;
}

const statusBadges = [
  { label: 'Not Started', className: 'bg-slate-100 text-slate-700' },
  { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  { label: 'Completed', className: 'bg-emerald-100 text-emerald-700' },
  { label: 'On Hold', className: 'bg-amber-100 text-amber-700' },
];

const cardThemes = [
  { accent: 'bg-blue-600', soft: 'from-blue-50 via-white to-blue-50/40', bar: 'bg-blue-600' },
  { accent: 'bg-violet-600', soft: 'from-violet-50 via-white to-violet-50/40', bar: 'bg-violet-600' },
  { accent: 'bg-orange-500', soft: 'from-orange-50 via-white to-orange-50/40', bar: 'bg-orange-500' },
  { accent: 'bg-emerald-600', soft: 'from-emerald-50 via-white to-emerald-50/40', bar: 'bg-emerald-600' },
  { accent: 'bg-pink-600', soft: 'from-pink-50 via-white to-pink-50/40', bar: 'bg-pink-600' },
  { accent: 'bg-cyan-600', soft: 'from-cyan-50 via-white to-cyan-50/40', bar: 'bg-cyan-600' },
];

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Ongoing';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [projectsResponse, departmentsResponse, tasksResponse] = await Promise.all([
        api.get('/projects'),
        api.get('/departments'),
        api.get('/tasks'),
      ]);
      setProjects(projectsResponse.data);
      setDepartments(departmentsResponse.data);
      setTasks(tasksResponse.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.projectName.toLowerCase().includes(search.toLowerCase()) ||
        project.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || project.status.toString() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const getProgress = (projectId: number) => {
    const projectTasks = tasks.filter((task) => task.projectId === projectId);
    const completed = projectTasks.filter((task) => task.status === 2).length;
    return {
      total: projectTasks.length,
      completed,
      percent: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0,
    };
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setCurrentProject({
      projectName: '',
      description: '',
      departmentId: departments[0]?.departmentId || 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      status: 0,
      isActive: true,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setIsEditMode(true);
    setCurrentProject({
      ...project,
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentProject.projectName?.trim()) {
      setErrorMsg('Project name is required.');
      return;
    }
    if (!currentProject.startDate) {
      setErrorMsg('Start date is required.');
      return;
    }
    if (!currentProject.departmentId) {
      setErrorMsg('Please select a department.');
      return;
    }
    if (currentProject.endDate && currentProject.endDate < currentProject.startDate) {
      setErrorMsg('End date cannot be earlier than start date.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      const payload = {
        ...currentProject,
        projectName: currentProject.projectName.trim(),
        description: currentProject.description || null,
        departmentId: Number(currentProject.departmentId),
        status: Number(currentProject.status ?? 0),
        endDate: currentProject.endDate || null,
        isActive: currentProject.isActive ?? true,
      };

      if (isEditMode) {
        await api.put(`/projects/${currentProject.projectId}`, payload);
        toast.success(`Project "${payload.projectName}" updated successfully!`);
      } else {
        await api.post('/projects', payload);
        toast.success(`Project "${payload.projectName}" created successfully!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      const msg = extractErrorMessage(error, 'Failed to save project.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (projectToDelete === null) return;
    try {
      setSaving(true);
      await api.delete(`/projects/${projectToDelete}`);
      toast.success('Project deleted successfully!');
      setDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      const msg = extractErrorMessage(error, 'Failed to delete project.');
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
            <FolderKanban className="h-4 w-4" /> Workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Projects</h1>
          <p className="mt-1 text-slate-500">
            Plan work, follow progress, and keep every project on track.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="h-11 bg-blue-600 px-5 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add project
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects or descriptions..."
            className="h-11 border-0 bg-slate-50 pl-10 shadow-none focus-visible:ring-blue-500"
          />
        </div>
        <label className="flex min-w-40 flex-col px-2 text-xs font-semibold text-slate-400">
          <span className="mb-1 uppercase tracking-wide">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="0">Not Started</option>
            <option value="1">In Progress</option>
            <option value="2">Completed</option>
            <option value="3">On Hold</option>
          </select>
        </label>
        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <span className="px-2 text-sm font-medium text-slate-500">
            {filteredProjects.length} projects
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
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <FolderKanban className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No projects found</p>
          <p className="mt-1 text-sm text-slate-500">Try another search or create a new project.</p>
        </div>
      ) : view === 'table' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Project Name</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Dates</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Progress</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProjects.map((project) => {
                  const department = departments.find(
                    (item) => item.departmentId === project.departmentId
                  );
                  const progress = getProgress(project.projectId);
                  const statusInfo = statusBadges[project.status] || statusBadges[0];
                  return (
                    <tr
                      key={project.projectId}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-400">
                        #{project.projectId}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/projects/${project.projectId}`}
                          className="group flex flex-col hover:underline"
                        >
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 flex items-center gap-1.5">
                            {project.projectName}
                            <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                          </span>
                          {project.description && (
                            <span className="line-clamp-1 text-xs text-slate-500 mt-0.5 max-w-sm">
                              {project.description}
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {department?.departmentName || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatDate(project.startDate)} → {formatDate(project.endDate)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.className}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 min-w-[150px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                            <span>
                              {progress.completed}/{progress.total}
                            </span>
                            <span className="font-bold text-slate-700">{progress.percent}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/projects/${project.projectId}`}
                            aria-label={`Open ${project.projectName}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                            title="View project tasks board"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(project)}
                            aria-label={`Edit ${project.projectName}`}
                            className="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProjectToDelete(project.projectId);
                              setErrorMsg('');
                              setDeleteModalOpen(true);
                            }}
                            aria-label={`Delete ${project.projectName}`}
                            className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
          {filteredProjects.map((project, index) => {
            const theme = cardThemes[index % cardThemes.length];
            const department = departments.find(
              (item) => item.departmentId === project.departmentId
            );
            const progress = getProgress(project.projectId);
            const initial = project.projectName.trim().charAt(0).toUpperCase() || 'P';
            const statusInfo = statusBadges[project.status] || statusBadges[0];
            return (
              <article
                key={project.projectId}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${theme.soft} p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/70`}
              >
                <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/70" />
                <div className="relative min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${theme.accent} text-lg font-bold text-white shadow-md`}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/projects/${project.projectId}`}
                          className="truncate text-base font-bold text-slate-900 hover:text-blue-600"
                        >
                          {project.projectName}
                        </Link>
                        <span className="text-xs font-medium text-slate-400">
                          #{project.projectId}
                        </span>
                      </div>
                      {project.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                      {department?.departmentName || 'Unassigned'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
                <div className="relative mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>
                      {progress.completed} of {progress.total} tasks complete
                    </span>
                    <span className="text-slate-700">{progress.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className={`h-full rounded-full ${theme.bar} transition-all`}
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDate(project.startDate)} - {formatDate(project.endDate)}
                    </span>
                    <div className="flex gap-1">
                      <Link
                        href={`/projects/${project.projectId}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-blue-600"
                        title="View board"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEditModal(project)}
                        aria-label={`Edit ${project.projectName}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-blue-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setProjectToDelete(project.projectId);
                          setErrorMsg('');
                          setDeleteModalOpen(true);
                        }}
                        aria-label={`Delete ${project.projectName}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Project */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditMode ? 'Edit project' : 'Create project'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            {errorMsg && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </p>
            )}
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={currentProject.projectName || ''}
                onChange={(event) =>
                  setCurrentProject({ ...currentProject, projectName: event.target.value })
                }
                placeholder="e.g. Mobile App v2"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={currentProject.description || ''}
                onChange={(event) =>
                  setCurrentProject({ ...currentProject, description: event.target.value })
                }
                placeholder="Project overview and deliverables..."
                className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Department *</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={currentProject.departmentId || ''}
                  onChange={(event) =>
                    setCurrentProject({
                      ...currentProject,
                      departmentId: Number(event.target.value),
                    })
                  }
                >
                  <option value="" disabled>
                    Select Department
                  </option>
                  {departments.map((department) => (
                    <option key={department.departmentId} value={department.departmentId}>
                      {department.departmentName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={currentProject.status ?? 0}
                  onChange={(event) =>
                    setCurrentProject({
                      ...currentProject,
                      status: Number(event.target.value),
                    })
                  }
                >
                  <option value={0}>Not Started</option>
                  <option value={1}>In Progress</option>
                  <option value={2}>Completed</option>
                  <option value={3}>On Hold</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start date *</Label>
                <Input
                  type="date"
                  value={currentProject.startDate || ''}
                  onChange={(event) =>
                    setCurrentProject({ ...currentProject, startDate: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={currentProject.endDate || ''}
                  onChange={(event) =>
                    setCurrentProject({ ...currentProject, endDate: event.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Delete Confirmation */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete project
            </DialogTitle>
          </DialogHeader>
          <p className="py-3 text-sm text-slate-600">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
          {errorMsg && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{errorMsg}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
