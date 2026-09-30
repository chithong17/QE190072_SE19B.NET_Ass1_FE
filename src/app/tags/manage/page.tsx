"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/api-error";
import {
  AlertTriangle,
  Edit2,
  Grid2X2,
  LayoutList,
  Loader2,
  Plus,
  Search,
  Tag as TagIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Tag {
  tagId: number;
  tagName: string;
  color?: string | null;
}

interface Task {
  taskId: number;
  tags?: Tag[];
}

const DEFAULT_COLOR = "#6366F1";

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTag, setCurrentTag] = useState<Partial<Tag>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [tagsResponse, tasksResponse] = await Promise.all([
        api.get("/tags"),
        api.get("/tasks"),
      ]);
      setTags(tagsResponse.data);
      setTasks(tasksResponse.data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const usageFor = (tagId: number) =>
    tasks.filter((task) => task.tags?.some((tag) => tag.tagId === tagId)).length;

  const filteredTags = useMemo(
    () =>
      [...tags]
        .filter((tag) => tag.tagName.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.tagName.localeCompare(b.tagName)),
    [search, tags],
  );

  const maxUsage = Math.max(1, ...tags.map((tag) => usageFor(tag.tagId)));

  const openCreateModal = () => {
    setIsEditMode(false);
    setCurrentTag({ tagName: "", color: DEFAULT_COLOR });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setIsEditMode(true);
    setCurrentTag({ ...tag, color: tag.color || DEFAULT_COLOR });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const tagName = currentTag.tagName?.trim();
    if (!tagName) {
      setErrorMsg("Tag name is required.");
      return;
    }

    try {
      const payload = { ...currentTag, tagName, color: currentTag.color || DEFAULT_COLOR };
      if (isEditMode) {
        await api.put(`/tags/${currentTag.tagId}`, payload);
        toast.success(`Tag "${tagName}" updated successfully!`);
      } else {
        await api.post("/tags", payload);
        toast.success(`Tag "${tagName}" created successfully!`);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error saving tag:", error);
      const msg = extractErrorMessage(error, "Could not save the tag.");
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const confirmDelete = (id: number) => {
    setTagToDelete(id);
    setErrorMsg("");
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (tagToDelete === null) return;

    try {
      await api.delete(`/tags/${tagToDelete}`);
      toast.success("Tag deleted successfully!");
      setDeleteModalOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error deleting tag:", error);
      const msg = extractErrorMessage(error, "Could not delete this tag. It may still be used by a task.");
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const renderTagChip = (tag: Tag) => {
    const color = tag.color || DEFAULT_COLOR;
    return (
      <span
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold"
        style={{
          color,
          backgroundColor: `${color}16`,
          borderColor: `${color}2E`,
        }}
      >
        <TagIcon className="h-4 w-4" />
        {tag.tagName}
      </span>
    );
  };

  const renderUsage = (tag: Tag) => {
    const usage = usageFor(tag.tagId);
    const color = tag.color || DEFAULT_COLOR;
    return (
      <div className="flex min-w-[220px] items-center gap-4">
        <span className="w-14 shrink-0 text-sm font-medium text-slate-500">
          {usage} {usage === 1 ? "task" : "tasks"}
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(usage / maxUsage) * 100}%`, backgroundColor: color }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <TagIcon className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Tags</h1>
            <p className="mt-1 text-slate-500">Manage tags used to categorize tasks.</p>
          </div>
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Add Tag
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search tags..."
            className="h-12 border-slate-200 bg-white pl-11 text-slate-900 shadow-sm focus-visible:ring-blue-500"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="hidden rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 sm:block">
            Sort by: Name
          </span>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <Button
              aria-label="List view"
              variant="ghost"
              size="icon"
              onClick={() => setView("list")}
              className={view === "list" ? "bg-blue-50 text-blue-600 hover:bg-blue-50 hover:text-blue-600" : "text-slate-400"}
            >
              <LayoutList className="h-5 w-5" />
            </Button>
            <Button
              aria-label="Grid view"
              variant="ghost"
              size="icon"
              onClick={() => setView("grid")}
              className={view === "grid" ? "bg-blue-50 text-blue-600 hover:bg-blue-50 hover:text-blue-600" : "text-slate-400"}
            >
              <Grid2X2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid h-64 place-items-center rounded-2xl border border-slate-100 bg-white">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      ) : view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28 font-semibold text-slate-500">#</TableHead>
                <TableHead className="font-semibold text-slate-500">Name</TableHead>
                <TableHead className="font-semibold text-slate-500">Color</TableHead>
                <TableHead className="font-semibold text-slate-500">Usage</TableHead>
                <TableHead className="w-32 text-right font-semibold text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">No tags found.</TableCell>
                </TableRow>
              ) : (
                filteredTags.map((tag, index) => {
                  const color = tag.color || DEFAULT_COLOR;
                  return (
                    <TableRow key={tag.tagId} className="border-slate-100 hover:bg-slate-50/70">
                      <TableCell className="font-semibold text-slate-500">#{index + 1}</TableCell>
                      <TableCell>{renderTagChip(tag)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                          <span className="h-5 w-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                          {color.toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>{renderUsage(tag)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(tag)} className="text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => confirmDelete(tag.tagId)} className="text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTags.map((tag) => {
            const color = tag.color || DEFAULT_COLOR;
            return (
              <div key={tag.tagId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  {renderTagChip(tag)}
                  <div className="flex -mr-2 -mt-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(tag)} className="text-slate-400 hover:text-blue-600"><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(tag.tagId)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                  <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />{color.toUpperCase()}</span>
                  <span className="font-semibold">{usageFor(tag.tagId)} tasks</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(usageFor(tag.tagId) / maxUsage) * 100}%`, backgroundColor: color }} /></div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="border-slate-100 bg-white text-slate-900 sm:max-w-[420px]">
          <DialogHeader><DialogTitle className="text-xl">{isEditMode ? "Edit Tag" : "Create Tag"}</DialogTitle></DialogHeader>
          <div className="grid gap-5 py-3">
            {errorMsg && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>}
            <div className="space-y-2"><Label>Name</Label><Input value={currentTag.tagName || ""} onChange={(event) => setCurrentTag({ ...currentTag, tagName: event.target.value })} placeholder="e.g. Frontend, Urgent..." /></div>
            <div className="space-y-2"><Label>Color</Label><div className="flex items-center gap-3"><Input type="color" aria-label="Tag color" value={currentTag.color || DEFAULT_COLOR} onChange={(event) => setCurrentTag({ ...currentTag, color: event.target.value })} className="h-11 w-14 cursor-pointer p-1" /><span className="font-mono text-sm text-slate-500">{(currentTag.color || DEFAULT_COLOR).toUpperCase()}</span></div></div>
          </div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">Save Changes</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="border-slate-100 bg-white text-slate-900 sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Confirm Deletion</DialogTitle></DialogHeader>
          <div className="py-3"><p className="text-slate-600">Are you sure you want to delete this tag?</p>{errorMsg && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">{errorMsg}</p>}</div>
          <div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete Tag</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
