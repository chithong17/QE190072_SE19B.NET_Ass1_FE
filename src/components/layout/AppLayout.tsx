"use client";

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f3f4f6] text-gray-900 font-sans p-2 sm:p-4 overflow-hidden">
      <div className="flex flex-col md:flex-row w-full bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative">
        {/* Mobile Header */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-base">
              <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                T
              </span>
              TaskTrack
            </Link>
          </div>
        </header>

        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:flex h-full">
          <Sidebar />
        </div>

        {/* Mobile Drawer (visible when open) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Slide-out Sidebar */}
            <div className="relative z-10 w-[270px] bg-white h-full shadow-2xl flex flex-col">
              <Sidebar onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-[#fafafa] md:rounded-tr-3xl md:rounded-br-3xl">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
