import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Button } from '../ui/Button';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores';

interface MainLayoutProps {
  children: ReactNode;
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function MainLayout({ children, activeTool, onToolChange }: MainLayoutProps) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <div className="h-screen flex bg-background relative">
      <Sidebar activeTool={activeTool} onToolChange={onToolChange} />
      
      {/* 侧边栏收起时显示的展开按钮 - 左下角 */}
      {!sidebarOpen && (
        <Button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-0 left-0 z-50 rounded-tr-lg rounded-bl-none bg-background/90 backdrop-blur-md border-t border-r border-border/50 shadow-lg hover:bg-accent transition-colors"
          title="展开侧边栏"
        >
          <ChevronRight className="h-4 w-4 text-foreground" />
        </Button>
      )}
      
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
