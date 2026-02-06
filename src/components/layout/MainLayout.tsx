import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function MainLayout({ children, activeTool, onToolChange }: MainLayoutProps) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="h-screen flex bg-background relative overflow-hidden">
      <Sidebar activeTool={activeTool} onToolChange={onToolChange} />
      
      <main 
        className={cn(
          "flex-1 overflow-auto p-6 transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-12"
        )}
      >
        {children}
      </main>
    </div>
  );
}
