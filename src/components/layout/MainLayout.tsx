import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function MainLayout({ children, activeTool, onToolChange }: MainLayoutProps) {
  return (
    <div className="h-screen flex bg-background">
      <Sidebar activeTool={activeTool} onToolChange={onToolChange} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
