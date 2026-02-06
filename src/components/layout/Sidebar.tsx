import { useState, useMemo } from 'react';
import { QrCode, Settings, LayoutGrid, FileJson, Sun, Moon, Search, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { useAppStore } from '@/stores';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
}

export function Sidebar({ activeTool, onToolChange }: SidebarProps) {
  const { sidebarOpen, theme, setSidebarOpen } = useAppStore();
  const { setTheme: setNextTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

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

  // 过滤工具
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    return tools.filter(tool => 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, tools]);

  // 获取显示的工具列表
  const displayTools = searchQuery.trim() 
    ? tools.map(tool => ({
        ...tool,
        isHidden: !filteredTools.some(t => t.id === tool.id)
      }))
    : tools.map(tool => ({ ...tool, isHidden: false }));

  const clearSearch = () => setSearchQuery('');

  // 收缩状态：只显示图标
  const isCollapsed = !sidebarOpen;

  return (
    <aside
      className={cn(
        "border-r bg-card transition-all duration-300 flex flex-col absolute top-0 left-0 h-full z-40",
        isCollapsed ? "w-12" : "w-64"
      )}
    >
      {/* 标题区域 */}
      {!isCollapsed && (
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Toolbox</h2>
          
          {/* 搜索框 */}
          <div className="mt-3 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索工具..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* 工具列表 */}
      <nav className={cn("flex-1 p-2 space-y-1", isCollapsed && "pt-2")}>
        {displayTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className={cn(
                "transition-all duration-200",
                isCollapsed ? "h-10" : tool.isHidden && searchQuery ? "h-10" : "h-auto"
              )}
            >
              <Button
                variant={activeTool === tool.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full transition-all duration-200 h-10",
                  isCollapsed ? "justify-center px-0" : "justify-start"
                )}
                onClick={() => onToolChange(tool.id)}
                title={isCollapsed ? tool.name : tool.isHidden ? tool.name : undefined}
              >
                <Icon className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
                {!(isCollapsed || (tool.isHidden && searchQuery)) && tool.name}
              </Button>
            </div>
          );
        })}
      </nav>
      
      {/* 底部区域 */}
      <div className={cn("p-2 border-t relative", isCollapsed && "pt-2")}>
        {/* 侧边栏展开/收缩按钮 - 右下角 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "absolute -bottom-px right-0 z-10 transition-colors",
            isCollapsed 
              ? "rounded-tl-lg rounded-br-none bg-background border-t border-l border-border/50 shadow-md hover:bg-accent"
              : "rounded-tr-lg rounded-bl-none bg-background border-t border-r border-border/50 shadow-md hover:bg-accent"
          )}
          title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-foreground" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-foreground" />
          )}
        </Button>
        
        {/* 主题切换 */}
        <div className={cn("flex items-center mb-2", isCollapsed ? "justify-center" : "justify-between")}>
          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-1">
              <Sun className="h-3 w-3" />
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={handleThemeChange}
                className="scale-75"
              />
              <Moon className="h-3 w-3" />
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={handleThemeChange}
                />
                <Moon className="h-4 w-4" />
              </div>
            </>
          )}
        </div>
        
        {/* 设置按钮 */}
        <Button 
          variant="ghost" 
          className={cn("w-full h-10", isCollapsed && "justify-center px-0")}
        >
          <Settings className={cn("h-4 w-4", isCollapsed ? "" : "mr-2")} />
          {!isCollapsed && "设置"}
        </Button>
      </div>
    </aside>
  );
}
