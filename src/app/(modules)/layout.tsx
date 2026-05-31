'use client';

import { useEffect, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeScreen } from '../WelcomeScreen';

export default function ModuleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { showOnboarding, startTour } = useOnboarding();
  const [mounted, setMounted] = useState(false);
  const [tourStarted, setTourStarted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartTour = () => {
    setTourStarted(true);
    setTimeout(() => {
      startTour();
    }, 500);
  };

  // Show welcome screen only if onboarding should be shown and tour hasn't started
  if (mounted && showOnboarding && !tourStarted) {
    return <WelcomeScreen onStartTour={handleStartTour} />;
  }

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