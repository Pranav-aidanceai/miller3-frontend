'use client';

import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

export default function ModuleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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