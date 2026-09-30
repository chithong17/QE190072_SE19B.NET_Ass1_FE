"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit2,
  FolderKanban,
  Loader2,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/api-error";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Tag {
  tagId: number;
  tagName: string;
  color?: string | null;
}

interface ProjectSummary {
  projectId: number;
  projectName: string;
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
  createdDate?: string;
  modifiedDate?: string | null;
  project?: ProjectSummary;
  tags?: Tag[];
}

const statuses = [
  { label: "To Do", className: "bg-slate-100 text-slate-700 border-slate-200" },
  { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-100" },
  { label: "Done", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { label: "Cancelled", className: "bg-rose-50 text-rose-700 border-rose-100" },
];

const priorities = [
  { label: "Low", className: "bg-sky-50 text-sky-700 border-sky-100" },
  { label: "Medium", className: "bg-amber-50 text-amber-700 border-amber-100" },
  { label: "High", className: "bg-red-50 text-red-700 border-red-100" },
  { label: "Critical", className: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100" },
];

const TAG_FALLBACK = "#64748B";

export default function TaskDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTask = async () => {
    try {
      setLoading(true);
      const [taskRes, tagsRes] = await Promise.all([
        api.get(`/tasks/${params.id}`),
        api.get("/tags").catch(() => ({ data: [] })),
      ]);
      setTask(taskRes.data);
      setAvailableTags(tagsRes.data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTask(), 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  const openEditModal = () => {
    if (!task) return;
    setEditForm({
      ...task,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setSelectedTagIds(task.tags?.map((t) => t.tagId) || []);
    setErrorMsg("");
    setIsEditModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!task) return;
    if (!editForm.title?.trim()) {
      setErrorMsg("Task title is required.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg("");
      const payload = {
        task: {
          ...editForm,
          title: editForm.title.trim(),
          status: Number(editForm.status),
          priority: Number(editForm.priority),
          projectId: task.projectId,
          dueDate: editForm.dueDate || null,
        },
        tagIds: selectedTagIds,
      };

      await api.put(`/tasks/${task.taskId}`, payload);
      toast.success("Task updated successfully!");
      setIsEditModalOpen(false);
      await loadTask();
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to update task.");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      setIsDeleting(true);
      await api.delete(`/tasks/${task.taskId}`);
      toast.success("Task deleted successfully!");
      router.push("/tasks/manage");
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to delete task.");
      toast.error(msg);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-80 place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="py-24 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Task Not Found</h2>
        <p className="mt-1 text-sm text-slate-500">The task you are looking for does not exist or has been removed.</p>
        <Link
          href="/tasks/manage"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </Link>
      </div>
    );
  }

  const currentStatus = statuses[task.status] || statuses[0];
  const currentPriority = priorities[task.priority] || priorities[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/tasks/manage"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:border-slate-300 hover:text-slate-900 transition-colors"
            title="Back to Tasks"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/tasks/manage" className="hover:text-blue-600 transition-colors">
              Tasks
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900">Task #{task.taskId}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openEditModal}
            className="gap-1.5 border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
          >
            <Edit2 className="h-4 w-4" />
            Edit Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteModalOpen(true)}
            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Task Header Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">#{task.taskId}</span>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentStatus.className}`}>
                {currentStatus.label}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentPriority.className}`}>
                {currentPriority.label} Priority
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {task.title}
            </h1>
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {task.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Task Attributes Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Project</p>
            <Link
              href={`/projects/${task.projectId}`}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <FolderKanban className="h-4 w-4 shrink-0" />
              <span className="truncate">{task.project?.projectName || "View Project"}</span>
            </Link>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Due Date</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
              {task.dueDate
                ? new Date(task.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "No due date"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
            <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{currentStatus.label}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Created</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              {task.createdDate
                ? new Date(task.createdDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Tags Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <TagIcon className="h-4 w-4 text-slate-500" />
            Tags
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={openEditModal}
            className="h-8 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            Manage Tags
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {task.tags && task.tags.length > 0 ? (
            task.tags.map((tag) => {
              const color = tag.color || TAG_FALLBACK;
              return (
                <span
                  key={tag.tagId}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    color,
                    backgroundColor: `${color}16`,
                    borderColor: `${color}2E`,
                  }}
                >
                  {tag.tagName}
                </span>
              );
            })
          ) : (
            <p className="text-sm text-slate-400">No tags assigned to this task.</p>
          )}
        </div>
      </section>

      {/* Edit Task Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-100 bg-white text-slate-900 sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title || ""}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={editForm.description || ""}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                placeholder="Optional task description"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={editForm.status ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, status: Number(e.target.value) })}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value={0}>To Do</option>
                  <option value={1}>In Progress</option>
                  <option value={2}>Done</option>
                  <option value={3}>Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  value={editForm.priority ?? 1}
                  onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value={0}>Low</option>
                  <option value={1}>Medium</option>
                  <option value={2}>High</option>
                  <option value={3}>Critical</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editForm.dueDate || ""}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.tagId);
                  const color = tag.color || TAG_FALLBACK;
                  return (
                    <button
                      key={tag.tagId}
                      type="button"
                      onClick={() =>
                        setSelectedTagIds((current) =>
                          selected ? current.filter((id) => id !== tag.tagId) : [...current, tag.tagId]
                        )
                      }
                      className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                      style={
                        selected
                          ? { color: "white", backgroundColor: color, borderColor: color }
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
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTask}
              disabled={isSaving}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="border-slate-100 bg-white text-slate-900 sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-slate-600">
              Are you sure you want to delete task <strong>&quot;{task.title}&quot;</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
