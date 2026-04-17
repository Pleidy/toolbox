import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  FileArchive,
  FileText,
  GripVertical,
  Grid,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Palette,
  Plus,
  RotateCcw,
  ScanLine,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { ColorPicker } from '../ui/ColorPicker';
import { Input } from '../ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';
import { useQRCodeStore } from '@/stores';
import {
  BatchConfig,
  BatchItem,
  ExportSettings,
  QRCodeConfig,
  StructuredPreviewLayout,
} from '@/types';
import { generateId } from '@/lib/utils';
import { QRCodePreview } from './QRCodePreview';
import { BatchPreview } from './BatchPreview';
import { QRCodeDecoder } from './QRCodeDecoder';
import { ExportPanel } from './ExportPanel';
import { BatchImportDialog, BatchImportResult } from './BatchImportDialog';

const PREVIEW_COLUMN_PRESETS = [2, 3, 4];
const PREVIEW_SIZE_PRESETS = [180, 240, 320];
const PREVIEW_ROW_HEIGHT_PRESETS = [360, 500, 640];

function parseContentLabel(line: string): { content: string; label: string } {
  const spaceIndex = line.indexOf(' ');
  const tabIndex = line.indexOf('\t');
  let separatorIndex = -1;

  if (spaceIndex === -1 && tabIndex === -1) {
    separatorIndex = -1;
  } else if (spaceIndex === -1) {
    separatorIndex = tabIndex;
  } else if (tabIndex === -1) {
    separatorIndex = spaceIndex;
  } else {
    separatorIndex = Math.min(spaceIndex, tabIndex);
  }

  if (separatorIndex === -1) {
    return { content: line.trim(), label: '' };
  }

  return {
    content: line.substring(0, separatorIndex).trim(),
    label: line.substring(separatorIndex + 1).trim(),
  };
}

function buildBatchItems(parsedLines: Array<{ content: string; label: string }>): BatchItem[] {
  return parsedLines.map((parsed) => ({
    id: generateId(),
    content: parsed.content,
    label: parsed.label || undefined,
    status: 'pending',
  }));
}

export function QRCodeGenerator() {
  const [activeTab, setActiveTab] = useState<'generate' | 'decode'>('generate');

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'generate' | 'decode')}>
          <TabsList className="h-12 rounded-2xl border border-border/70 bg-muted/45 p-1.5">
            <TabsTrigger value="generate" className="min-w-[132px] rounded-xl px-5 py-2 text-sm font-semibold">
              <ScanLine className="h-4 w-4 mr-2" />
              生成二维码
            </TabsTrigger>
            <TabsTrigger value="decode" className="min-w-[132px] rounded-xl px-5 py-2 text-sm font-semibold">
              <ScanLine className="h-4 w-4 mr-2" />
              解析二维码
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'generate' ? <GenerateMode /> : <QRCodeDecoder />}
      </div>
    </div>
  );
}

