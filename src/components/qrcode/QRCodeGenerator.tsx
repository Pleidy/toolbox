import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { ColorPicker } from '../ui/ColorPicker';
import { ChevronDown, ChevronUp, Download, FileText, FileArchive, Grid, Settings, LayoutGrid, RotateCcw } from 'lucide-react';
import { useQRCodeStore } from '@/stores';
import { QRCodePreview } from './QRCodePreview';
import { BatchPreview } from './BatchPreview';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';

export function QRCodeGenerator() {
  return <GenerateMode />;
}

function GenerateMode() {
  // 从 store 读取所有持久化状态
  const {
    singleConfig, setSingleConfig,
    batchConfig, setBatchConfig, addBatchItem, clearBatchItems,
    inputText, setInputText,
    autoMode, setAutoMode,
    manualMode, setManualMode,
    exportSettings, setExportSettings,
    previewSettings, setPreviewSettings,
  } = useQRCodeStore();

  // 从 localStorage 恢复上次的内容
  // 注意: inputText 现在从 store 的 persist 中恢复，不再需要手动 localStorage 读取

  // 解析输入的内容列表 (使用 useMemo 避免不必要的重新计算)
  const contentLines = useMemo(() => {
    return inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, [inputText]);

  // 自动检测模式
  const [detectedMode, setDetectedMode] = useState<'single' | 'batch'>('single');

  // 样式设置展开状态 (纯 UI 状态，不需要持久化)
  const [styleExpanded, setStyleExpanded] = useState(false);

  // 使用 ref 追踪上一次的输入，避免不必要的重新同步
  const prevInputTextRef = useRef<string>(inputText);
  const isInitialMountRef = useRef(true);

  // 解析输入内容并同步到批量数据
  useEffect(() => {
    const lines = contentLines;

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
  }, [inputText, autoMode, batchConfig.data, addBatchItem, clearBatchItems, contentLines]);

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
        format: exportSettings.format,
        itemsPerPage: exportSettings.itemsPerPage,
        columns: exportSettings.columns,
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
                  <span className="text-xs text-muted-foreground">{previewSettings.columns} 个</span>
                </div>
                <Slider
                  value={[previewSettings.columns]}
                  min={2}
                  max={8}
                  step={1}
                  onValueChange={([value]) => setPreviewSettings({ columns: value })}
                />
              </div>

              {/* 码尺寸 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">码尺寸</Label>
                  <span className="text-xs text-muted-foreground">{previewSettings.size}px</span>
                </div>
                <Slider
                  value={[previewSettings.size]}
                  min={80}
                  max={250}
                  step={10}
                  onValueChange={([value]) => setPreviewSettings({ size: value })}
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
                value={exportSettings.format}
                onValueChange={(value: 'pdf' | 'multiple' | 'collage') => setExportSettings({ format: value })}
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
              onClick={() => setExportSettings({ expanded: !exportSettings.expanded })}
            >
              <span className="text-xs text-muted-foreground">更多选项</span>
              {exportSettings.expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>

            {/* 折叠的选项 */}
            {exportSettings.expanded && (
              <div className="space-y-3 pt-2 border-t">
                {exportSettings.format === 'collage' && (
                  <div className="space-y-1">
                    <Label className="text-xs">网格列数</Label>
                    <Select value={String(exportSettings.columns)} onValueChange={(value) => setExportSettings({ columns: Number(value) })}>
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

                {exportSettings.format === 'pdf' && (
                  <div className="space-y-1">
                    <Label className="text-xs">每页显示数量</Label>
                    <Select value={String(exportSettings.itemsPerPage)} onValueChange={(value) => setExportSettings({ itemsPerPage: Number(value) })}>
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

                {exportSettings.format === 'multiple' && (
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
              导出 {exportSettings.format === 'pdf' ? 'PDF' : exportSettings.format === 'multiple' ? 'ZIP' : '图片'}
            </Button>
          </CardContent>
        </Card>
      </div>

        {/* 右侧面板：预览 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {currentMode === 'single' ? (
            <QRCodePreview config={currentConfig} />
          ) : (
            <BatchPreview
              config={batchConfig.globalStyle}
              columns={previewSettings.columns}
              qrSize={previewSettings.size}
            />
          )}
        </div>
    </div>
  );
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
          min={256}
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
