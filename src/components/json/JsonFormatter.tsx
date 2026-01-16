import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import JsonView from "@uiw/react-json-view";
import { Copy, Trash2, Type, ArrowDownUp, FileJson, Plus, X } from "lucide-react";

interface JsonTab {
  id: string;
  name: string;
  input: string;
  collapsed: boolean;
  fontSize: number;
}

const createId = () => Math.random().toString(36).substring(2, 9);

function tryParseJson(input: string): { success: boolean; data?: unknown; error?: string } {
  if (!input.trim()) return { success: false, error: "Empty input" };
  try {
    return { success: true, data: JSON.parse(input) };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export function JsonFormatter() {
  const [tabs, setTabs] = useState<JsonTab[]>([
    { id: createId(), name: "标签 1", input: "", collapsed: false, fontSize: 13 }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = useCallback((updates: Partial<JsonTab>) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  }, [activeTabId]);

  const parseResult = tryParseJson(activeTab.input);

  const handleFormat = useCallback(() => {
    if (!activeTab.input.trim()) { updateActiveTab({ input: "" }); return; }
    try { updateActiveTab({ input: JSON.stringify(JSON.parse(activeTab.input), null, 2) }); } catch (e) {}
  }, [activeTab.input, updateActiveTab]);

  const handleCompress = useCallback(() => {
    if (!activeTab.input.trim()) { updateActiveTab({ input: "" }); return; }
    try { updateActiveTab({ input: JSON.stringify(JSON.parse(activeTab.input)) }); } catch (e) {}
  }, [activeTab.input, updateActiveTab]);

  const handleCopy = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch (e) {}
  }, []);

  const handleClear = useCallback(() => {
    updateActiveTab({ input: "", collapsed: false });
  }, [updateActiveTab]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    if (size >= 10 && size <= 24) updateActiveTab({ fontSize: size });
  }, [updateActiveTab]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleFormat(); }
    if (e.ctrlKey && e.key === "a") { e.preventDefault(); (e.target as HTMLTextAreaElement).select(); }
  }, [handleFormat]);

  const handleToggleCollapse = useCallback(() => {
    updateActiveTab({ collapsed: !activeTab.collapsed });
  }, [activeTab.collapsed, updateActiveTab]);

  const addTab = useCallback(() => {
    const newTab: JsonTab = { id: createId(), name: "标签 " + (tabs.length + 1), input: "", collapsed: false, fontSize: activeTab.fontSize };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length, activeTab.fontSize]);

  const closeTab = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) setActiveTabId(newTabs[0].id);
  }, [tabs, activeTabId]);

  return (
    <div className="flex flex-col h-full">
      <style>{`
        /* 全局覆盖所有可能的斜体样式 */
        .react-json-view,
        .react-json-view *,
        .react-json-view *::before,
        .react-json-view *::after {
          font-style: normal !important;
          font-style: normal !important;
          font-style: normal !important;
        }
        
        /* 强制覆盖所有字体样式 */
        .react-json-view span {
          font-style: normal !important;
        }
        
        /* 覆盖字符串和值 */
        [class*="react-json-view"] span {
          font-style: normal !important;
        }
      `}</style>
      <div className="flex-1 flex gap-2 p-1 overflow-hidden">
        <Card className="flex-1 flex flex-col min-w-0">
          <CardHeader className="flex-shrink-0 py-1 px-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1">
                <FileJson className="w-3 h-3" />输入<span className="text-muted-foreground text-[10px]">{activeTab.input.length}</span>
              </CardTitle>
              <div className="flex items-center gap-0.5">
                <Button variant="outline" size="sm" onClick={handleFormat} className="h-5 px-1.5 text-[10px]">格式化</Button>
                <Button variant="outline" size="sm" onClick={handleCompress} className="h-5 px-1.5 text-[10px]">压缩</Button>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(activeTab.input)} className="h-5 px-1.5 text-[10px]"><Copy className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-5 px-1.5 text-[10px]"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 py-0 px-1">
            <textarea value={activeTab.input} onChange={(e) => updateActiveTab({ input: e.target.value })} onKeyDown={handleKeyDown}
              className="w-full h-full resize-none border rounded p-1.5 font-mono text-xs bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: activeTab.fontSize, lineHeight: "1.3" }} placeholder="在此粘贴 JSON..." />
          </CardContent>
          <CardFooter className="flex-shrink-0 py-1 px-2 border-t">
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTabId(tab.id)}
                  className={"flex items-center gap-0.5 px-2 py-0.5 text-xs rounded transition-colors " + (tab.id === activeTabId ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
                  <span className="truncate max-w-[60px]">{tab.name}</span>
                  <X className="w-2.5 h-2.5 hover:text-destructive cursor-pointer opacity-60 hover:opacity-100" onClick={(e) => closeTab(e, tab.id)} />
                </button>
              ))}
              <button onClick={addTab} className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted transition-colors"><Plus className="w-3 h-3" /></button>
            </div>
          </CardFooter>
        </Card>

        <Card className="flex-1 flex flex-col min-w-0">
          <CardHeader className="flex-shrink-0 py-1 px-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1"><ArrowDownUp className="w-3 h-3" />结果</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleToggleCollapse} className="h-5 px-1.5 text-[10px]">{activeTab.collapsed ? "展开" : "折叠"}</Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 py-0 px-1 overflow-auto">
            {parseResult.success ? (
              <div style={{ fontSize: activeTab.fontSize }}>
                <JsonView value={parseResult.data as object} collapsed={activeTab.collapsed}
                  displayDataTypes={false}
                  style={{ fontSize: activeTab.fontSize + "px", lineHeight: "1.4", "--rjv-key-string": "normal", "--rjv-quotes": "normal" } as React.CSSProperties} />
              </div>
            ) : parseResult.error ? (
              <div className="text-destructive text-xs p-2">Error: {parseResult.error}</div>
            ) : (
              <div className="text-muted-foreground text-xs p-2">结果将显示在这里...</div>
            )}
          </CardContent>
          <CardFooter className="flex-shrink-0 py-1 px-2 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-3 h-3 text-muted-foreground" />
              <Input type="range" min="10" max="24" value={activeTab.fontSize} onChange={handleFontSizeChange} className="w-20 h-5" />
              <span className="text-[10px] text-muted-foreground w-5">{activeTab.fontSize}</span>
            </div>
            <span className="text-[10px] text-muted-foreground"><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>+Enter 格式化</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default JsonFormatter;
