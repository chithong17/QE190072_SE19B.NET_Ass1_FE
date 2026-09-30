"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/axios';
import { extractErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Eye,
  FolderKanban,
  Kanban,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface Tag {
  tagId: number;
  tagName: string;
  color?: string | null;
}

interface Task {
  taskId: number;
  title: string;
  description: string | null;
  status: number;
  priority: number;
  dueDate: string | null;
  projectId: number;
  isActive: boolean;
  tags: Tag[];
}

interface Project {
  projectId: number;
  projectName: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: number;
}

const statusInfo = [
  { label: 'To Do', color: 'border-slate-400', badge: 'bg-slate-100 text-slate-700' },
  { label: 'In Progress', color: 'border-blue-500', badge: 'bg-blue-50 text-blue-700' },
  { label: 'Done', color: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  { label: 'Cancelled', color: 'border-rose-500', badge: 'bg-rose-50 text-rose-700' },
];

const priorityNames = ['Low', 'Medium', 'High', 'Critical'];
const priorityInfo = [
  'bg-sky-50 text-sky-700',
  'bg-amber-50 text-amber-700',
  'bg-red-50 text-red-700',
  'bg-fuchsia-50 text-fuchsia-700',
];

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'timeline' | 'list'>('kanban');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [projectResponse, taskResponse, tagResponse] = await Promise.all([
        api.get(`/projects/${params.id}`),
        api.get(`/tasks/project/${params.id}`),
        api.get('/tags'),
      ]);
      setProject(projectResponse.data);
      setTasks(taskResponse.data);
      setTags(tagResponse.data);
    } catch (requestError) {
      console.error(requestError);
      setError('Unable to load this project.');
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }

  const visibleTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(search.toLowerCase()) &&
        (filterStatus === 'all' || task.status === Number(filterStatus))
    );
  }, [tasks, search, filterStatus]);

  const [timelineSort, setTimelineSort] = useState<'priority-newest' | 'dueDate-desc' | 'dueDate-asc'>('priority-newest');

  const timelineTasks = useMemo(() => {
    return [...visibleTasks].sort((a, b) => {
      if (timelineSort === 'priority-newest') {
        // Ưu tiên cao nhất trước (Critical 3 -> High 2 -> Medium 1 -> Low 0)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        // Cùng mức ưu tiên: ngày mới nhất trước
        if (!a.dueDate && !b.dueDate) return b.taskId - a.taskId;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (timelineSort === 'dueDate-desc') {
        // Ngày mới nhất / muộn nhất trước
        if (!a.dueDate && !b.dueDate) return b.taskId - a.taskId;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      // dueDate-asc: ngày đến hạn sớm nhất trước
      if (!a.dueDate && !b.dueDate) return a.taskId - b.taskId;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [visibleTasks, timelineSort]);

  const getDeadlineStatus = (dueDate: string | null, status: number) => {
    if (status === 2) return { text: 'Completed', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (status === 3) return { text: 'Cancelled', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    if (!dueDate) return { text: 'No due date', color: 'text-slate-500 bg-slate-50 border-slate-200' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, color: 'text-rose-700 bg-rose-50 border-rose-200' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (diffDays <= 7) return { text: `Due in ${diffDays}d`, color: 'text-blue-700 bg-blue-50 border-blue-200' };
    return { text: `Due in ${diffDays}d`, color: 'text-slate-600 bg-slate-50 border-slate-200' };
  };

  const openCreate = (status = 0) => {
    setEditingTask({
      title: '',
      description: '',
      projectId: Number(params.id),
      status,
      priority: 1,
      dueDate: new Date().toISOString().split('T')[0],
      isActive: true,
    });
    setSelectedTags([]);
    setError('');
  };

  const openCreateForDate = (dateStr: string) => {
    setEditingTask({
      title: '',
      description: '',
      projectId: Number(params.id),
      status: 0,
      priority: 1,
      dueDate: dateStr,
      isActive: true,
    });
    setSelectedTags([]);
    setError('');
  };

  const openEdit = (task: Task) => {
    setEditingTask({
      ...task,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    });
    setSelectedTags(task.tags ? task.tags.map((tag) => tag.tagId) : []);
    setError('');
  };

  async function saveTask() {
    if (!editingTask?.title?.trim()) {
      setError('Task title is required.');
      return;
    }
    const { project: _project, tags: _tags, ...taskFields } = editingTask as Partial<Task> & { project?: unknown };
    const task = {
      ...taskFields,
      title: editingTask.title.trim(),
      projectId: Number(params.id),
      status: Number(editingTask.status ?? 0),
      priority: Number(editingTask.priority ?? 1),
      dueDate: editingTask.dueDate || null,
      isActive: editingTask.isActive ?? true,
    };
    try {
      setSaving(true);
      if (editingTask.taskId) {
        await api.put(`/tasks/${editingTask.taskId}`, { task, tagIds: selectedTags });
        toast.success(`Task "${task.title}" updated successfully!`);
      } else {
        await api.post('/tasks', { task, tagIds: selectedTags });
        toast.success(`Task "${task.title}" created successfully!`);
      }
      setEditingTask(null);
      loadData();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to save task.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask() {
    if (taskToDelete === null) return;
    try {
      setSaving(true);
      await api.delete(`/tasks/${taskToDelete}`);
      toast.success('Task deleted successfully!');
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      loadData();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to delete task.');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const completedTasks = tasks.filter((task) => task.status === 2).length;
  const progress = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  if (loading)
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  if (!project)
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{error || 'Project not found.'}</p>
        <Link href="/projects/manage" className="mt-4 inline-block text-sm font-semibold text-blue-600">
          ← Back to projects
        </Link>
      </div>
    );

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link
          href="/projects/manage"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600"
        >
          <ChevronLeft className="h-4 w-4" /> Back to projects
        </Link>
        <Button
          onClick={() => openCreate(0)}
          className="bg-blue-600 text-white shadow-md hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" /> New task
        </Button>
      </div>

      {/* Project Overview Card */}
      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:grid-cols-[1fr_340px]">
        <div className="flex gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
            {project.projectName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {project.projectName}
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {statusInfo[project.status]?.label || 'Active'}
              </span>
            </div>
            {project.description && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {project.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {new Date(project.startDate).toLocaleDateString()}
                {project.endDate ? ` → ${new Date(project.endDate).toLocaleDateString()}` : ' (Ongoing)'}
              </span>
              <span className="font-medium text-slate-700">{tasks.length} total tasks</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center rounded-xl bg-slate-50 p-5">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-900">Project progress</span>
            <span className="font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {completedTasks} of {tasks.length} tasks completed
          </p>
        </div>
      </section>

      {/* Filter, Search Bar, and View Mode Switcher */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks in this project..."
            className="h-10 w-full rounded-lg border-0 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="0">To Do</option>
            <option value="1">In Progress</option>
            <option value="2">Done</option>
            <option value="3">Cancelled</option>
          </select>

          {/* View Mode Switcher: Kanban | Timeline | List */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: Task Kanban Board (4 Columns) */}
      {viewMode === 'kanban' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statusInfo.map((group, status) => {
            const groupTasks = visibleTasks.filter((task) => task.status === status);
            const palette =
              status === 0
                ? 'from-slate-50 to-slate-100/60 border-slate-200'
                : status === 1
                ? 'from-blue-50 to-indigo-50/50 border-blue-200'
                : status === 2
                ? 'from-emerald-50 to-teal-50/50 border-emerald-200'
                : 'from-rose-50 to-pink-50/50 border-rose-200';

            return (
              <section
                key={group.label}
                className={`flex flex-col rounded-2xl border bg-gradient-to-b ${palette} p-3 min-h-[480px] shadow-sm`}
              >
                <div className="mb-3 flex items-center justify-between px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full border-2 ${group.color}`} />
                    <h2 className="font-bold text-slate-900 text-sm tracking-tight">{group.label}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 shadow-xs">
                      {groupTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreate(status)}
                    aria-label={`Add ${group.label} task`}
                    className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-2.5">
                  {groupTasks.map((task) => (
                    <article
                      key={task.taskId}
                      className="group relative rounded-xl border border-white bg-white p-3.5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/tasks/${task.taskId}`}
                          className="text-left font-semibold text-sm leading-snug text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {task.title}
                        </Link>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/tasks/${task.taskId}`}
                            aria-label={`View ${task.title}`}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => openEdit(task)}
                            aria-label={`Edit ${task.title}`}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                            title="Edit task"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setTaskToDelete(task.taskId);
                              setDeleteModalOpen(true);
                            }}
                            aria-label={`Delete ${task.title}`}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {task.tags?.map((tag) => {
                          const color = tag.color || '#6366F1';
                          return (
                            <span
                              key={tag.tagId}
                              className="rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                              style={{
                                color,
                                backgroundColor: `${color}16`,
                                borderColor: `${color}30`,
                              }}
                            >
                              {tag.tagName}
                            </span>
                          );
                        })}
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            priorityInfo[task.priority] || priorityInfo[0]
                          }`}
                        >
                          {priorityNames[task.priority] || 'Low'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </span>
                        <span className="font-mono text-[10px]">#{task.taskId}</span>
                      </div>
                    </article>
                  ))}
                  {groupTasks.length === 0 && (
                    <div className="grid h-36 place-items-center rounded-xl border border-dashed border-slate-200/80 bg-white/40 text-xs text-slate-400">
                      No tasks
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Clean Timeline View (Sorted from Highest to Newest) */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {/* Timeline Header & Sort Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <CalendarRange className="h-4 w-4 text-blue-600" />
                Project Timeline ({timelineTasks.length} tasks)
              </span>
              <span className="h-3 w-px bg-slate-200 hidden sm:block" />
              <span>
                {new Date(project.startDate).toLocaleDateString()} → {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
              </span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span>Sort:</span>
                <select
                  value={timelineSort}
                  onChange={(e) => setTimelineSort(e.target.value as any)}
                  className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="priority-newest">Priority</option>
                  <option value="dueDate-desc">Newest</option>
                  <option value="dueDate-asc">Due soon</option>
                </select>
              </div>

              <Button
                onClick={() => openCreate(0)}
                size="sm"
                className="h-9 gap-1.5 bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add Task
              </Button>
            </div>
          </div>

          {timelineTasks.length === 0 ? (
            <div className="grid h-48 place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-center text-sm text-slate-500">
              <div>
                <CalendarRange className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 font-medium">No tasks found matching current filters.</p>
                <Button variant="outline" size="sm" onClick={() => openCreate(0)} className="mt-3 text-xs">
                  Create First Task
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 sm:before:left-4">
              {timelineTasks.map((task) => {
                const deadline = getDeadlineStatus(task.dueDate, task.status);
                const isOverdue = deadline.text.startsWith('Overdue');
                const isDone = task.status === 2;
                const isCancelled = task.status === 3;

                return (
                  <div key={task.taskId} className="relative group">
                    {/* Timeline Node */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-4 flex h-6 w-6 sm:h-8 sm:w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-white shadow-xs ${
                        isDone
                          ? 'border-emerald-500 text-emerald-600'
                          : isCancelled
                          ? 'border-rose-400 text-rose-500'
                          : isOverdue
                          ? 'border-red-500 text-red-600 animate-pulse'
                          : task.priority === 3
                          ? 'border-fuchsia-500 text-fuchsia-600'
                          : task.priority === 2
                          ? 'border-red-500 text-red-600'
                          : 'border-blue-500 text-blue-600'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : isCancelled ? (
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : isOverdue ? (
                        <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      ) : (
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      )}
                    </div>

                    {/* Timeline Card */}
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-blue-300 hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-400">#{task.taskId}</span>
                          <Link
                            href={`/tasks/${task.taskId}`}
                            className="text-left font-bold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {task.title}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${deadline.color}`}>
                            {deadline.text}
                          </span>
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/tasks/${task.taskId}`}
                              aria-label={`View ${task.title}`}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => openEdit(task)}
                              aria-label={`Edit ${task.title}`}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                              title="Edit task"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setTaskToDelete(task.taskId);
                                setDeleteModalOpen(true);
                              }}
                              aria-label={`Delete ${task.title}`}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 font-semibold ${statusInfo[task.status]?.badge || statusInfo[0].badge}`}>
                            {statusInfo[task.status]?.label || 'To Do'}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 font-semibold ${priorityInfo[task.priority] || priorityInfo[0]}`}>
                            {priorityNames[task.priority] || 'Low'}
                          </span>
                          {task.tags?.map((tag) => {
                            const color = tag.color || '#6366F1';
                            return (
                              <span
                                key={tag.tagId}
                                className="rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                                style={{
                                  color,
                                  backgroundColor: `${color}16`,
                                  borderColor: `${color}30`,
                                }}
                              >
                                {tag.tagName}
                              </span>
                            );
                          })}
                        </div>
                        <span className="flex items-center gap-1 font-medium text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                        </span>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: List / Table View */}
      {viewMode === 'list' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">#ID</th>
                  <th className="px-4 py-3.5">Title & Description</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Priority</th>
                  <th className="px-4 py-3.5">Tags</th>
                  <th className="px-4 py-3.5">Due Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleTasks.map((task) => {
                  const deadline = getDeadlineStatus(task.dueDate, task.status);
                  const isOverdue = deadline.text.startsWith('Overdue');

                  return (
                    <tr key={task.taskId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-400">
                        <Link href={`/tasks/${task.taskId}`} className="hover:text-blue-600 transition-colors">
                          #{task.taskId}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/tasks/${task.taskId}`}
                          className="text-left font-semibold text-slate-900 hover:text-blue-600 transition-colors block"
                        >
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="mt-0.5 max-w-md truncate text-xs text-slate-500">
                            {task.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo[task.status]?.badge || statusInfo[0].badge}`}>
                          {statusInfo[task.status]?.label || 'To Do'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityInfo[task.priority] || priorityInfo[0]}`}>
                          {priorityNames[task.priority] || 'Low'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-[200px] flex-wrap gap-1">
                          {task.tags && task.tags.length > 0 ? (
                            task.tags.map((tag) => {
                              const color = tag.color || '#6366F1';
                              return (
                                <span
                                  key={tag.tagId}
                                  className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    color,
                                    backgroundColor: `${color}16`,
                                    borderColor: `${color}30`,
                                  }}
                                >
                                  {tag.tagName}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/tasks/${task.taskId}`}
                            aria-label={`View ${task.title}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => openEdit(task)}
                            aria-label={`Edit ${task.title}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                            title="Edit task"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setTaskToDelete(task.taskId);
                              setDeleteModalOpen(true);
                            }}
                            aria-label={`Delete ${task.title}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {visibleTasks.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              No tasks match the current filters.
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
            <span>Showing {visibleTasks.length} of {tasks.length} tasks</span>
            <Button
              onClick={() => openCreate(0)}
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
          </div>
        </div>
      )}

      {/* Task Edit/Create Modal with Cancelled Status & Critical Priority */}
      {editingTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTask.taskId ? 'Edit task' : 'New task'}
              </h2>
              <button
                onClick={() => setEditingTask(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error}
              </p>
            )}

            <div className="mt-4 grid gap-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <input
                  value={editingTask.title || ''}
                  onChange={(event) =>
                    setEditingTask({ ...editingTask, title: event.target.value })
                  }
                  placeholder="Task title..."
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(event) =>
                    setEditingTask({ ...editingTask, description: event.target.value })
                  }
                  placeholder="Task details and expectations..."
                  className="min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    value={editingTask.status ?? 0}
                    onChange={(event) =>
                      setEditingTask({ ...editingTask, status: Number(event.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value={0}>To Do</option>
                    <option value={1}>In Progress</option>
                    <option value={2}>Done</option>
                    <option value={3}>Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <select
                    value={editingTask.priority ?? 1}
                    onChange={(event) =>
                      setEditingTask({ ...editingTask, priority: Number(event.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value={0}>Low</option>
                    <option value={1}>Medium</option>
                    <option value={2}>High</option>
                    <option value={3}>Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(event) =>
                      setEditingTask({ ...editingTask, dueDate: event.target.value })
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.tagId);
                    const color = tag.color || '#6366F1';
                    return (
                      <button
                        type="button"
                        key={tag.tagId}
                        onClick={() =>
                          setSelectedTags((current) =>
                            isSelected
                              ? current.filter((id) => id !== tag.tagId)
                              : [...current, tag.tagId]
                          )
                        }
                        className="rounded-full border px-3 py-1 text-xs font-semibold transition-all"
                        style={
                          isSelected
                            ? { color: 'white', backgroundColor: color, borderColor: color }
                            : { color, backgroundColor: `${color}12`, borderColor: `${color}2E` }
                        }
                      >
                        {tag.tagName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button
                onClick={saveTask}
                disabled={saving}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-bold">Delete Task</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteTask} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
