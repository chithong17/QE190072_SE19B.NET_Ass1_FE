"use client";

import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  CheckSquare,
  Tags,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/axios';

const mainMenu = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Departments', href: '/departments', icon: Building2 },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Tasks', href: '/tasks/manage', icon: CheckSquare },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Tags', href: '/tags/manage', icon: Tags },
];

const colors = [
  'bg-blue-600',
  'bg-violet-600',
  'bg-orange-500',
  'bg-indigo-500',
  'bg-fuchsia-600',
  'bg-cyan-600',
];

interface SidebarProject {
  projectId: number;
  projectName: string;
}

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<SidebarProject[]>([]);

  useEffect(() => {
    api
      .get('/projects')
      .then((res) => {
        setProjects(res.data.slice(0, 5));
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col w-[260px] bg-white border-r border-gray-100 h-full text-gray-600 font-sans flex-shrink-0">
      <div className="p-5 flex items-center justify-between">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3 w-full hover:bg-gray-50 p-2 rounded-xl border border-transparent hover:border-gray-100 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <span className="text-lg">T</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-base">TaskTrack</h2>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-6">
          <p className="px-3 text-[11px] font-bold text-gray-400 tracking-wider mb-2 uppercase">
            Main Menu
          </p>
          <nav className="space-y-0.5">
            {mainMenu.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
              Recent Projects
            </p>
          </div>
          <nav className="space-y-0.5">
            {projects.map((p, idx) => {
              const isActive = pathname.includes(`/projects/${p.projectId}`);
              const colorClass = colors[idx % colors.length];
              return (
                <Link
                  key={p.projectId}
                  href={`/projects/${p.projectId}`}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-blue-50/50 text-gray-900 font-semibold'
                      : 'hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold ${colorClass} shadow-xs shrink-0`}
                    >
                      {p.projectName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate">{p.projectName}</span>
                  </div>
                </Link>
              );
            })}

            <Link
              href="/projects"
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-colors mt-2 text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>All Projects</span>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
