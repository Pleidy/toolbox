import { useCallback, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import {
  Image as ImageIcon,
  Upload,
  Download,
  Copy,
  Trash2,
  ZoomIn,
  FileImage,
  ArrowRightLeft,
  Info,
  Plus,
  X,
  Check,
} from "lucide-react";
import { useImageStore, ImageInfo } from "@/stores/useImageStore";
import { cn } from "@/lib/utils";

// 获取图片信息
const getImageInfo = (dataUrl: string): Promise<ImageInfo> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 从 base64 计算大小
      const base64Length = dataUrl.length - dataUrl.indexOf(',') - 1;
      const sizeInBytes = Math.ceil(base64Length * 0.75);

      // 检测格式
      const formatMatch = dataUrl.match(/data:image\/(\w+);/);
      const format = formatMatch ? formatMatch[1].toUpperCase() : 'Unknown';

      // 检测是否有透明通道
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let hasAlpha = false;
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] < 255) {
            hasAlpha = true;
            break;
          }
        }
        resolve({
          width: img.width,
          height: img.height,
          size: sizeInBytes,
          format,
          hasAlpha,
        });
      } else {
        resolve({
          width: img.width,
          height: img.height,
          size: sizeInBytes,
          format,
          hasAlpha: false,
        });
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

// 压缩图片
const compressImage = (
  dataUrl: string,
  quality: number,
  scale: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 使用白色背景填充（用于 JPEG 格式）
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality / 100));
      } else {
        reject(new Error('无法获取 Canvas 上下文'));
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

// 格式转换
const convertImage = (
  dataUrl: string,
  format: 'png' | 'jpeg' | 'webp'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // JPEG 不支持透明，需要填充白色背景
        if (format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(`image/${format}`, 0.92));
      } else {
        reject(new Error('无法获取 Canvas 上下文'));
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

// 格式化文件大小
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// 模式标签
const MODES = [
  { id: 'compress' as const, name: '压缩', icon: ZoomIn },
  { id: 'convert' as const, name: '转换', icon: ArrowRightLeft },
  { id: 'base64' as const, name: 'Base64', icon: FileImage },
  { id: 'info' as const, name: '信息', icon: Info },
];

// 格式选项
const FORMATS = [
  { id: 'png' as const, name: 'PNG' },
  { id: 'jpeg' as const, name: 'JPEG' },
  { id: 'webp' as const, name: 'WebP' },
];

export function ImageTool() {
  const tabs = useImageStore((state) => state.tabs);
  const activeTabId = useImageStore((state) => state.activeTabId);
  const addTab = useImageStore((state) => state.addTab);
  const closeTab = useImageStore((state) => state.closeTab);
  const setActiveTab = useImageStore((state) => state.setActiveTab);
  const updateTab = useImageStore((state) => state.updateTab);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('请上传图片文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl && activeTab) {
          const info = await getImageInfo(dataUrl);
          updateTab(activeTab.id, {
            originalImage: dataUrl,
            originalInfo: info,
            processedImage: null,
            processedInfo: null,
            base64Output: dataUrl,
            name: file.name,
          });
        }
      };
      reader.readAsDataURL(file);
    },
    [activeTab, updateTab]
  );

  // 处理拖放
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // 处理图片
  const handleProcess = useCallback(async () => {
    if (!activeTab?.originalImage) return;

    setIsProcessing(true);
    try {
      let result: string;
      if (activeTab.mode === 'compress') {
        result = await compressImage(
          activeTab.originalImage,
          activeTab.compressQuality,
          activeTab.compressScale
        );
      } else if (activeTab.mode === 'convert') {
        result = await convertImage(
          activeTab.originalImage,
          activeTab.convertFormat
        );
      } else {
        result = activeTab.originalImage;
      }

      const info = await getImageInfo(result);
      updateTab(activeTab.id, {
        processedImage: result,
        processedInfo: info,
        base64Output: result,
      });
    } catch (error) {
      console.error('处理图片失败:', error);
      alert('处理图片失败');
    } finally {
      setIsProcessing(false);
    }
  }, [activeTab, updateTab]);

  // 下载图片
  const handleDownload = useCallback(() => {
    const image = activeTab?.processedImage || activeTab?.originalImage;
    if (!image) return;

    const link = document.createElement('a');
    link.download = `processed-${Date.now()}.png`;
    link.href = image;
    link.click();
  }, [activeTab]);

  // 复制 Base64
  const handleCopyBase64 = useCallback(async () => {
    const base64 = activeTab?.base64Output;
    if (!base64) return;

    try {
      await navigator.clipboard.writeText(base64);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, [activeTab?.base64Output]);

  // Base64 转图片
  const handleBase64ToImage = useCallback(async () => {
    const base64 = activeTab?.base64Input;
    if (!base64) return;

    try {
      // 验证是否为有效的 base64 图片
      let dataUrl = base64;
      if (!base64.startsWith('data:image')) {
        dataUrl = `data:image/png;base64,${base64}`;
      }

      const info = await getImageInfo(dataUrl);
      updateTab(activeTab!.id, {
        originalImage: dataUrl,
        originalInfo: info,
        processedImage: dataUrl,
        processedInfo: info,
        base64Output: dataUrl,
      });
    } catch (error) {
      alert('无效的 Base64 字符串');
    }
  }, [activeTab, updateTab]);

  // 清除图片
  const handleClear = useCallback(() => {
    if (activeTab) {
      updateTab(activeTab.id, {
        originalImage: null,
        originalInfo: null,
        processedImage: null,
        processedInfo: null,
        base64Output: '',
        base64Input: '',
      });
    }
  }, [activeTab, updateTab]);

  // 关闭标签页
  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      closeTab(tabId);
    },
    [closeTab]
  );

  if (!activeTab) return null;

  return (
    <div className="flex flex-col h-full">
      {/* 功能标签 */}
      <div className="flex items-center gap-1 p-2 border-b">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <Button
              key={mode.id}
              variant={activeTab.mode === mode.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateTab(activeTab.id, { mode: mode.id })}
              className="h-7"
            >
              <Icon className="w-3.5 h-3.5 mr-1" />
              {mode.name}
            </Button>
          );
        })}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* 左侧：上传和预览 */}
        <Card className="w-[45%] flex-shrink-0 flex flex-col min-w-0">
          <CardHeader className="flex-shrink-0 py-2 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                原图
              </CardTitle>
              {activeTab.originalImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-6 px-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 overflow-auto">
            {!activeTab.originalImage ? (
              <div
                className={cn(
                  "h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  拖拽图片到此处或点击上传
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  支持 PNG, JPEG, WebP, BMP
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col gap-2">
                <img
                  src={activeTab.originalImage}
                  alt="原图"
                  className="max-w-full max-h-[200px] object-contain rounded border mx-auto"
                />
                {activeTab.originalInfo && (
                  <div className="text-xs text-muted-foreground space-y-0.5 bg-muted/30 p-2 rounded">
                    <div className="flex justify-between">
                      <span>尺寸:</span>
                      <span>{activeTab.originalInfo.width} x {activeTab.originalInfo.height}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>大小:</span>
                      <span>{formatSize(activeTab.originalInfo.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>格式:</span>
                      <span>{activeTab.originalInfo.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>透明通道:</span>
                      <span>{activeTab.originalInfo.hasAlpha ? '是' : '否'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：设置和结果 */}
        <Card className="flex-1 flex flex-col min-w-0">
          <CardHeader className="flex-shrink-0 py-2 px-3">
            <CardTitle className="text-sm font-medium">
              {activeTab.mode === 'compress' && '压缩设置'}
              {activeTab.mode === 'convert' && '格式转换'}
              {activeTab.mode === 'base64' && 'Base64 转换'}
              {activeTab.mode === 'info' && '图片信息'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-2 overflow-auto flex flex-col gap-3">
            {/* 压缩设置 */}
            {activeTab.mode === 'compress' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>质量</span>
                    <span className="text-muted-foreground">{activeTab.compressQuality}%</span>
                  </div>
                  <Slider
                    value={[activeTab.compressQuality]}
                    onValueChange={([value]) =>
                      updateTab(activeTab.id, { compressQuality: value })
                    }
                    min={1}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>缩放比例</span>
                    <span className="text-muted-foreground">
                      {Math.round(activeTab.compressScale * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[activeTab.compressScale * 100]}
                    onValueChange={([value]) =>
                      updateTab(activeTab.id, { compressScale: value / 100 })
                    }
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            )}

            {/* 格式转换设置 */}
            {activeTab.mode === 'convert' && (
              <div className="space-y-2">
                <span className="text-sm">输出格式</span>
                <div className="flex gap-2">
                  {FORMATS.map((format) => (
                    <Button
                      key={format.id}
                      variant={activeTab.convertFormat === format.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateTab(activeTab.id, { convertFormat: format.id })}
                    >
                      {format.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Base64 转换 */}
            {activeTab.mode === 'base64' && (
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex-1 flex flex-col">
                  <span className="text-xs text-muted-foreground mb-1">Base64 输入 (转图片)</span>
                  <textarea
                    value={activeTab.base64Input}
                    onChange={(e) => updateTab(activeTab.id, { base64Input: e.target.value })}
                    placeholder="粘贴 Base64 字符串..."
                    className="flex-1 min-h-[60px] w-full resize-none border rounded p-2 font-mono text-xs bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    size="sm"
                    onClick={handleBase64ToImage}
                    disabled={!activeTab.base64Input}
                    className="mt-2"
                  >
                    Base64 转图片
                  </Button>
                </div>
              </div>
            )}

            {/* 图片信息模式 */}
            {activeTab.mode === 'info' && activeTab.originalInfo && (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/30 p-2 rounded">
                    <div className="text-muted-foreground text-xs">宽度</div>
                    <div className="font-medium">{activeTab.originalInfo.width} px</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded">
                    <div className="text-muted-foreground text-xs">高度</div>
                    <div className="font-medium">{activeTab.originalInfo.height} px</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded">
                    <div className="text-muted-foreground text-xs">文件大小</div>
                    <div className="font-medium">{formatSize(activeTab.originalInfo.size)}</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded">
                    <div className="text-muted-foreground text-xs">格式</div>
                    <div className="font-medium">{activeTab.originalInfo.format}</div>
                  </div>
                  <div className="bg-muted/30 p-2 rounded col-span-2">
                    <div className="text-muted-foreground text-xs">透明通道</div>
                    <div className="font-medium">{activeTab.originalInfo.hasAlpha ? '有' : '无'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 处理按钮 */}
            {activeTab.originalImage && activeTab.mode !== 'info' && (
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="mt-2"
              >
                {isProcessing ? '处理中...' : '开始处理'}
              </Button>
            )}

            {/* 处理结果 */}
            {activeTab.processedImage && (
              <div className="mt-2 flex-1 flex flex-col gap-2">
                <span className="text-sm font-medium">处理结果</span>
                <img
                  src={activeTab.processedImage}
                  alt="处理后"
                  className="max-w-full max-h-[120px] object-contain rounded border"
                />
                {activeTab.processedInfo && (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    大小: {formatSize(activeTab.processedInfo.size)}
                    {activeTab.originalInfo && (
                      <span className="ml-2">
                        ({Math.round((1 - activeTab.processedInfo.size / activeTab.originalInfo.size) * 100)}% 压缩)
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDownload} className="flex-1">
                    <Download className="w-3.5 h-3.5 mr-1" />
                    下载
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyBase64}
                    className="flex-1"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 mr-1" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" />
                    )}
                    复制 Base64
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 底部标签栏 */}
      <div className="flex items-center gap-1 p-2 border-t bg-muted/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
              tab.id === activeTabId
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <FileImage className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{tab.name}</span>
            {tabs.length > 1 && (
              <X
                className="w-3 h-3 hover:text-destructive cursor-pointer opacity-60 hover:opacity-100"
                onClick={(e) => handleCloseTab(e, tab.id)}
              />
            )}
          </button>
        ))}
        <button
          onClick={addTab}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-muted transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
