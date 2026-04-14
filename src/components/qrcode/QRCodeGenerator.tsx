import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileArchive,
  FileText,
  GripVertical,
  Grid,
  LayoutGrid,
  Plus,
  RotateCcw,
  ScanLine,
  Settings,
  Upload,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { ColorPicker } from '../ui/ColorPicker';
import { Input } from '../ui/Input';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';
import { useQRCodeStore } from '@/stores';
import { BatchItem, QRCodeConfig } from '@/types';
import { generateId } from '@/lib/utils';
import { QRCodePreview } from './QRCodePreview';
import { BatchPreview } from './BatchPreview';
import { QRCodeDecoder } from './QRCodeDecoder';
import { ExportPanel } from './ExportPanel';
import { BatchImportDialog } from './BatchImportDialog';

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
          <TabsList className="h-10">
            <TabsTrigger value="generate" className="px-4">
              <ScanLine className="h-4 w-4 mr-2" />
              生成二维码
            </TabsTrigger>
            <TabsTrigger value="decode" className="px-4">
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
    setAutoMode,
    manualMode,
    setManualMode,
    exportSettings,
    setExportSettings,
    previewSettings,
    setPreviewSettings,
    generating,
    progress,
    progressLabel,
    setCancelRequested,
  } = useQRCodeStore();

  const [detectedMode, setDetectedMode] = useState<'single' | 'batch'>('single');
  const [singlePreviewDataUrl, setSinglePreviewDataUrl] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const parsedLines = useMemo(
    () => inputText.split('\n').map((line) => line.trim()).filter(Boolean).map(parseContentLabel),
    [inputText]
  );

  const currentMode = autoMode ? detectedMode : manualMode;
  const currentConfig = currentMode === 'single' ? singleConfig : batchConfig.globalStyle;

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
  };

  const clearInput = () => {
    setInputText('');
    clearBatchItems();
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
    <div className="h-full flex flex-col gap-3">
      <div className="flex-1 min-h-0 flex gap-4">
        <div className="w-[500px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">输入内容</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="auto-mode" className="text-xs">自动识别</Label>
                  <Switch id="auto-mode" checked={autoMode} onCheckedChange={setAutoMode} className="scale-75" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {autoMode && (
                  <div className={`text-xs px-2 py-1.5 rounded ${currentMode === 'batch' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                    {currentMode === 'batch' ? `检测到 ${parsedLines.length} 个内容，将进行批量生成` : '检测到单个内容，将进行单个生成'}
                  </div>
                )}

                {!autoMode && (
                  <Tabs value={manualMode} onValueChange={(value) => setManualMode(value as 'single' | 'batch')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="single" className="text-xs px-3 py-1">单个</TabsTrigger>
                      <TabsTrigger value="batch" className="text-xs px-3 py-1">批量</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                <div className="space-y-2">
                  <textarea
                    className="w-full h-40 p-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    placeholder="每行一个二维码内容，空格或 Tab 后面的文本会作为标签。"
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{parsedLines.length} 个二维码</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setImportDialogOpen(true)}>
                        <Upload className="mr-1 h-3 w-3" />导入文件
                      </Button>
                      {inputText !== 'https://example.com' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={restoreDefault} title="恢复默认内容">
                          <RotateCcw className="mr-1 h-3 w-3" />恢复默认
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearInput}>清空</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Button variant="ghost" className="w-full flex items-center justify-between p-0 hover:bg-transparent h-auto" onClick={() => setSettingsExpanded((expanded) => !expanded)}>
                <div className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span className="text-base font-semibold">设置</span>
                </div>
                {settingsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CardHeader>
          </Card>
          {settingsExpanded && currentMode === 'batch' && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center"><LayoutGrid className="mr-2 h-4 w-4" /><CardTitle className="text-base">预览设置</CardTitle></div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between"><Label className="text-xs">每行数量</Label><span className="text-xs text-muted-foreground">{previewSettings.columns}</span></div>
                  <Slider value={[previewSettings.columns]} min={1} max={8} step={1} onValueChange={([value]) => setPreviewSettings({ columns: value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><Label className="text-xs">码尺寸</Label><span className="text-xs text-muted-foreground">{previewSettings.size}px</span></div>
                  <Slider value={[previewSettings.size]} min={80} max={250} step={10} onValueChange={([value]) => setPreviewSettings({ size: value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><Label className="text-xs">行高</Label><span className="text-xs text-muted-foreground">{previewSettings.rowHeight}px</span></div>
                  <Slider value={[previewSettings.rowHeight]} min={100} max={1000} step={10} onValueChange={([value]) => setPreviewSettings({ rowHeight: value })} />
                </div>
              </CardContent>
            </Card>
          )}

          {settingsExpanded && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center"><Settings className="mr-2 h-4 w-4" /><CardTitle className="text-base">样式设置</CardTitle></div>
              </CardHeader>
              <CardContent className="pt-0">
                <StylePanelComponent config={currentConfig} onChange={handleStyleChange} />
              </CardContent>
            </Card>
          )}

          {settingsExpanded && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">导出设置</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">导出格式</Label>
                  <Select value={exportSettings.format} onValueChange={(value: 'pdf' | 'multiple' | 'collage') => setExportSettings({ format: value })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf"><div className="flex items-center text-xs"><FileText className="mr-2 h-3 w-3" />PDF</div></SelectItem>
                      <SelectItem value="multiple"><div className="flex items-center text-xs"><FileArchive className="mr-2 h-3 w-3" />ZIP</div></SelectItem>
                      <SelectItem value="collage"><div className="flex items-center text-xs"><Grid className="mr-2 h-3 w-3" />拼图</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="ghost" size="sm" className="w-full flex items-center justify-between h-7" onClick={() => setExportSettings({ expanded: !exportSettings.expanded })}>
                  <span className="text-xs text-muted-foreground">更多选项</span>
                  {exportSettings.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>

                {exportSettings.expanded && (
                  <div className="space-y-3 pt-2 border-t">
                    {exportSettings.format === 'collage' && (
                      <div className="space-y-1">
                        <Label className="text-xs">拼图列数</Label>
                        <Select value={String(exportSettings.columns)} onValueChange={(value) => setExportSettings({ columns: Number(value) })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                          <Label className="text-xs">每页列数</Label>
                          <Select value={String(exportSettings.columns)} onValueChange={(value) => setExportSettings({ columns: Number(value) })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                          <Label className="text-xs">每页行数</Label>
                          <Select value={String(exportSettings.rows)} onValueChange={(value) => setExportSettings({ rows: Number(value) })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                        <div className="text-xs text-muted-foreground">每页 {exportSettings.columns * exportSettings.rows} 个二维码</div>
                      </>
                    )}
                    {exportSettings.format === 'multiple' && (
                      <div className="space-y-1">
                        <Label className="text-xs">文件名规则</Label>
                        <input type="text" className="w-full h-8 px-2 border rounded bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" value={batchConfig.filenamePattern} onChange={(event) => setBatchConfig({ filenamePattern: event.target.value })} placeholder="qr_{index}" />
                      </div>
                    )}
                    {exportSettings.format !== 'multiple' && (
                      <div className="space-y-1">
                        <Label className="text-xs">拆分数量阈值</Label>
                        <input type="number" min="0" className="w-full h-8 px-2 border rounded bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring" value={exportSettings.splitThreshold} onChange={(event) => setExportSettings({ splitThreshold: Math.max(0, Number(event.target.value) || 0) })} placeholder="0" />
                        <div className="text-xs text-muted-foreground">0 表示不拆分。超过该数量时，将拆成多个文件并打包为 ZIP 下载。</div>
                      </div>
                    )}
                  </div>
                )}

                <Button className="w-full" size="sm" onClick={handleExport} disabled={parsedLines.length === 0 || generating}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {generating ? `导出中 ${Math.round(progress)}%` : '导出'}
                </Button>

                {generating && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progressLabel || '正在导出...'}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleCancelExport}>取消导出</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {currentMode === 'single' ? (
            <QRCodePreview config={currentConfig} onDataUrlChange={setSinglePreviewDataUrl} />
          ) : (
            <BatchPreview config={batchConfig.globalStyle} columns={previewSettings.columns} qrSize={previewSettings.size} rowHeight={previewSettings.rowHeight} />
          )}
        </div>
      </div>

      <Card className="flex-shrink-0">
        <CardContent className="px-2 py-1">
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
                  className={`rounded-t-md border border-b-0 min-w-[120px] max-w-[180px] ${isActive ? 'bg-primary/12 border-primary/40 shadow-sm' : 'bg-muted/50'} ${draggingTabId === tab.id ? 'opacity-60' : ''}`}
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
                      <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab flex-shrink-0" />
                      <button type="button" className={`flex-1 truncate text-left text-[11px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} onClick={() => setActiveTab(tab.id)}>{tab.name}</button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleStartRenameTab(tab)} title="重命名标签"><Edit3 className="h-2.5 w-2.5" /></Button>
                      {tabs.length > 1 && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDeleteTab(tab.id)} title="删除标签"><X className="h-2.5 w-2.5" /></Button>}
                    </div>
                  )}
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="h-7 text-[11px] flex-shrink-0 px-2.5" onClick={addTab}><Plus className="mr-1 h-3 w-3" />新建</Button>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] flex-shrink-0 px-2.5" onClick={handleResetAllTabs}><RotateCcw className="mr-1 h-3 w-3" />重置</Button>
          </div>
        </CardContent>
      </Card>

      <ExportPanel dataUrl={singlePreviewDataUrl} config={currentConfig} mode={currentMode} />
      <BatchImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onImport={(contents) => setInputText(contents.join('\n'))} />
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
        <div className="flex justify-between"><Label className="text-xs">尺寸</Label><span className="text-xs text-muted-foreground">{config.width}px</span></div>
        <Slider value={[config.width]} min={256} max={2048} step={64} onValueChange={([value]) => onChange({ width: value })} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between"><Label className="text-xs">边距</Label><span className="text-xs text-muted-foreground">{config.margin}</span></div>
        <Slider value={[config.margin]} min={0} max={10} step={1} onValueChange={([value]) => onChange({ margin: value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">纠错等级</Label>
        <Select value={config.errorCorrectionLevel} onValueChange={(value: 'L' | 'M' | 'Q' | 'H') => onChange({ errorCorrectionLevel: value })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
        <Label className="text-xs">样式风格</Label>
        <Select value={config.style} onValueChange={(value: 'square' | 'dot' | 'rounded') => onChange({ style: value })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="square">方形</SelectItem>
            <SelectItem value="dot">圆点</SelectItem>
            <SelectItem value="rounded">圆角</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Logo 图片</Label>
        {config.logo ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <img src={config.logo} alt="Logo" className="w-12 h-12 object-contain border rounded" />
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={removeLogo}>移除</Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><Label className="text-xs">Logo 比例</Label><span className="text-xs text-muted-foreground">{Math.round((config.logoWidth || 0.2) * 100)}%</span></div>
              <Slider value={[config.logoWidth || 0.2]} min={0.1} max={0.3} step={0.05} onValueChange={([value]) => onChange({ logoWidth: value })} />
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded p-3 text-center">
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
            <label htmlFor="logo-upload" className="cursor-pointer"><p className="text-xs text-muted-foreground">点击上传图片</p></label>
          </div>
        )}
      </div>
    </div>
  );
}
