import { useState, Component, ErrorInfo, ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { MainLayout } from '@/components/layout';
import { QRCodeGenerator } from '@/components/qrcode';
import { JsonFormatter } from '@/components/json/JsonFormatter';

// 错误边界组件，防止渲染错误导致空白页
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error:', error, errorInfo);
    // 尝试清除可能损坏的存储
    try {
      localStorage.removeItem('qrcode-toolbox-config');
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
          <h1 className="text-xl font-bold mb-4">应用出现错误</h1>
          <p className="text-muted-foreground mb-4 text-center">
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            重置并刷新
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [activeTool, setActiveTool] = useState('qrcode');

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MainLayout activeTool={activeTool} onToolChange={setActiveTool}>
          {activeTool === 'qrcode' ? (
            <QRCodeGenerator />
          ) : activeTool === 'json' ? (
            <JsonFormatter />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">更多工具即将推出...</p>
            </div>
          )}
        </MainLayout>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
