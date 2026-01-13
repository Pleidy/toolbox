import { QrCode, Settings, LayoutGrid } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function Sidebar({ activeTool, onToolChange }: SidebarProps) {
  const { sidebarOpen } = useAppStore();

  const tools = [
    { id: 'qrcode', name: '二维码生成', icon: QrCode },
    { id: 'tools', name: '更多工具', icon: LayoutGrid },
  ];

  return (
    <aside
      className={cn(
        "w-64 border-r bg-card transition-all duration-300 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">工具箱</h2>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => onToolChange(tool.id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {tool.name}
            </Button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          设置
        </Button>
      </div>
    </aside>
  );
}
