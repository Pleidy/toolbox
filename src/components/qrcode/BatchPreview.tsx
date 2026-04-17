import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const GRID_GAP = 16;
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

    const missingItems = visibleItems.filter((item) => !previewCacheRef.current.has(item.id));

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

  const handleCopy = useCallback(async (content: string, id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (error) {
      console.error('复制内容失败:', error);
    }
  }, []);

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
      <Card className="h-full border-border/70 shadow-none">
        <CardContent className="flex h-full items-center justify-center">
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-foreground">还没有可预览的二维码</p>
            <p className="text-sm text-muted-foreground">在左侧输入内容或导入文件后，这里会按可见区域即时生成预览。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/70 shadow-none">
      <CardContent className="flex h-full flex-col overflow-hidden p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">{batchData.length} 个二维码</span>
              <span className="rounded-full border border-border/70 bg-muted/55 px-2 py-0.5 text-[11px] text-muted-foreground">
                按可见区域即时生成
              </span>
              {usedCount > 0 && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  已标记 {usedCount} 项
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              点击卡片可快速标记，悬停后可复制内容或删除单项。大批量数据只会渲染当前可见内容，避免预览区阻塞。
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={generating}
              className="h-8 rounded-lg border-border/70 px-2.5 text-xs"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  生成中 {Math.round(progress)}%
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  刷新预览
                </>
              )}
            </Button>
            {usedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllUsed}
                disabled={generating}
                className="h-8 rounded-lg px-2.5 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
                title="取消所有标记"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                取消标记
              </Button>
            )}
            {extraActions}
          </div>
        </div>

        {generating && (
          <div className="mb-3 rounded-full bg-secondary/80 p-1">
            <div
              className="h-1 rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="relative" style={{ height: totalHeight }}>
            <div
              className="absolute left-0 right-0 grid gap-4"
              style={{
                top: topOffset,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {visibleItems.map((item, visibleIndex) => {
                const previewUrl = previewCacheRef.current.get(item.id);
                const absoluteIndex = startIndex + visibleIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`group relative overflow-hidden rounded-2xl border text-left transition-all ${
                      item.used
                        ? 'border-emerald-200 bg-emerald-50/40 shadow-[0_0_0_1px_rgba(16,185,129,0.08)] dark:border-emerald-900/60 dark:bg-emerald-950/15'
                        : 'border-border/70 bg-background hover:border-primary/35 hover:bg-accent/25 hover:shadow-sm'
                    }`}
                    style={{ height: rowHeight }}
                    onClick={() => toggleUsed(item.id)}
                  >
                    <div className="absolute left-3 top-3 z-10 rounded-full border border-border/70 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                      #{absoluteIndex + 1}
                    </div>

                    <div className="absolute right-3 top-3 z-20 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 rounded-full border border-border/70 bg-background/90 shadow-sm"
                        onClick={(event) => handleCopy(item.content, item.id, event)}
                        title="复制内容"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 rounded-full shadow-sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemove(item.id);
                        }}
                        title="删除此项"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-6">
                      <div className="relative flex items-center justify-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={`QR ${absoluteIndex + 1}`}
                            className="object-contain"
                            style={{ width: qrSize - 8, height: qrSize - 8 }}
                          />
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground"
                            style={{ width: qrSize - 8, height: qrSize - 8 }}
                          >
                            <Loader2 className="mb-2 h-4 w-4 animate-spin" />
                            <span className="text-[10px]">生成预览中</span>
                          </div>
                        )}

                        {item.used && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/32">
                            <div className="absolute inset-0">
                              <svg
                                className="h-full w-full"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <line x1="10" y1="10" x2="90" y2="90" stroke="#0f172a" strokeWidth="5" />
                                <line x1="90" y1="10" x2="10" y2="90" stroke="#0f172a" strokeWidth="5" />
                              </svg>
                            </div>
                            <span className="relative rounded-full bg-background/95 px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                              已标记
                            </span>
                          </div>
                        )}

                        {copiedId === item.id && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-emerald-500/80 text-xs font-medium text-white">
                            已复制
                          </div>
                        )}
                      </div>

                      <div className="max-w-full text-center">
                        {item.label ? (
                          <div className="truncate text-xs font-medium text-foreground">{item.label}</div>
                        ) : (
                          <div className="truncate text-xs text-muted-foreground">{item.content}</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
