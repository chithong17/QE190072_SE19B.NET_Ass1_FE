"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/api-error";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Edit2,
  Eye,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Tag { tagId: number; tagName: string; color?: string | null }
interface Task {
  taskId: number; title: string; description?: string | null; status: number; priority: number;
  dueDate: string | null; projectId: number; isActive: boolean; tags?: Tag[];
}
interface Project { projectId: number; projectName: string }

const TAG_FALLBACK = "#64748B";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskResponse, projectResponse, tagResponse] = await Promise.all([
        api.get("/tasks"), api.get("/projects"), api.get("/tags"),
      ]);
      setTasks(taskResponse.data);
      setProjects(projectResponse.data);
      setTags(tagResponse.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = !search || task.title.toLowerCase().includes(search.toLowerCase()) || (task.description && task.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === "all" || task.status.toString() === filterStatus;
    const matchesProject = filterProject === "all" || task.projectId.toString() === filterProject;
    return matchesSearch && matchesStatus && matchesProject;
  }), [filterProject, filterStatus, search, tasks]);

  const getStatusInfo = (status: number) => {
    if (status === 3) return { label: "Cancelled", className: "bg-rose-50 text-rose-700 border-rose-100" };
    if (status === 2) return { label: "Done", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    if (status === 1) return { label: "In Progress", className: "bg-blue-50 text-blue-700 border-blue-100" };
    return { label: "To Do", className: "bg-slate-100 text-slate-600 border-slate-200" };
  };

  const getPriorityInfo = (priority: number) => {
    if (priority === 3) return { label: "Critical", className: "bg-fuchsia-50 text-fuchsia-700" };
    if (priority === 2) return { label: "High", className: "bg-red-50 text-red-600" };
    if (priority === 1) return { label: "Medium", className: "bg-amber-50 text-amber-700" };
    return { label: "Low", className: "bg-sky-50 text-sky-700" };
  };

  const getGroupName = (task: Task) => {
    if (!task.dueDate) return "No Due Date";
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate); dueDate.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    if (dueDate < today) return "Overdue";
    if (dueDate.getTime() === today.getTime()) return "Today";
    if (dueDate <= endOfWeek) return "This Week";
    return "Later";
  };

  const taskGroups = useMemo(() => {
    const groups: Record<string, Task[]> = { Overdue: [], Today: [], "This Week": [], Later: [], "No Due Date": [] };
    filteredTasks.forEach((task) => groups[getGroupName(task)].push(task));
    return groups;
  }, [filteredTasks]);

  const toggleSelectTask = (taskId: number) => setSelectedTasks((previous) =>
    previous.includes(taskId) ? previous.filter((id) => id !== taskId) : [...previous, taskId],
  );

  const handleSelectAll = (checked: boolean) => setSelectedTasks(checked ? filteredTasks.map((task) => task.taskId) : []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setCurrentTask({ title: "", description: "", projectId: projects[0]?.projectId || 0, status: 0, priority: 1, dueDate: "", isActive: true });
    setSelectedTagIds([]); setErrorMsg(""); setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setIsEditMode(true);
    setCurrentTask({ ...task, dueDate: task.dueDate ? task.dueDate.split("T")[0] : "" });
    setSelectedTagIds(task.tags?.map((tag) => tag.tagId) || []);
    setErrorMsg(""); setIsModalOpen(true);
  };

  const saveTask = async () => {
    if (!currentTask.title?.trim()) { setErrorMsg("Task title is required."); return; }
    if (!currentTask.projectId) { setErrorMsg("Please choose a project."); return; }
    const { project: _project, tags: _tags, ...taskFields } = currentTask as Partial<Task> & { project?: unknown };
    const task = { ...taskFields, title: currentTask.title.trim(), status: Number(currentTask.status), priority: Number(currentTask.priority), projectId: Number(currentTask.projectId), dueDate: currentTask.dueDate || null };
    try {
      if (isEditMode) {
        await api.put(`/tasks/${currentTask.taskId}`, { task, tagIds: selectedTagIds });
        toast.success(`Task "${task.title}" updated successfully!`);
      } else {
        await api.post("/tasks", { task, tagIds: selectedTagIds });
        toast.success(`Task "${task.title}" created successfully!`);
      }
      setIsModalOpen(false); await loadData();
    } catch (error) {
      console.error("Error saving task:", error);
      const msg = extractErrorMessage(error, "Could not save this task.");
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const deleteTask = async () => {
    if (taskToDelete === null) return;
    try {
      await api.delete(`/tasks/${taskToDelete}`);
      toast.success("Task deleted successfully!");
      setDeleteModalOpen(false);
      setSelectedTasks((current) => current.filter((id) => id !== taskToDelete));
      await loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      const msg = extractErrorMessage(error, "Could not delete this task.");
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const bulkMarkComplete = async () => {
    try {
      await Promise.all(selectedTasks.map(async (id) => {
        const current = tasks.find((task) => task.taskId === id);
        if (current) {
          const { project: _project, tags: _tags, ...taskFields } = current as Task & { project?: unknown };
          await api.put(`/tasks/${id}`, { task: { ...taskFields, status: 2 }, tagIds: current.tags?.map((tag) => tag.tagId) || [] });
        }
      }));
      toast.success(`${selectedTasks.length} tasks marked as done!`);
      setSelectedTasks([]); await loadData();
    } catch (error) {
      console.error("Error completing tasks:", error);
      toast.error("Failed to complete some tasks.");
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedTasks.length} selected tasks?`)) return;
    try {
      await Promise.all(selectedTasks.map((id) => api.delete(`/tasks/${id}`)));
      toast.success(`${selectedTasks.length} tasks deleted!`);
      setSelectedTasks([]); await loadData();
    } catch (error) {
      console.error("Error deleting tasks:", error);
      toast.error("Failed to delete some tasks.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><ClipboardList className="h-7 w-7" /></div>
          <div><h1 className="text-3xl font-bold tracking-tight text-slate-950">Tasks</h1><p className="mt-1 text-slate-500">Track and manage tasks across all projects.</p></div>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />New Task</Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks..." className="h-11 border-slate-200 pl-11 text-slate-900 focus-visible:ring-blue-500" /></div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <label className="relative"><span className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-slate-500">Status</span><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 lg:w-40"><option value="all">All statuses</option><option value="0">To Do</option><option value="1">In Progress</option><option value="2">Done</option><option value="3">Cancelled</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" /></label>
          <label className="relative"><span className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-slate-500">Project</span><select value={filterProject} onChange={(event) => setFilterProject(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 lg:w-48"><option value="all">All projects</option>{projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" /></label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={selectedTasks.length > 0 && selectedTasks.length === filteredTasks.length} onChange={(event) => handleSelectAll(event.target.checked)} />{selectedTasks.length} selected</label>
          {selectedTasks.length > 0 && <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={bulkMarkComplete} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"><Check className="mr-1.5 h-4 w-4" />Mark done</Button><Button variant="outline" size="sm" onClick={bulkDelete} className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button></div>}
        </div>

        {loading ? <div className="grid h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-blue-500" /></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left"><thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="w-14 px-5 py-4"><span className="sr-only">Select</span></th><th className="w-20 px-2 py-4">ID</th><th className="px-3 py-4">Task</th><th className="w-48 px-3 py-4">Project</th><th className="w-36 px-3 py-4">Status</th><th className="w-28 px-3 py-4">Priority</th><th className="w-48 px-3 py-4">Tags</th><th className="w-40 px-3 py-4">Due date</th><th className="w-24 px-3 py-4 text-right">Actions</th></tr></thead>
          {Object.entries(taskGroups).map(([groupName, groupTasks]) => groupTasks.length > 0 && <tbody key={groupName}><tr className="border-b border-slate-100 bg-white"><td colSpan={9} className="px-5 pb-2 pt-5"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${groupName === "Overdue" ? "bg-red-500" : groupName === "Today" ? "bg-amber-500" : "bg-blue-500"}`} /><span className="font-semibold text-slate-800">{groupName}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{groupTasks.length}</span></div></td></tr>{groupTasks.map((task) => { const status = getStatusInfo(task.status); const priority = getPriorityInfo(task.priority); const project = projects.find((item) => item.projectId === task.projectId); const isSelected = selectedTasks.includes(task.taskId); return <tr key={task.taskId} className={`border-b border-slate-100 last:border-b-0 ${isSelected ? "bg-blue-50/70" : "hover:bg-slate-50/70"}`}><td className="px-5 py-4"><input type="checkbox" aria-label={`Select ${task.title}`} className="block h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={isSelected} onChange={() => toggleSelectTask(task.taskId)} /></td><td className="px-2 py-4 text-sm font-semibold text-slate-400"><Link href={`/tasks/${task.taskId}`} className="hover:text-blue-600 transition-colors">#{task.taskId}</Link></td><td className="px-3 py-4"><Link href={`/tasks/${task.taskId}`} className="text-left font-semibold text-slate-900 hover:text-blue-600 transition-colors block">{task.title}</Link>{task.description && <p className="mt-1 max-w-sm truncate text-sm text-slate-500">{task.description}</p>}</td><td className="px-3 py-4 text-sm text-slate-600">{project?.projectName || "—"}</td><td className="px-3 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span></td><td className="px-3 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priority.className}`}>{priority.label}</span></td><td className="px-3 py-4"><div className="flex max-w-[180px] flex-wrap gap-1.5">{task.tags?.length ? task.tags.map((tag) => { const color = tag.color || TAG_FALLBACK; return <span key={tag.tagId} className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ color, backgroundColor: `${color}16`, borderColor: `${color}2E` }}>{tag.tagName}</span>; }) : <span className="text-slate-300">—</span>}</div></td><td className="px-3 py-4"><span className={`flex items-center gap-1.5 text-sm font-medium ${groupName === "Overdue" ? "text-red-600" : "text-slate-500"}`}><CalendarDays className="h-4 w-4" />{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span></td><td className="px-3 py-4"><div className="flex justify-end gap-1"><Link href={`/tasks/${task.taskId}`} title="View Details"><Button aria-label={`View ${task.title}`} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4" /></Button></Link><Button aria-label={`Edit ${task.title}`} variant="ghost" size="icon" onClick={() => openEditModal(task)} className="h-8 w-8 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Edit Task"><Edit2 className="h-4 w-4" /></Button><Button aria-label={`Delete ${task.title}`} variant="ghost" size="icon" onClick={() => { setTaskToDelete(task.taskId); setErrorMsg(""); setDeleteModalOpen(true); }} className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Delete Task"><Trash2 className="h-4 w-4" /></Button></div></td></tr>; })}</tbody>)}</table>{filteredTasks.length === 0 && <div className="py-16 text-center text-sm text-slate-500">No tasks match the current filters.</div>}</div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-h-[90vh] overflow-y-auto border-slate-100 bg-white text-slate-900 sm:max-w-[560px]"><DialogHeader><DialogTitle className="text-xl">{isEditMode ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader><div className="grid gap-4 py-3">{errorMsg && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>}<div className="space-y-2"><Label>Title</Label><Input value={currentTask.title || ""} onChange={(event) => setCurrentTask({ ...currentTask, title: event.target.value })} /></div><div className="space-y-2"><Label>Description</Label><textarea value={currentTask.description || ""} onChange={(event) => setCurrentTask({ ...currentTask, description: event.target.value })} className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Project</Label><select value={currentTask.projectId || ""} onChange={(event) => setCurrentTask({ ...currentTask, projectId: Number(event.target.value) })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"><option value="" disabled>Select project</option>{projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName}</option>)}</select></div><div className="space-y-2"><Label>Due date</Label><Input type="date" value={currentTask.dueDate || ""} onChange={(event) => setCurrentTask({ ...currentTask, dueDate: event.target.value })} /></div><div className="space-y-2"><Label>Status</Label><select value={currentTask.status ?? 0} onChange={(event) => setCurrentTask({ ...currentTask, status: Number(event.target.value) })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"><option value={0}>To Do</option><option value={1}>In Progress</option><option value={2}>Done</option><option value={3}>Cancelled</option></select></div><div className="space-y-2"><Label>Priority</Label><select value={currentTask.priority ?? 1} onChange={(event) => setCurrentTask({ ...currentTask, priority: Number(event.target.value) })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"><option value={0}>Low</option><option value={1}>Medium</option><option value={2}>High</option><option value={3}>Critical</option></select></div></div><div className="space-y-2"><Label>Tags</Label><div className="flex flex-wrap gap-2">{tags.map((tag) => { const selected = selectedTagIds.includes(tag.tagId); const color = tag.color || TAG_FALLBACK; return <button key={tag.tagId} type="button" onClick={() => setSelectedTagIds((current) => selected ? current.filter((id) => id !== tag.tagId) : [...current, tag.tagId])} className="rounded-full border px-3 py-1 text-xs font-semibold transition-colors" style={selected ? { color: "white", backgroundColor: color, borderColor: color } : { color, backgroundColor: `${color}12`, borderColor: `${color}2E` }}>{tag.tagName}</button>; })}</div></div></div><div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={saveTask} className="bg-blue-600 text-white hover:bg-blue-700">Save Changes</Button></div></DialogContent></Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}><DialogContent className="border-slate-100 bg-white text-slate-900 sm:max-w-[400px]"><DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Confirm Deletion</DialogTitle></DialogHeader><div className="py-3"><p className="text-slate-600">Are you sure you want to delete this task? This action cannot be undone.</p>{errorMsg && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">{errorMsg}</p>}</div><div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="destructive" onClick={deleteTask}>Delete Task</Button></div></DialogContent></Dialog>
    </div>
  );
}
