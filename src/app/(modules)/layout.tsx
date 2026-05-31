'use client';

import { useEffect, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function ModuleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { showOnboarding, startTour } = useOnboarding();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && showOnboarding) {
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, showOnboarding, startTour]);

  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-hidden w-full">
          {children}
        </div>
      </main>
    </div>
  );
}