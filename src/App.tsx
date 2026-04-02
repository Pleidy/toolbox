import {
  lazy,
  Suspense,
  useState,
  Component,
  ErrorInfo,
  ReactNode,
} from 'react';
import { ThemeProvider } from 'next-themes';
import { MainLayout } from '@/components/layout';

const QRCodeGenerator = lazy(async () => {
  const module = await import('@/components/qrcode');
  return { default: module.QRCodeGenerator };
});

const Encoder = lazy(async () => {
  const module = await import('@/components/encoder/Encoder');
  return { default: module.Encoder };
});

const JsonFormatter = lazy(async () => {
  const module = await import('@/components/json/JsonFormatter');
  return { default: module.JsonFormatter };
});

const ImageTool = lazy(async () => {
  const module = await import('@/components/image/ImageTool');
  return { default: module.ImageTool };
});

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

    try {
      localStorage.removeItem('qrcode-toolbox-config');
    } catch (storageError) {
      console.error('Failed to clear storage:', storageError);
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

function ToolLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">正在加载模块...</p>
      </div>
    </div>
  );
}

function ToolContent({ activeTool }: { activeTool: string }) {
  if (activeTool === 'qrcode') {
    return <QRCodeGenerator />;
  }

  if (activeTool === 'encoder') {
    return <Encoder />;
  }

  if (activeTool === 'json') {
    return <JsonFormatter />;
  }

  if (activeTool === 'image') {
    return <ImageTool />;
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">更多工具即将推出...</p>
    </div>
  );
}

function App() {
  const [activeTool, setActiveTool] = useState('qrcode');

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <MainLayout activeTool={activeTool} onToolChange={setActiveTool}>
          <Suspense fallback={<ToolLoadingFallback />}>
            <ToolContent activeTool={activeTool} />
          </Suspense>
        </MainLayout>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
