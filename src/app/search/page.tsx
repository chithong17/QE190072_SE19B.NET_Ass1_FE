"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, FolderKanban, Loader2, Search as SearchIcon } from "lucide-react";
import api from "@/lib/axios";
import { Input } from "@/components/ui/input";

interface Project {
  projectId: number;
  projectName: string;
}
interface Tag {
  tagId: number;
  tagName: string;
  color?: string | null;
}
interface Task {
  taskId: number;
  title: string;
  status: number;
  priority: number;
  dueDate?: string | null;
  projectId: number;
  tags?: Tag[];
}

const statusNames = ["To Do", "In Progress", "Done", "Cancelled"];
const statusStyles = [
  "bg-slate-100 text-slate-700",
  "bg-blue-50 text-blue-700",
  "bg-emerald-50 text-emerald-700",
  "bg-rose-50 text-rose-700",
];

const priorityNames = ["Low", "Medium", "High", "Critical"];
const priorityStyles = [
  "bg-sky-50 text-sky-700",
  "bg-amber-50 text-amber-700",
  "bg-red-50 text-red-700",
  "bg-fuchsia-50 text-fuchsia-700",
];

export default function SearchPage() {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [tagId, setTagId] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([api.get("/projects"), api.get("/tags")])
        .then(([projectResponse, tagResponse]) => {
          setProjects(projectResponse.data);
          setTags(tagResponse.data);
        })
        .catch(console.error);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams();
      if (title.trim()) query.set("title", title.trim());
      if (status !== "all") query.set("status", status);
      if (priority !== "all") query.set("priority", priority);
      if (projectId !== "all") query.set("projectId", projectId);
      if (tagId !== "all") query.set("tagId", tagId);
      setLoading(true);
      api
        .get(`/tasks/search?${query.toString()}`)
        .then((response) => setResults(response.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [priority, projectId, status, tagId, title]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Search Tasks</h1>
        <p className="mt-1 text-slate-500">Filter tasks by title, status, priority, project, or tag.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Search title..."
            className="h-11 pl-9 border-slate-200"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="all">All statuses</option>
          {statusNames.map((name, index) => (
            <option value={index} key={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="all">All priorities</option>
          {priorityNames.map((name, index) => (
            <option value={index} key={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option value={project.projectId} key={project.projectId}>
              {project.projectName}
            </option>
          ))}
        </select>
        <select
          value={tagId}
          onChange={(event) => setTagId(event.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 sm:col-span-2 lg:col-span-5"
        >
          <option value="all">All tags</option>
          {tags.map((tag) => (
            <option value={tag.tagId} key={tag.tagId}>
              {tag.tagName}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-3">
          {results.map((task) => {
            const project = projects.find((p) => p.projectId === task.projectId);
            return (
              <Link
                key={task.taskId}
                href={`/tasks/${task.taskId}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        #{task.taskId}
                      </span>
                      <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </h2>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                        {project?.projectName || `Project #${task.projectId}`}
                      </span>
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {task.tags.map((tag) => {
                            const color = tag.color || "#6366F1";
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
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusStyles[task.status] || statusStyles[0]
                      }`}
                    >
                      {statusNames[task.status] || "To Do"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        priorityStyles[task.priority] || priorityStyles[0]
                      }`}
                    >
                      {priorityNames[task.priority] || "Low"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          {results.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
              No tasks match these filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
