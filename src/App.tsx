import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { MainLayout } from '@/components/layout';
import { QRCodeGenerator } from '@/components/qrcode';

function App() {
  const [activeTool, setActiveTool] = useState('qrcode');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MainLayout activeTool={activeTool} onToolChange={setActiveTool}>
        {activeTool === 'qrcode' ? (
          <QRCodeGenerator />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">更多工具即将推出...</p>
          </div>
        )}
      </MainLayout>
    </ThemeProvider>
  );
}

export default App;