function GenerateMode() {
  const {
    tabs,
    activeTabId,
    addTab,
    deleteTab,
    moveTab,
    renameTab,
    setActiveTab,
    resetTabs,
    singleConfig,
    setSingleConfig,
    batchConfig,
    setBatchConfig,
    clearBatchItems,
    setBatchData,
    inputText,
    setInputText,
    autoMode,
    manualMode,
    setManualMode,
    exportSettings,
    setExportSettings,
    previewSettings,
    setPreviewSettings,
    structuredPreviewSource,
    setStructuredPreviewSource,
    generating,
    progress,
    progressLabel,
    setCancelRequested,
  } = useQRCodeStore();

  const [detectedMode, setDetectedMode] = useState<'single' | 'batch'>('single');
  const [singlePreviewDataUrl, setSinglePreviewDataUrl] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);

  const parsedLines = useMemo(
    () => inputText.split('\n').map((line) => line.trim()).filter(Boolean).map(parseContentLabel),
    [inputText]
  );

  const activeTabName = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId)?.name || '默认标签',
    [activeTabId, tabs]
  );
  const usedCount = useMemo(
    () => batchConfig.data.reduce((count, item) => count + (item.used ? 1 : 0), 0),
    [batchConfig.data]
  );
  const currentMode = autoMode ? detectedMode : manualMode;
  const currentConfig = currentMode === 'single' ? singleConfig : batchConfig.globalStyle;
  const structuredPreviewLayout = useMemo<StructuredPreviewLayout | null>(() => {
    if (currentMode !== 'batch' || !structuredPreviewSource) {
      return null;
    }

    const itemBuckets = new Map<string, typeof batchConfig.data>();
    for (const item of batchConfig.data) {
      const bucket = itemBuckets.get(item.content) || [];
      bucket.push(item);
      itemBuckets.set(item.content, bucket);
    }

    const contentUsage = new Map<string, number>();
    let sequence = 0;

    const rows = structuredPreviewSource.rows
      .map((row, rowIndex) =>
        structuredPreviewSource.selectedColumnIndexes.map((columnIndex, columnPosition) => {
          const content = row[columnIndex]?.trim() || '';
          if (!content) {
            return {
              key: `${rowIndex}-${columnPosition}`,
              sequence: null,
              content: '',
              itemId: null,
              used: false,
              empty: true,
            };
          }

          sequence += 1;
          const usedIndex = contentUsage.get(content) || 0;
          const matchedItem = itemBuckets.get(content)?.[usedIndex] || null;
          contentUsage.set(content, usedIndex + 1);

          return {
            key: `${rowIndex}-${columnPosition}`,
            sequence,
            content,
            label: matchedItem?.label,
            itemId: matchedItem?.id || null,
            used: matchedItem?.used ?? false,
            empty: false,
          };
        })
      )
      .filter((row) => row.some((cell) => !cell.empty));

    return {
      columnCount: structuredPreviewSource.selectedColumnIndexes.length,
      rows,
    };
  }, [batchConfig.data, currentMode, structuredPreviewSource]);

  useEffect(() => {
    const batchItems = buildBatchItems(parsedLines);

    if (autoMode) {
      if (parsedLines.length <= 1) {
        setDetectedMode('single');
        setBatchData([]);
        if (parsedLines.length > 0) {
          const parsed = parsedLines[0];
          setSingleConfig({ content: parsed.content, label: parsed.label || undefined });
        } else {
          setSingleConfig({ content: '', label: undefined });
        }
        return;
      }

      setDetectedMode('batch');
      setBatchData(batchItems);
      return;
    }

    if (manualMode === 'single') {
      setBatchData([]);
      if (parsedLines.length > 0) {
        const parsed = parsedLines[0];
        setSingleConfig({ content: parsed.content, label: parsed.label || undefined });
      } else {
        setSingleConfig({ content: '', label: undefined });
      }
      return;
    }

    setBatchData(batchItems);
  }, [autoMode, manualMode, parsedLines, setBatchData, setSingleConfig]);

  const handleStyleChange = (style: Partial<QRCodeConfig>) => {
    if (currentMode === 'single') {
      setSingleConfig(style);
      return;
    }

    setBatchConfig({
      globalStyle: {
        ...batchConfig.globalStyle,
        ...style,
        content: batchConfig.globalStyle.content,
      },
    });
  };

  const handleExport = () => {
    window.dispatchEvent(
      new CustomEvent('qrcode-export', {
        detail: {
          format: exportSettings.format,
          itemsPerPage: exportSettings.columns * exportSettings.rows,
          columns: exportSettings.columns,
          rows: exportSettings.rows,
        },
      })
    );
  };

  const handleDeleteTab = (id: string) => {
    if (tabs.length <= 1) return;
    const targetTab = tabs.find((tab) => tab.id === id);
    const tabName = targetTab?.name || '该标签';
    if (!window.confirm(`确定删除“${tabName}”吗？此标签内缓存将一并清除。`)) return;
    deleteTab(id);
    if (editingTabId === id) {
      setEditingTabId(null);
      setEditingTabName('');
    }
  };

  const handleStartRenameTab = (tab: { id: string; name: string }) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const handleCommitRenameTab = () => {
    if (!editingTabId) return;
    renameTab(editingTabId, editingTabName);
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleResetAllTabs = () => {
    if (!window.confirm('将清空所有二维码标签，并只保留默认标签。确定继续吗？')) return;
    resetTabs();
    setEditingTabId(null);
    setEditingTabName('');
  };

  const restoreDefault = () => {
    setInputText('https://example.com');
    clearBatchItems();
    setStructuredPreviewSource(null);
  };

  const clearInput = () => {
    setInputText('');
    clearBatchItems();
    setStructuredPreviewSource(null);
  };

  const handleCancelExport = () => {
    setCancelRequested(true);
  };

  const handleDragStart = (tabId: string) => setDraggingTabId(tabId);
  const handleDropTab = (targetTabId: string) => {
    if (!draggingTabId || draggingTabId === targetTabId) {
      setDraggingTabId(null);
      return;
    }
    moveTab(draggingTabId, targetTabId);
    setDraggingTabId(null);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 min-h-0 flex gap-4">
        {!previewSettings.largeScreen && (
        <div className="w-[460px] min-h-0 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          <Card className="border-border/70 shadow-none flex-1 min-h-0">
            <CardHeader className="pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base">输入内容</CardTitle>
                <CardDescription className="text-xs">
                  每行一条二维码内容，空格或 Tab 后的文本会作为显示标签。
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3 flex h-full min-h-0 flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/[0.16] px-3 py-2">
                <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                  <SummaryPill label="标签页" value={activeTabName} />
                  <SummaryPill label="识别数量" value={`${parsedLines.length}`} />
                  <SummaryPill label="已标记" value={`${usedCount}`} />
                </div>
              </div>

              {!autoMode && (
                <Tabs value={manualMode} onValueChange={(value) => setManualMode(value as 'single' | 'batch')}>
                  <TabsList className="h-10 rounded-xl border border-border/70 bg-muted/35 p-1">
                    <TabsTrigger value="single" className="rounded-lg px-4 py-1.5 text-xs font-semibold">单个生成</TabsTrigger>
                    <TabsTrigger value="batch" className="rounded-lg px-4 py-1.5 text-xs font-semibold">批量生成</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              <textarea
                className="w-full h-[42vh] min-h-[280px] max-h-[460px] flex-none resize-none rounded-2xl border border-border/70 bg-muted/[0.18] p-3 text-sm leading-6 focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder={`每行输入一个二维码内容。
示例：
https://example.com 订单A
https://example.com/order/2 订单B`}
                value={inputText}
                onChange={(event) => {
                  setInputText(event.target.value);
                  if (structuredPreviewSource) {
                    setStructuredPreviewSource(null);
                  }
                }}
              />

              <div className="rounded-xl border border-dashed border-border/70 bg-muted/[0.12] px-3 py-2">
                <p className="text-xs font-medium text-foreground">
                  {parsedLines.length > 0 ? `${parsedLines.length} 条内容待处理` : '尚未输入内容'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  导入文件、恢复默认和清空操作仅影响当前标签下的输入内容。
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-lg border-border/70 px-3 text-xs" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  导入文件
                </Button>
                {inputText !== 'https://example.com' && (
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={restoreDefault} title="恢复默认内容">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    恢复默认
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-8 rounded-lg border-border/70 px-3 text-xs" onClick={clearInput}>
                  清空
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-2">
            <Button
              size="sm"
              className="h-10 w-full rounded-xl text-sm font-medium"
              onClick={() => setExportDialogOpen(true)}
              disabled={parsedLines.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              导出二维码
            </Button>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2">
              <div>
                <p className="text-[11px] font-medium text-foreground">设置</p>
                <p className="text-[11px] text-muted-foreground">预览参数和样式在弹窗中调整。</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground"
                onClick={() => setSettingsDialogOpen(true)}
              >
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                设置
              </Button>
            </div>
          </div>
        </div>
        )}

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {currentMode === 'single' ? (
            <>
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">实时预览</h3>
                  <p className="text-xs text-muted-foreground">单条内容会在这里即时生成，便于快速调整样式后观察结果。</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-border/70 px-2.5 text-xs"
                  onClick={() =>
                    setPreviewSettings({ largeScreen: !previewSettings.largeScreen })
                  }
                  title={previewSettings.largeScreen ? '退出大屏展示' : '大屏展示'}
                >
                  {previewSettings.largeScreen ? (
                    <>
                      <Minimize2 className="mr-1.5 h-3.5 w-3.5" />
                      退出大屏
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                      大屏展示
                    </>
                  )}
                </Button>
              </div>
              <QRCodePreview className="flex-1" config={currentConfig} onDataUrlChange={setSinglePreviewDataUrl} />
            </>
          ) : (
            <BatchPreview
              config={batchConfig.globalStyle}
              columns={previewSettings.columns}
              qrSize={previewSettings.size}
              rowHeight={previewSettings.rowHeight}
              structuredLayout={structuredPreviewLayout}
              extraActions={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg border-border/70 px-2.5 text-xs"
                  onClick={() =>
                    setPreviewSettings({ largeScreen: !previewSettings.largeScreen })
                  }
                  title={previewSettings.largeScreen ? '退出大屏展示' : '大屏展示'}
                >
                  {previewSettings.largeScreen ? (
                    <>
                      <Minimize2 className="mr-1 h-3 w-3" />
                      <span className="text-xs">退出大屏</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-1 h-3 w-3" />
                      <span className="text-xs">大屏展示</span>
                    </>
                  )}
                </Button>
              }
            />
          )}
        </div>
      </div>

      <Card className="flex-shrink-0 border-border/70 shadow-none">
        <CardContent className="px-3 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const isEditing = tab.id === editingTabId;

              return (
                <div
                  key={tab.id}
                  draggable={!isEditing}
                  onDragStart={() => handleDragStart(tab.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDropTab(tab.id)}
                  onDragEnd={() => setDraggingTabId(null)}
                  className={`min-w-[108px] max-w-[168px] rounded-md border transition-all ${isActive ? 'bg-primary text-primary-foreground border-primary/60 shadow-sm' : 'bg-muted/45 border-border/70 hover:bg-accent/70'} ${draggingTabId === tab.id ? 'opacity-60' : ''}`}
                >
                  {isEditing ? (
                    <div className="p-1.5">
                      <Input value={editingTabName} onChange={(event) => setEditingTabName(event.target.value)} onBlur={handleCommitRenameTab} onKeyDown={(event) => {
                        if (event.key === 'Enter') handleCommitRenameTab();
                        if (event.key === 'Escape') { setEditingTabId(null); setEditingTabName(''); }
                      }} className="h-6 text-xs" autoFocus />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <GripVertical className={`h-3 w-3 cursor-grab flex-shrink-0 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
                      <button type="button" className={`flex-1 truncate text-left text-[11px] font-medium ${isActive ? 'text-primary-foreground' : 'text-foreground/80'}`} onClick={() => setActiveTab(tab.id)}>{tab.name}</button>
                      <Button variant="ghost" size="icon" className={`h-5 w-5 ${isActive ? 'hover:bg-primary-foreground/15 hover:text-primary-foreground' : ''}`} onClick={() => handleStartRenameTab(tab)} title="重命名标签"><Edit3 className="h-2.5 w-2.5" /></Button>
                      {tabs.length > 1 && <Button variant="ghost" size="icon" className={`h-5 w-5 ${isActive ? 'hover:bg-primary-foreground/15 hover:text-primary-foreground' : ''}`} onClick={() => handleDeleteTab(tab.id)} title="删除标签"><X className="h-2.5 w-2.5" /></Button>}
                    </div>
                  )}
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="h-7 rounded-md border-dashed px-2.5 text-[11px] flex-shrink-0" onClick={addTab}><Plus className="mr-1 h-3 w-3" />新建</Button>
            <Button variant="ghost" size="sm" className="h-7 rounded-md px-2.5 text-[11px] flex-shrink-0" onClick={handleResetAllTabs}><RotateCcw className="mr-1 h-3 w-3" />重置</Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
            <DialogDescription>
              预览和样式相关配置集中在这里，避免占用左侧主操作区。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentMode === 'batch' && (
              <SettingsPanelCard
                icon={<LayoutGrid className="h-4 w-4" />}
                title="预览设置"
                description="控制批量预览的密度和浏览节奏。"
              >
                <SliderBlock
                  label="每行数量"
                  value={`${previewSettings.columns}`}
                  sliderValue={previewSettings.columns}
                  min={1}
                  max={8}
                  step={1}
                  onChange={(value) => setPreviewSettings({ columns: value })}
                />
                <PresetRow
                  currentValue={previewSettings.columns}
                  values={PREVIEW_COLUMN_PRESETS}
                  onSelect={(value) => setPreviewSettings({ columns: value })}
                  renderLabel={(value) => `${value} 列`}
                />
                <SliderBlock
                  label="码尺寸"
                  value={`${previewSettings.size}px`}
                  sliderValue={previewSettings.size}
                  min={80}
                  max={250}
                  step={10}
                  onChange={(value) => setPreviewSettings({ size: value })}
                />
                <PresetRow
                  currentValue={previewSettings.size}
                  values={PREVIEW_SIZE_PRESETS}
                  onSelect={(value) => setPreviewSettings({ size: value })}
                  renderLabel={(value) => `${value}px`}
                />
                <SliderBlock
                  label="行高"
                  value={`${previewSettings.rowHeight}px`}
                  sliderValue={previewSettings.rowHeight}
                  min={100}
                  max={1000}
                  step={10}
                  onChange={(value) => setPreviewSettings({ rowHeight: value })}
                />
                <PresetRow
                  currentValue={previewSettings.rowHeight}
                  values={PREVIEW_ROW_HEIGHT_PRESETS}
                  onSelect={(value) => setPreviewSettings({ rowHeight: value })}
                  renderLabel={(value) => `${value}px`}
                />
                <div className="flex items-center justify-between rounded-xl border border-dashed border-border/70 bg-background/60 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">预览大屏展示</p>
                    <p className="text-xs text-muted-foreground">右侧工具栏也可快速切换，用于临时放大预览区域。</p>
                  </div>
                  <Switch
                    checked={previewSettings.largeScreen}
                    onCheckedChange={(enabled) => setPreviewSettings({ largeScreen: enabled })}
                  />
                </div>
              </SettingsPanelCard>
            )}

            <SettingsPanelCard
              icon={<Palette className="h-4 w-4" />}
              title="样式设置"
              description="生成尺寸、颜色、样式和 Logo 控制。"
            >
              <StylePanelComponent config={currentConfig} onChange={handleStyleChange} />
            </SettingsPanelCard>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>导出二维码</DialogTitle>
            <DialogDescription>
              导出是一个操作入口，配置在这里完成后直接开始导出。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <SettingsPanelCard
              icon={<Download className="h-4 w-4" />}
              title="导出设置"
              description="控制导出格式、布局和分包规则。"
            >
              <ExportSettingsPanel
                exportSettings={exportSettings}
                batchConfig={batchConfig}
                setExportSettings={setExportSettings}
                setBatchConfig={setBatchConfig}
              />
            </SettingsPanelCard>

            <div className="space-y-3">
              <Button className="h-9 w-full rounded-xl" size="sm" onClick={handleExport} disabled={parsedLines.length === 0 || generating}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {generating ? `导出中 ${Math.round(progress)}%` : '开始导出'}
              </Button>

              {generating && (
                <div className="space-y-2 rounded-xl border border-border/70 bg-background/65 p-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progressLabel || '正在导出...'}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-8 rounded-xl" onClick={handleCancelExport}>
                    取消导出
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExportPanel dataUrl={singlePreviewDataUrl} config={currentConfig} mode={currentMode} />
      <BatchImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={({ contents, structuredPreviewSource }: BatchImportResult) => {
          setInputText(contents.join('\n'));
          setStructuredPreviewSource(structuredPreviewSource);
        }}
      />
    </div>
  );
}

function SettingsPanelCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/[0.16] p-4">
      <div className="mb-4">
        <div className="flex items-center">
          <span className="mr-2 text-muted-foreground">{icon}</span>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SliderBlock({
  label,
  value,
  sliderValue,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: string;
  sliderValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-foreground">{value}</span>
      </div>
      <Slider value={[sliderValue]} min={min} max={max} step={step} onValueChange={([value]) => onChange(value)} />
    </div>
  );
}

function PresetRow({
  currentValue,
  values,
  onSelect,
  renderLabel,
}: {
  currentValue: number;
  values: number[];
  onSelect: (value: number) => void;
  renderLabel: (value: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Button
          key={value}
          type="button"
          variant={currentValue === value ? 'default' : 'outline'}
          size="sm"
          className="h-7 rounded-full px-3 text-[11px]"
          onClick={() => onSelect(value)}
        >
          {renderLabel(value)}
        </Button>
      ))}
    </div>
  );
}

function ExportSettingsPanel({
  exportSettings,
  batchConfig,
  setExportSettings,
  setBatchConfig,
}: {
  exportSettings: ExportSettings;
  batchConfig: BatchConfig;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setBatchConfig: (config: Partial<BatchConfig>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">导出格式</Label>
        <Select value={exportSettings.format} onValueChange={(value: 'pdf' | 'multiple' | 'collage') => setExportSettings({ format: value })}>
          <SelectTrigger className="h-9 rounded-xl border-border/70 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf"><div className="flex items-center text-xs"><FileText className="mr-2 h-3 w-3" />PDF</div></SelectItem>
            <SelectItem value="multiple"><div className="flex items-center text-xs"><FileArchive className="mr-2 h-3 w-3" />ZIP</div></SelectItem>
            <SelectItem value="collage"><div className="flex items-center text-xs"><Grid className="mr-2 h-3 w-3" />拼图</div></SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="ghost" size="sm" className="w-full flex items-center justify-between h-8 rounded-xl" onClick={() => setExportSettings({ expanded: !exportSettings.expanded })}>
        <span className="text-xs text-muted-foreground">更多选项</span>
        {exportSettings.expanded ? <span className="text-xs text-muted-foreground">收起</span> : <span className="text-xs text-muted-foreground">展开</span>}
      </Button>

      {exportSettings.expanded && (
        <div className="space-y-3 rounded-xl border border-border/70 bg-background/65 p-3">
          {exportSettings.format === 'collage' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">拼图列数</Label>
              <Select value={String(exportSettings.columns)} onValueChange={(value) => setExportSettings({ columns: Number(value) })}>
                <SelectTrigger className="h-9 rounded-xl border-border/70 text-xs"><SelectValue /></SelectTrigger>
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
            <>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">每页列数</Label>
                <Select value={String(exportSettings.columns)} onValueChange={(value) => setExportSettings({ columns: Number(value) })}>
                  <SelectTrigger className="h-9 rounded-xl border-border/70 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 列</SelectItem>
                    <SelectItem value="2">2 列</SelectItem>
                    <SelectItem value="3">3 列</SelectItem>
                    <SelectItem value="4">4 列</SelectItem>
                    <SelectItem value="5">5 列</SelectItem>
                    <SelectItem value="6">6 列</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">每页行数</Label>
                <Select value={String(exportSettings.rows)} onValueChange={(value) => setExportSettings({ rows: Number(value) })}>
                  <SelectTrigger className="h-9 rounded-xl border-border/70 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 行</SelectItem>
                    <SelectItem value="2">2 行</SelectItem>
                    <SelectItem value="3">3 行</SelectItem>
                    <SelectItem value="4">4 行</SelectItem>
                    <SelectItem value="5">5 行</SelectItem>
                    <SelectItem value="6">6 行</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                每页 {exportSettings.columns * exportSettings.rows} 个二维码
              </div>
            </>
          )}
          {exportSettings.format === 'multiple' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">文件名规则</Label>
              <input
                type="text"
                className="w-full h-9 px-3 border rounded-xl border-border/70 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={batchConfig.filenamePattern}
                onChange={(event) => setBatchConfig({ filenamePattern: event.target.value })}
                placeholder="qr_{index}"
              />
            </div>
          )}
          {exportSettings.format !== 'multiple' && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground">拆分数量阈值</Label>
              <input
                type="number"
                min="0"
                className="w-full h-9 px-3 border rounded-xl border-border/70 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={exportSettings.splitThreshold}
                onChange={(event) => setExportSettings({ splitThreshold: Math.max(0, Number(event.target.value) || 0) })}
                placeholder="0"
              />
              <div className="text-xs text-muted-foreground">0 表示不拆分。超过该数量时，将拆成多个文件并打包为 ZIP 下载。</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StylePanelComponent({ config, onChange }: { config: QRCodeConfig; onChange: (config: Partial<QRCodeConfig>) => void }) {
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => { onChange({ logo: loadEvent.target?.result as string }); };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => onChange({ logo: undefined });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between"><Label className="text-xs font-medium text-muted-foreground">尺寸</Label><span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-foreground">{config.width}px</span></div>
        <Slider value={[config.width]} min={256} max={2048} step={64} onValueChange={([value]) => onChange({ width: value })} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between"><Label className="text-xs font-medium text-muted-foreground">边距</Label><span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-foreground">{config.margin}</span></div>
        <Slider value={[config.margin]} min={0} max={10} step={1} onValueChange={([value]) => onChange({ margin: value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">纠错等级</Label>
        <Select value={config.errorCorrectionLevel} onValueChange={(value: 'L' | 'M' | 'Q' | 'H') => onChange({ errorCorrectionLevel: value })}>
          <SelectTrigger className="h-9 rounded-xl border-border/70 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="L">L (7%)</SelectItem>
            <SelectItem value="M">M (15%)</SelectItem>
            <SelectItem value="Q">Q (25%)</SelectItem>
            <SelectItem value="H">H (30%)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker label="前景色" color={config.foregroundColor} onChange={(color) => onChange({ foregroundColor: color })} />
        <ColorPicker label="背景色" color={config.backgroundColor} onChange={(color) => onChange({ backgroundColor: color })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">样式风格</Label>
        <Select value={config.style} onValueChange={(value: 'square' | 'dot' | 'rounded') => onChange({ style: value })}>
          <SelectTrigger className="h-9 rounded-xl border-border/70 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="square">方形</SelectItem>
            <SelectItem value="dot">圆点</SelectItem>
            <SelectItem value="rounded">圆角</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Logo 图片</Label>
        {config.logo ? (
          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/65 p-3">
            <div className="flex items-center gap-3">
              <img src={config.logo} alt="Logo" className="w-12 h-12 object-contain border border-border/70 rounded-lg" />
              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={removeLogo}>移除 Logo</Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label className="text-xs font-medium text-muted-foreground">Logo 比例</Label><span className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] text-foreground">{Math.round((config.logoWidth || 0.2) * 100)}%</span></div>
              <Slider value={[config.logoWidth || 0.2]} min={0.1} max={0.3} step={0.05} onValueChange={([value]) => onChange({ logoWidth: value })} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-border/70 bg-background/65 p-4 text-center">
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
            <label htmlFor="logo-upload" className="cursor-pointer"><p className="text-sm font-medium text-foreground">点击上传图片</p><p className="mt-1 text-xs text-muted-foreground">建议使用透明背景 Logo，显示更清晰。</p></label>
          </div>
        )}
      </div>
    </div>
  );
}
