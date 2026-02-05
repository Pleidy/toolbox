import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRCodeConfig, BatchItem } from '@/types';
import { generateQRCode, configToOptions } from '@/lib/qrcode';
import { Loader2, Trash2, RefreshCw, XCircle, Copy, Check } from 'lucide-react';
import { useQRCodeStore } from '@/stores';

interface BatchPreviewProps {
  config: QRCodeConfig;
  columns?: number;
  qrSize?: number;
  rowHeight?: number;
}

export function BatchPreview({ config, columns = 4, qrSize = 150, rowHeight = 180 }: BatchPreviewProps) {
  const batchConfig = useQRCodeStore((state) => state.batchConfig);
  const removeBatchItem = useQRCodeStore((state) => state.removeBatchItem);
  const toggleUsed = useQRCodeStore((state) => state.toggleUsed);
  const clearAllUsed = useQRCodeStore((state) => state.clearAllUsed);
  const usedContents = useQRCodeStore((state) => state.usedContents);
  const updateBatchItem = useQRCodeStore((state) => state.updateBatchItem);
  const [previews, setPreviews] = useState<{ id: string; dataUrl: string }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isGeneratingRef = useRef(false);
  const initializedRef = useRef(false);

  // 确保 data 是数组
  const batchData = batchConfig?.data || [];

  // 根据缓存的 usedContents 自动恢复标记状态
  useEffect(() => {
    if (batchData.length > 0 && usedContents.length > 0) {
      batchData.forEach((item: BatchItem) => {
        const shouldBeUsed = usedContents.includes(item.content);
        if (shouldBeUsed && !item.used) {
          updateBatchItem(item.id, { used: true });
        }
      });
    }
  }, [batchData.length, usedContents]);

  // 复制内容
  const handleCopy = useCallback(async (content: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止触发标记
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, []);

  // 生成预览
  const generatePreviews = useCallback(async () => {
    if (batchData.length === 0) {
      setPreviews([]);
      setGenerating(false);
      return;
    }

    if (isGeneratingRef.current) return;

    isGeneratingRef.current = true;
    setGenerating(true);
    setProgress(0);

    const results: { id: string; dataUrl: string }[] = [];

    for (let i = 0; i < batchData.length; i++) {
      const item = batchData[i];
      try {
        const dataUrl = await generateQRCode(item.content, configToOptions(config));
        results.push({ id: item.id, dataUrl });
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }

      setProgress(((i + 1) / batchData.length) * 100);
    }

    setPreviews(results);
    setGenerating(false);
    isGeneratingRef.current = false;
  }, [batchData, config]);

  // 初始化时生成预览
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
    }
    generatePreviews();
  }, [generatePreviews]);

  // 监听数据变化，自动刷新预览
  useEffect(() => {
    if (initializedRef.current) {
      generatePreviews();
    }
  }, [batchData.length]);

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

  if (batchData.length === 0 && previews.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground text-sm">
            请在左侧输入要生成二维码的内容
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
        {/* 工具栏：刷新按钮和数量 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {batchData.length} 个二维码
            {batchData.filter((item: BatchItem) => item.used).length > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400">
                ({batchData.filter((item: BatchItem) => item.used).length} 已标记)
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {batchData.some((item: BatchItem) => item.used) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllUsed}
                disabled={generating}
                className="h-7 px-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900"
                title="取消所有标记"
              >
                <XCircle className="mr-1 h-3 w-3" />
                <span className="text-xs">取消标记</span>
              </Button>
            )}
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
          </div>
        </div>

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
            const item = batchData.find((i: BatchItem) => i.id === preview.id);
            // 如果 item 不存在（已被删除），跳过渲染
            if (!item) return null;

            return (
              <div
                key={preview.id}
                className="relative group border-b border-r p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                style={{ height: rowHeight }}
                onClick={() => toggleUsed(preview.id)}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="relative">
                    <img
                      src={preview.dataUrl}
                      alt={`QR ${index + 1}`}
                      className="object-contain"
                      style={{ width: qrSize - 10, height: qrSize - 10 }}
                    />
                    {/* 标记遮挡 - 黑色蒙层 + 斜线破坏二维码识别 */}
                    {item.used && (
                      <div className="absolute inset-0 pointer-events-none bg-black/50">
                        <svg
                          className="w-full h-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          {/* 多条黑色斜线覆盖，破坏二维码识别 */}
                          <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" strokeWidth="8" />
                          <line x1="100" y1="0" x2="0" y2="100" stroke="#000000" strokeWidth="8" />
                          <line x1="0" y1="25" x2="75" y2="100" stroke="#000000" strokeWidth="6" />
                          <line x1="25" y1="0" x2="100" y2="75" stroke="#000000" strokeWidth="6" />
                          <line x1="0" y1="75" x2="25" y2="100" stroke="#000000" strokeWidth="6" />
                          <line x1="75" y1="0" x2="100" y2="25" stroke="#000000" strokeWidth="6" />
                        </svg>
                      </div>
                    )}
                    {/* 复制成功提示 */}
                    {copiedId === preview.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 text-white text-xs font-medium">
                        已复制
                      </div>
                    )}
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-full px-1">
                    {item.content}
                  </span>
                </div>
                {/* 删除按钮 - 右上角 */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(preview.id);
                  }}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
                {/* 复制按钮 - 右下角 */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 z-20"
                  onClick={(e) => handleCopy(item.content, preview.id, e)}
                  title="复制内容"
                >
                  {copiedId === preview.id ? (
                    <Check className="h-2.5 w-2.5 text-green-600" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
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
