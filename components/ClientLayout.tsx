'use client';

import { useEffect } from 'react';
import { hydrateProjectStore } from '../store/project';
import Sidebar from "./Sidebar";
import { Toaster } from "./ui/toaster";

interface IClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: IClientLayoutProps) {
  useEffect(() => {
    hydrateProjectStore();
  }, []);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">
        {children}
      </main>
      <Toaster />
    </div>
  );
} 