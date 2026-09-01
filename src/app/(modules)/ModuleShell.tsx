'use client';

import { useState, useSyncExternalStore } from 'react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useOnboarding } from '@/hooks/useOnboarding';
import { WelcomeScreen } from '../WelcomeScreen';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function ModuleShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { showOnboarding, startTour } = useOnboarding();
  // True only after client-side hydration, without a cascading effect render.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [tourStarted, setTourStarted] = useState(false);

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
    <SidebarProvider className="h-screen">
      <AppSidebar />
      <SidebarInset className="flex max-h-screen flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-hidden w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
