import { QrCode, Settings, LayoutGrid, FileJson, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { useAppStore } from '@/stores';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function Sidebar({ activeTool, onToolChange }: SidebarProps) {
  const { sidebarOpen, theme } = useAppStore();
  const { setTheme: setNextTheme } = useTheme();

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    useAppStore.getState().setTheme(newTheme);
    setNextTheme(newTheme);
  };

  const tools = [
    { id: 'qrcode', name: '二维码生成', icon: QrCode },
    { id: 'json', name: 'JSON 格式化', icon: FileJson },
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
        <h2 className="font-semibold text-lg">Toolbox</h2>
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
      
      <div className="p-4 border-t space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sun className="h-4 w-4" />
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={handleThemeChange}
            />
            <Moon className="h-4 w-4" />
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          设置
        </Button>
      </div>
    </aside>
  );
}
