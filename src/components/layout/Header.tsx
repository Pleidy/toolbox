import { Sun, Moon } from 'lucide-react';
import { Switch } from '../ui/Switch';
import { useAppStore } from '@/stores';
import { useTheme } from 'next-themes';

export function Header() {
  const { theme, setTheme } = useAppStore();
  const { setTheme: setNextTheme } = useTheme();

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    setTheme(newTheme);
    setNextTheme(newTheme);
  };

  return (
    <header className="h-14 border-b bg-card px-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-semibold">QRCode Toolbox</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Sun className="h-4 w-4" />
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={handleThemeChange}
          />
          <Moon className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
