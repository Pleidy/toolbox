import { useEffect, useMemo, useState } from 'react';
import { QrCode, Settings, LayoutGrid, FileJson, Sun, Moon, Search, X, PanelLeftClose, PanelLeftOpen, Code, Image, DownloadCloud, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    phase: 'idle',
    message: '未检查更新',
    progress: 0,
    version: null,
  });

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    useAppStore.getState().setTheme(newTheme);
    setNextTheme(newTheme);
  };

  const tools = [
    { id: 'qrcode', name: '二维码生成', icon: QrCode },
    { id: 'encoder', name: '编码转换', icon: Code },
    { id: 'json', name: 'JSON 格式化', icon: FileJson },
    { id: 'image', name: '图片工具', icon: Image },
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
  const isCheckingUpdate =
    updateStatus.phase === 'checking' || updateStatus.phase === 'downloading';
  const isCollapsed = !sidebarOpen;
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);

  useEffect(() => {
    if (!window.electronAPI?.updater) {
      return;
    }

    void window.electronAPI.updater.getStatus().then(setUpdateStatus).catch(() => {
      // ignore
    });

    const unsubscribe = window.electronAPI.updater.onStatus((status) => {
      setUpdateStatus(status);
    });

    void window.electronAPI.updater
      .getSettings()
      .then((settings) => {
        setAutoUpdateEnabled(settings.autoUpdateEnabled);
      })
      .catch(() => {
        // ignore
      });

    return unsubscribe;
  }, []);

  const handleManualUpdateCheck = async () => {
    if (!window.electronAPI?.updater || isCheckingUpdate) {
      return;
    }

    try {
      const status = await window.electronAPI.updater.checkForUpdates();
      setUpdateStatus(status);
    } catch (error) {
      console.error('Manual update check failed:', error);
    }
  };

  const handleAutoUpdateToggle = async (enabled: boolean) => {
    setAutoUpdateEnabled(enabled);

    try {
      await window.electronAPI?.updater?.setAutoUpdateEnabled(enabled);
    } catch (error) {
      console.error('Failed to update auto-update setting:', error);
    }
  };

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
              placeholder="搜索..."
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
      <div className={cn("p-2 border-t", isCollapsed ? "space-y-2" : "space-y-2")}>
        <div className={cn(isCollapsed ? "flex flex-col items-center gap-2" : "space-y-2")}>
          {isCollapsed ? (
            <Button
              variant="outline"
              className="h-9 w-9 justify-center px-0 rounded-lg"
              onClick={() => setSettingsOpen(true)}
              title="设置"
            >
              <Settings className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full h-10 justify-start rounded-lg"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              设置
            </Button>
          )}
        </div>

        <div className={cn(isCollapsed ? "flex justify-center" : "flex justify-end")}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 p-0 rounded-md bg-background border border-border/50 shadow-sm hover:bg-accent"
            title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-foreground" />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-foreground" />
            )}
          </Button>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>
              这里集中放置应用级设置和更新入口。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">主题模式</p>
                  <p className="text-xs text-muted-foreground">
                    当前模式：{theme === 'dark' ? '深色' : theme === 'light' ? '浅色' : '跟随系统'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={handleThemeChange}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 space-y-3">
              <div>
                <p className="text-sm font-medium">应用更新</p>
                <p className="text-xs text-muted-foreground">
                  可控制是否启动自动检查，也支持手动检查更新。
                </p>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                <div>
                  <p className="text-sm font-medium">自动检查更新</p>
                  <p className="text-xs text-muted-foreground">
                    {autoUpdateEnabled ? '启动应用后会自动检查更新' : '启动应用后不自动检查更新'}
                  </p>
                </div>
                <Switch
                  checked={autoUpdateEnabled}
                  onCheckedChange={handleAutoUpdateToggle}
                />
              </div>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleManualUpdateCheck}
                disabled={isCheckingUpdate}
              >
                {isCheckingUpdate ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DownloadCloud className="h-4 w-4 mr-2" />
                )}
                检查更新
              </Button>

              <div className="rounded-md border border-border/60 bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground leading-4">
                  {updateStatus.message}
                  {updateStatus.phase === 'downloading' && ` ${Math.round(updateStatus.progress)}%`}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
