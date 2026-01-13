import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRCodeConfig } from '@/types';
import { generateQRCode, configToOptions } from '@/lib/qrcode';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useQRCodeStore } from '@/stores';

interface BatchPreviewProps {
  config: QRCodeConfig;
  columns?: number;
  qrSize?: number;
}

export function BatchPreview({ config, columns = 4, qrSize = 150 }: BatchPreviewProps) {
  const batchConfig = useQRCodeStore((state) => state.batchConfig);
  const removeBatchItem = useQRCodeStore((state) => state.removeBatchItem);
  const [previews, setPreviews] = useState<{ id: string; dataUrl: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const isGeneratingRef = useRef(false);
  const initializedRef = useRef(false);

  // 生成预览
  const generatePreviews = useCallback(async () => {
    if (batchConfig.data.length === 0) {
      setPreviews([]);
      setGenerating(false);
      return;
    }

    if (isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setGenerating(true);
    setProgress(0);

    const results: { id: string; dataUrl: string }[] = [];

    for (let i = 0; i < batchConfig.data.length; i++) {
      const item = batchConfig.data[i];
      try {
        const dataUrl = await generateQRCode(item.content, configToOptions(config));
        results.push({ id: item.id, dataUrl });
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }

      setProgress(((i + 1) / batchConfig.data.length) * 100);
    }

    setPreviews(results);
    setGenerating(false);
    isGeneratingRef.current = false;
  }, [batchConfig.data, config]);

  // 初始化时生成预览
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      generatePreviews();
    }
  }, [generatePreviews]);

  // 刷新按钮
  const handleRefresh = () => {
    generatePreviews();
  };

  // 删除单个项
  const handleRemove = (id: string) => {
    // 从 store 中删除
    removeBatchItem(id);
    // 从本地预览中移除该项（只移除点击的那个）
    setPreviews(prev => prev.filter(p => p.id !== id));
  };

  if (batchConfig.data.length === 0 && previews.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">预览</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[calc(100%-52px)]">
          <p className="text-muted-foreground text-sm">
            请在左侧输入要生成二维码的内容
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
        <CardTitle className="text-sm">
          预览 ({batchConfig.data.length})
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={generating}
          className="h-7 px-2"
        >
          {generating ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              <span className="text-xs">生成中... {Math.round(progress)}%</span>
            </>
          ) : (
            <>
              <RefreshCw className="mr-1 h-3 w-3" />
              <span className="text-xs">刷新</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
        {generating && (
          <div className="mb-1 px-1">
            <div className="w-full bg-secondary rounded-full h-1">
              <div
                className="bg-primary h-1 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 网格布局 */}
        <div
          className="grid gap-[15px] flex-1 overflow-y-auto"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {previews.map((preview, index) => {
            const item = batchConfig.data.find(i => i.id === preview.id);
            // 如果 item 不存在（已被删除），跳过渲染
            if (!item) return null;

            return (
              <div
                key={preview.id}
                className="relative group border-b border-r p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={preview.dataUrl}
                    alt={`QR ${index + 1}`}
                    className="object-contain"
                    style={{ width: qrSize - 10, height: qrSize - 10 }}
                  />
                  <span className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-full px-1">
                    {item.content}
                  </span>
                </div>
                {/* 删除按钮 */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(preview.id);
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
                {/* 序号 */}
                <div className="absolute top-0.5 left-0.5 bg-muted/80 text-[9px] px-1 rounded text-muted-foreground z-10">
                  {index + 1}
                </div>
              </div>
            );
          })}
        </div>

        {previews.length === 0 && !generating && (
          <div className="flex items-center justify-center flex-1">
            <p className="text-muted-foreground text-sm">
              点击刷新生成二维码预览
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
