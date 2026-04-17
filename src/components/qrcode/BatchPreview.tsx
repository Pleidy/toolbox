import { ReactNode, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { QRCodeConfig } from '@/types';
import { generateQRCode, configToOptions } from '@/lib/qrcode';
import { Loader2, Trash2, RefreshCw, XCircle, Copy, Check } from 'lucide-react';
import { useQRCodeStore } from '@/stores';

interface BatchPreviewProps {
  config: QRCodeConfig;
  columns?: number;
  qrSize?: number;
  rowHeight?: number;
  extraActions?: ReactNode;
}

const GRID_GAP = 15;
const OVERSCAN_ROWS = 2;

export function BatchPreview({
  config,
  columns = 4,
  qrSize = 150,
  rowHeight = 180,
  extraActions,
}: BatchPreviewProps) {
  const batchConfig = useQRCodeStore((state) => state.batchConfig);
  const removeBatchItem = useQRCodeStore((state) => state.removeBatchItem);
  const toggleUsed = useQRCodeStore((state) => state.toggleUsed);
  const clearAllUsed = useQRCodeStore((state) => state.clearAllUsed);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [, setPreviewVersion] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previewCacheRef = useRef(new Map<string, string>());
  const generationRunRef = useRef(0);

  const batchData = batchConfig?.data || [];

  const configSignature = useMemo(
    () =>
      JSON.stringify({
        width: config.width,
        margin: config.margin,
        errorCorrectionLevel: config.errorCorrectionLevel,
        foregroundColor: config.foregroundColor,
        backgroundColor: config.backgroundColor,
        logo: config.logo || '',
        logoWidth: config.logoWidth || 0,
        logoHeight: config.logoHeight || 0,
        style: config.style,
      }),
    [
      config.width,
      config.margin,
      config.errorCorrectionLevel,
      config.foregroundColor,
      config.backgroundColor,
      config.logo,
      config.logoWidth,
      config.logoHeight,
      config.style,
    ]
  );

  const usedCount = useMemo(
    () => batchData.reduce((count, item) => count + (item.used ? 1 : 0), 0),
    [batchData]
  );

  const rowStride = rowHeight + GRID_GAP;
  const rowCount = Math.ceil(batchData.length / columns);
  const startRow = Math.max(0, Math.floor(scrollTop / rowStride) - OVERSCAN_ROWS);
  const visibleRowCount = Math.max(
    1,
    Math.ceil(Math.max(viewportHeight, rowStride) / rowStride) + OVERSCAN_ROWS * 2
  );
  const endRow = Math.min(rowCount, startRow + visibleRowCount);
  const startIndex = startRow * columns;
  const endIndex = Math.min(batchData.length, endRow * columns);
  const visibleItems = useMemo(
    () => batchData.slice(startIndex, endIndex),
    [batchData, startIndex, endIndex]
  );
  const topOffset = startRow * rowStride;
  const totalHeight = rowCount === 0 ? 0 : rowCount * rowStride - GRID_GAP;

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateViewportHeight = () => setViewportHeight(container.clientHeight);
    updateViewportHeight();

    const observer = new ResizeObserver(updateViewportHeight);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    previewCacheRef.current.clear();
    generationRunRef.current += 1;
    setGenerating(false);
    setProgress(0);
    setPreviewVersion((version) => version + 1);
  }, [configSignature]);

  useEffect(() => {
    const validIds = new Set(batchData.map((item) => item.id));
    let changed = false;

    for (const key of previewCacheRef.current.keys()) {
      if (!validIds.has(key)) {
        previewCacheRef.current.delete(key);
        changed = true;
      }
    }

    if (changed) {
      setPreviewVersion((version) => version + 1);
    }
  }, [batchData]);

  useEffect(() => {
    if (batchData.length === 0) {
      previewCacheRef.current.clear();
      generationRunRef.current += 1;
      setGenerating(false);
      setProgress(0);
      setPreviewVersion((version) => version + 1);
      return;
    }

    const missingItems = visibleItems.filter(
      (item) => !previewCacheRef.current.has(item.id)
    );

    if (missingItems.length === 0) {
      setGenerating(false);
      setProgress(0);
      return;
    }

    let cancelled = false;
    const currentRun = ++generationRunRef.current;
    const options = configToOptions(config);

    setGenerating(true);
    setProgress(0);

    const generateVisiblePreviews = async () => {
      for (let index = 0; index < missingItems.length; index += 1) {
        if (cancelled || currentRun !== generationRunRef.current) {
          return;
        }

        const item = missingItems[index];

        try {
          const dataUrl = await generateQRCode(item.content, options);

          if (cancelled || currentRun !== generationRunRef.current) {
            return;
          }

          previewCacheRef.current.set(item.id, dataUrl);
          setPreviewVersion((version) => version + 1);
        } catch (error) {
          console.error('Failed to generate QR code preview:', error);
        }

        if (!cancelled && currentRun === generationRunRef.current) {
          setProgress(((index + 1) / missingItems.length) * 100);
        }
      }

      if (!cancelled && currentRun === generationRunRef.current) {
        setGenerating(false);
      }
    };

    void generateVisiblePreviews();

    return () => {
      cancelled = true;
    };
  }, [batchData.length, visibleItems, configSignature, refreshToken]);

  const handleCopy = useCallback(
    async (content: string, id: string, event: React.MouseEvent) => {
      event.stopPropagation();

      try {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      } catch (error) {
        console.error('复制失败:', error);
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    previewCacheRef.current.clear();
    generationRunRef.current += 1;
    setGenerating(false);
    setProgress(0);
    setPreviewVersion((version) => version + 1);
    setRefreshToken((token) => token + 1);
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      previewCacheRef.current.delete(id);
      removeBatchItem(id);
      setPreviewVersion((version) => version + 1);
    },
    [removeBatchItem]
  );

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  if (batchData.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground text-sm">请在左侧输入要生成二维码的内容</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm text-muted-foreground">
              {batchData.length} 个二维码
              {usedCount > 0 && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  ({usedCount} 已标记)
                </span>
              )}
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              预览按可见区域生成，滚动时按需加载，可承受更大的批量数据。
            </p>
          </div>
          <div className="flex items-center gap-1">
            {usedCount > 0 && (
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
                  <span className="text-xs">生成可见区... {Math.round(progress)}%</span>
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  <span className="text-xs">刷新当前预览</span>
                </>
              )}
            </Button>
            {extraActions}
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

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="relative" style={{ height: totalHeight }}>
            <div
              className="absolute left-0 right-0 grid gap-[15px]"
              style={{
                top: topOffset,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {visibleItems.map((item, visibleIndex) => {
                const previewUrl = previewCacheRef.current.get(item.id);
                const absoluteIndex = startIndex + visibleIndex;

                return (
                  <div
                    key={item.id}
                    className="relative group border-b border-r p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    style={{ height: rowHeight }}
                    onClick={() => toggleUsed(item.id)}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="relative flex items-center justify-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={`QR ${absoluteIndex + 1}`}
                            className="object-contain"
                            style={{ width: qrSize - 10, height: qrSize - 10 }}
                          />
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center rounded bg-muted/60 text-muted-foreground"
                            style={{ width: qrSize - 10, height: qrSize - 10 }}
                          >
                            <Loader2 className="h-4 w-4 animate-spin mb-1" />
                            <span className="text-[10px]">生成中</span>
                          </div>
                        )}

                        {item.used && (
                          <div className="absolute inset-0 pointer-events-none bg-black/50">
                            <svg
                              className="w-full h-full"
                              viewBox="0 0 100 100"
                              preserveAspectRatio="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" strokeWidth="8" />
                              <line x1="100" y1="0" x2="0" y2="100" stroke="#000000" strokeWidth="8" />
                              <line x1="0" y1="25" x2="75" y2="100" stroke="#000000" strokeWidth="6" />
                              <line x1="25" y1="0" x2="100" y2="75" stroke="#000000" strokeWidth="6" />
                              <line x1="0" y1="75" x2="25" y2="100" stroke="#000000" strokeWidth="6" />
                              <line x1="75" y1="0" x2="100" y2="25" stroke="#000000" strokeWidth="6" />
                            </svg>
                          </div>
                        )}

                        {copiedId === item.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 text-white text-xs font-medium">
                            已复制
                          </div>
                        )}
                      </div>

                      {item.label ? (
                        <div className="mt-0.5 text-[10px] font-medium text-foreground text-center truncate max-w-full px-1">
                          {item.label}
                        </div>
                      ) : (
                        <span className="mt-0.5 text-[10px] text-muted-foreground truncate max-w-full px-1">
                          {item.content}
                        </span>
                      )}
                    </div>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 z-20"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemove(item.id);
                      }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>

                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 z-20"
                      onClick={(event) => handleCopy(item.content, item.id, event)}
                      title="复制内容"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-2.5 w-2.5 text-green-600" />
                      ) : (
                        <Copy className="h-2.5 w-2.5" />
                      )}
                    </Button>

                    <div className="absolute top-0.5 left-0.5 bg-muted/80 text-[9px] px-1 rounded text-muted-foreground z-10">
                      {absoluteIndex + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
