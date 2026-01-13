import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Switch } from '../ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { ColorPicker } from '../ui/ColorPicker';
import { ChevronDown, ChevronUp, Download, FileText, FileArchive, Grid, Settings, LayoutGrid, Upload, QrCode, ScanLine, Copy, Check, RotateCcw } from 'lucide-react';
import { useQRCodeStore } from '@/stores';
import { QRCodePreview } from './QRCodePreview';
import { BatchPreview } from './BatchPreview';
import jsQR from 'jsqr';

type Mode = 'generate' | 'decode';

// LocalStorage 键
const STORAGE_KEY = 'qrcode-toolbox-last-content';

export function QRCodeGenerator() {
  const [mode, setMode] = useState<Mode>('generate');

  return (
    <div className="h-full">
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="mb-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            生码
          </TabsTrigger>
          <TabsTrigger value="decode" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            解码
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-0">
          <GenerateMode />
        </TabsContent>

        <TabsContent value="decode" className="mt-0">
          <DecodeMode />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GenerateMode() {
  const { singleConfig, setSingleConfig, batchConfig, setBatchConfig, addBatchItem, clearBatchItems } = useQRCodeStore();

  // 从 localStorage 恢复上次的内容
  const [inputText, setInputText] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || 'https://example.com';
    }
    return 'https://example.com';
  });

  // 解析输入的内容列表
  const [contentLines, setContentLines] = useState<string[]>([]);

  // 自动检测模式
  const [autoMode, setAutoMode] = useState(true);
  const [detectedMode, setDetectedMode] = useState<'single' | 'batch'>('single');
  const [manualMode, setManualMode] = useState<'single' | 'batch'>('single');

  // 导出设置
  const [exportExpanded, setExportExpanded] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'multiple' | 'collage'>('pdf');
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [exportColumns, setExportColumns] = useState(3);

  // 预览设置（仅批量模式）
  const [previewColumns, setPreviewColumns] = useState(4);
  const [previewSize, setPreviewSize] = useState(150);

  // 样式设置展开状态
  const [styleExpanded, setStyleExpanded] = useState(false);

  // 使用 ref 追踪上一次的输入，避免不必要的重新同步
  const prevInputTextRef = useRef<string>(inputText);
  const isInitialMountRef = useRef(true);

  // 保存内容到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, inputText);
  }, [inputText]);

  // 解析输入内容并同步到批量数据
  useEffect(() => {
    const lines = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    setContentLines(lines);

    // 自动检测模式
    if (autoMode) {
      if (lines.length <= 1) {
        setDetectedMode('single');
      } else {
        setDetectedMode('batch');

        // 只在输入内容真正变化时才同步到批量数据
        // 避免删除操作触发不必要的数据重置
        if (isInitialMountRef.current || prevInputTextRef.current !== inputText) {
          isInitialMountRef.current = false;
          prevInputTextRef.current = inputText;

          // 只有当内容列表确实不同时才清空并重新添加
          const currentContents = batchConfig.data.map(d => d.content);
          if (JSON.stringify(lines) !== JSON.stringify(currentContents)) {
            clearBatchItems();
            lines.forEach(line => addBatchItem(line));
          }
        }
      }
    }
  }, [inputText, autoMode, batchConfig.data, addBatchItem, clearBatchItems]);

  // 确定当前使用的模式
  const currentMode = autoMode ? detectedMode : manualMode;

  // 处理单个内容更新
  useEffect(() => {
    if (currentMode === 'single' && contentLines.length > 0) {
      setSingleConfig({ content: contentLines[0] });
    }
  }, [currentMode, contentLines, setSingleConfig]);

  // 简化版导出处理函数
  const handleExport = () => {
    // 通过自定义事件触发导出
    const event = new CustomEvent('qrcode-export', {
      detail: {
        format: exportFormat,
        itemsPerPage,
        columns: exportColumns,
      }
    });
    window.dispatchEvent(event);
  };

  // 获取当前样式配置
  const currentConfig = currentMode === 'single' ? singleConfig : batchConfig.globalStyle;

  // 处理样式更新
  const handleStyleChange = (style: any) => {
    if (currentMode === 'single') {
      setSingleConfig(style);
    } else {
      setBatchConfig({
        globalStyle: { ...batchConfig.globalStyle, ...style, content: batchConfig.globalStyle.content }
      });
    }
  };

  // 恢复默认内容
  const restoreDefault = () => {
    setInputText('https://example.com');
    clearBatchItems();
  };

  return (
    <div className="h-full flex gap-4">
      {/* 左侧面板：输入 + 样式 + 导出 + 预览设置 */}
      <div className="w-[500px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        {/* 输入区域 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">输入内容</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="auto-mode" className="text-xs">自动识别</Label>
                <Switch
                  id="auto-mode"
                  checked={autoMode}
                  onCheckedChange={setAutoMode}
                  className="scale-75"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* 自动识别提示 */}
              {autoMode && (
                <div className={`text-xs px-2 py-1.5 rounded ${
                  currentMode === 'batch'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}>
                  {currentMode === 'batch'
                    ? `检测到 ${contentLines.length} 个内容，将进行批量生成`
                    : '检测到单个内容，将进行单个生成'
                  }
                </div>
              )}

              {/* 手动模式切换（非自动模式时显示） */}
              {!autoMode && (
                <Tabs value={manualMode} onValueChange={(value) => setManualMode(value as 'single' | 'batch')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="single" className="text-xs px-3 py-1">单个</TabsTrigger>
                    <TabsTrigger value="batch" className="text-xs px-3 py-1">批量</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {/* 内容输入框 - 高度适中 */}
              <div className="space-y-2">
                <textarea
                  className="w-full h-40 p-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="每行输入一个内容"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {contentLines.length} 个二维码
                  </span>
                  <div className="flex items-center gap-2">
                    {inputText !== 'https://example.com' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={restoreDefault}
                        title="恢复默认内容"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        恢复默认
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setInputText('');
                        clearBatchItems();
                      }}
                    >
                      清空
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预览设置（仅批量模式） */}
        {currentMode === 'batch' && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center">
                <LayoutGrid className="mr-2 h-4 w-4" />
                <CardTitle className="text-base">预览设置</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* 每行数量 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">每行数量</Label>
                  <span className="text-xs text-muted-foreground">{previewColumns} 个</span>
                </div>
                <Slider
                  value={[previewColumns]}
                  min={2}
                  max={8}
                  step={1}
                  onValueChange={([value]) => setPreviewColumns(value)}
                />
              </div>

              {/* 码尺寸 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">码尺寸</Label>
                  <span className="text-xs text-muted-foreground">{previewSize}px</span>
                </div>
                <Slider
                  value={[previewSize]}
                  min={80}
                  max={250}
                  step={10}
                  onValueChange={([value]) => setPreviewSize(value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 样式设置 - 折叠 */}
        <Card>
          <CardHeader className="pb-2">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 hover:bg-transparent h-auto"
              onClick={() => setStyleExpanded(!styleExpanded)}
            >
              <div className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <CardTitle className="text-base">样式设置</CardTitle>
              </div>
              {styleExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          {styleExpanded && (
            <CardContent className="pt-0">
              <StylePanelComponent config={currentConfig} onChange={handleStyleChange} />
            </CardContent>
          )}
        </Card>

        {/* 导出设置 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">导出设置</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {/* 导出格式选择 */}
            <div className="space-y-1">
              <Label className="text-xs">导出格式</Label>
              <Select
                value={exportFormat}
                onValueChange={(value: 'pdf' | 'multiple' | 'collage') => setExportFormat(value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center text-xs">
                      <FileText className="mr-2 h-3 w-3" />
                      PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="multiple">
                    <div className="flex items-center text-xs">
                      <FileArchive className="mr-2 h-3 w-3" />
                      ZIP (多个文件)
                    </div>
                  </SelectItem>
                  <SelectItem value="collage">
                    <div className="flex items-center text-xs">
                      <Grid className="mr-2 h-3 w-3" />
                      拼贴图
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 展开/收起更多选项 */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center justify-between h-7"
              onClick={() => setExportExpanded(!exportExpanded)}
            >
              <span className="text-xs text-muted-foreground">更多选项</span>
              {exportExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {/* 折叠的选项 */}
            {exportExpanded && (
              <div className="space-y-3 pt-2 border-t">
                {exportFormat === 'collage' && (
                  <div className="space-y-1">
                    <Label className="text-xs">网格列数</Label>
                    <Select value={String(exportColumns)} onValueChange={(value) => setExportColumns(Number(value))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 列</SelectItem>
                        <SelectItem value="3">3 列</SelectItem>
                        <SelectItem value="4">4 列</SelectItem>
                        <SelectItem value="5">5 列</SelectItem>
                        <SelectItem value="6">6 列</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {exportFormat === 'pdf' && (
                  <div className="space-y-1">
                    <Label className="text-xs">每页显示数量</Label>
                    <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 个</SelectItem>
                        <SelectItem value="9">9 个</SelectItem>
                        <SelectItem value="12">12 个</SelectItem>
                        <SelectItem value="16">16 个</SelectItem>
                        <SelectItem value="20">20 个</SelectItem>
                        <SelectItem value="25">25 个</SelectItem>
                        <SelectItem value="30">30 个</SelectItem>
                        <SelectItem value="36">36 个</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {exportFormat === 'multiple' && (
                  <div className="space-y-1">
                    <Label className="text-xs">文件名规则</Label>
                    <input
                      type="text"
                      className="w-full h-8 px-2 border rounded bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      value={batchConfig.filenamePattern}
                      onChange={(e) =>
                        setBatchConfig({ filenamePattern: e.target.value })
                      }
                      placeholder="qr_{index}"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 导出按钮 */}
            <Button
              className="w-full"
              size="sm"
              onClick={handleExport}
              disabled={contentLines.length === 0}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              导出 {exportFormat === 'pdf' ? 'PDF' : exportFormat === 'multiple' ? 'ZIP' : '图片'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 右侧面板：预览 */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentMode === 'single' ? (
          <QRCodePreview config={currentConfig} />
        ) : (
          <BatchPreview
            config={batchConfig.globalStyle}
            columns={previewColumns}
            qrSize={previewSize}
          />
        )}
      </div>
    </div>
  );
}

function DecodeMode() {
  const [dragActive, setDragActive] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 处理拖拽
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // 处理放置
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  }, []);

  // 处理文件选择
  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    setDecoding(true);
    setError(null);
    setResult(null);

    try {
      // 读取文件为 Data URL
      const dataUrl = await fileToDataURL(file);
      setPreviewImage(dataUrl);

      // 尝试解码
      const content = await decodeQRCode(dataUrl);
      setResult(content);
    } catch (err) {
      setError('无法解析二维码，请确保图片包含有效的二维码');
      console.error('Decode error:', err);
    } finally {
      setDecoding(false);
    }
  };

  // 复制结果
  const copyResult = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 重新解析
  const reDecode = () => {
    if (previewImage) {
      setDecoding(true);
      setError(null);
      setResult(null);

      decodeQRCode(previewImage)
        .then(setResult)
        .catch((err) => {
          setError('无法解析二维码');
          console.error(err);
        })
        .finally(() => setDecoding(false));
    }
  };

  return (
    <div className="h-full flex gap-4">
      {/* 左侧：拖拽上传区域 */}
      <div className="w-[400px] flex-shrink-0">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">上传二维码图片</CardTitle>
            <CardDescription>
              拖拽图片到此处或点击选择文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 拖拽区域 */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {decoding ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3" />
                    <p className="text-sm text-muted-foreground">正在解析...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      点击或拖拽图片到这里
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      支持 PNG、JPG、GIF 格式
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* 图片预览 */}
            {previewImage && (
              <div className="mt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  图片预览
                </Label>
                <div className="border rounded-lg p-2 bg-muted/30">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="max-w-full h-auto rounded mx-auto"
                    style={{ maxHeight: '150px' }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={reDecode}
                  disabled={decoding}
                >
                  {decoding ? '解析中...' : '重新解析'}
                </Button>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 右侧：解析结果 */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">解析结果</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    解析内容
                  </Label>
                  <p className="text-sm break-all">{result}</p>
                </div>
                <Button onClick={copyResult} className="w-full" variant="outline">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      已复制到剪贴板
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      复制内容
                    </>
                  )}
                </Button>

                {/* 内容类型识别 */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">内容类型</Label>
                  {isUrl(result) ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                        URL 链接
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(result, '_blank')}
                      >
                        打开链接
                      </Button>
                    </div>
                  ) : isEmail(result) ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                        邮箱地址
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.location.href = `mailto:${result}`}
                      >
                        发送邮件
                      </Button>
                    </div>
                  ) : isPhone(result) ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded">
                        电话号码
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.location.href = `tel:${result}`}
                      >
                        拨打电话
                      </Button>
                    </div>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs rounded">
                      纯文本
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                解析结果将显示在这里
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 辅助函数：将文件转换为 Data URL
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 辅助函数：解码二维码
async function decodeQRCode(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 获取图像数据
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 使用 jsQR 解码
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        resolve(code.data);
      } else {
        reject(new Error('Cannot decode QR code'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

// 内容类型识别
function isUrl(text: string): boolean {
  return text.startsWith('http://') || text.startsWith('https://') || text.startsWith('www.');
}

function isEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

function isPhone(text: string): boolean {
  return /^[\d\+\-\(\)\s]{7,}$/.test(text);
}

// 简化的样式设置组件
function StylePanelComponent({ config, onChange }: { config: any; onChange: (config: any) => void }) {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({ logo: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    onChange({ logo: undefined });
  };

  return (
    <div className="space-y-4">
      {/* Size */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">尺寸</Label>
          <span className="text-xs text-muted-foreground">{config.width}px</span>
        </div>
        <Slider
          value={[config.width]}
          min={128}
          max={2048}
          step={64}
          onValueChange={([value]) => onChange({ width: value })}
        />
      </div>

      {/* Margin */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label className="text-xs">边距</Label>
          <span className="text-xs text-muted-foreground">{config.margin}</span>
        </div>
        <Slider
          value={[config.margin]}
          min={0}
          max={10}
          step={1}
          onValueChange={([value]) => onChange({ margin: value })}
        />
      </div>

      {/* Error Correction Level */}
      <div className="space-y-1">
        <Label className="text-xs">错误纠正等级</Label>
        <Select
          value={config.errorCorrectionLevel}
          onValueChange={(value: 'L' | 'M' | 'Q' | 'H') =>
            onChange({ errorCorrectionLevel: value })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="L">L (7%)</SelectItem>
            <SelectItem value="M">M (15%)</SelectItem>
            <SelectItem value="Q">Q (25%)</SelectItem>
            <SelectItem value="H">H (30%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker
          label="前景色"
          color={config.foregroundColor}
          onChange={(color) => onChange({ foregroundColor: color })}
        />
        <ColorPicker
          label="背景色"
          color={config.backgroundColor}
          onChange={(color) => onChange({ backgroundColor: color })}
        />
      </div>

      {/* Style */}
      <div className="space-y-1">
        <Label className="text-xs">样式风格</Label>
        <Select
          value={config.style}
          onValueChange={(value: 'square' | 'dot' | 'rounded') =>
            onChange({ style: value })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="square">方形</SelectItem>
            <SelectItem value="dot">圆点</SelectItem>
            <SelectItem value="rounded">圆角</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <Label className="text-xs">Logo 图片</Label>
        {config.logo ? (
          <div className="flex items-center gap-2">
            <img
              src={config.logo}
              alt="Logo"
              className="w-12 h-12 object-contain border rounded"
            />
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={removeLogo}>
              移除
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded p-3 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              <p className="text-xs text-muted-foreground">点击上传图片</p>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
