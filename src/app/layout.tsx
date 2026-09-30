import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from "@/lib/utils";
import { Toaster } from 'sonner';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TaskTrack',
  description: 'Task Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} bg-[#f8f9fa] text-gray-900 antialiased`}>
        <AppLayout>{children}</AppLayout>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
