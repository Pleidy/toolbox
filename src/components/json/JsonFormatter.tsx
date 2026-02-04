import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Copy, Trash2, Type, ArrowDownUp, FileJson, Plus, X } from "lucide-react";
import { JsonRenderer } from "./JsonRenderer";

interface JsonTab {
  id: string;
  name: string;
  input: string;
  fontSize: number;
}

const createId = () => Math.random().toString(36).substring(2, 9);

function tryParseJson(input: string): { success: boolean; data?: unknown; error?: string } {
  if (!input.trim()) return { success: false, error: "" };

  try {
    const parsed = JSON.parse(input);
    return { success: true, data: parsed };
  } catch (e) {
    const error = e as Error;
    let errorMessage = error.message;

    // Extract position information if available
    const positionMatch = errorMessage.match(/position (\d+)/);
    if (positionMatch) {
      const position = parseInt(positionMatch[1], 10);
      const lines = input.substring(0, position).split('\n');
      const line = lines.length;
      const column = lines[lines.length - 1].length + 1;
      errorMessage = `${errorMessage} (行 ${line}, 列 ${column})`;
    }

    return { success: false, error: errorMessage };
  }
}

export function JsonFormatter() {
  const [tabs, setTabs] = useState<JsonTab[]>([
    { id: createId(), name: "标签 1", input: "", fontSize: 13 }
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
    updateActiveTab({ input: "" });
  }, [updateActiveTab]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const size = parseInt(e.target.value, 10);
    if (size >= 10 && size <= 24) updateActiveTab({ fontSize: size });
  }, [updateActiveTab]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleFormat(); }
    if (e.ctrlKey && e.key === "a") { e.preventDefault(); (e.target as HTMLTextAreaElement).select(); }
  }, [handleFormat]);

  // 粘贴时自动格式化 JSON
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText.trim()) return;

    try {
      const parsed = JSON.parse(pastedText);
      const formatted = JSON.stringify(parsed, null, 2);
      e.preventDefault();
      updateActiveTab({ input: formatted });
    } catch {
      // 不是有效 JSON，使用默认粘贴行为
    }
  }, [updateActiveTab]);

  const addTab = useCallback(() => {
    const newTab: JsonTab = { id: createId(), name: "标签 " + (tabs.length + 1), input: "", fontSize: activeTab.fontSize };
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
      <div className="flex-1 flex gap-2 p-1 overflow-hidden">
        <Card className="w-[40%] flex-shrink-0 flex flex-col min-w-0">
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
            <textarea
              value={activeTab.input}
              onChange={(e) => updateActiveTab({ input: e.target.value })}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="w-full h-full resize-none border rounded p-1.5 font-mono text-xs bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ fontSize: activeTab.fontSize, lineHeight: "1.3" }}
              placeholder="在此粘贴 JSON..."
            />
          </CardContent>
          <CardFooter className="flex-shrink-0 py-1 px-2 border-t">
            <div className="flex items-center gap-0.5 overflow-x-auto">
              {tabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTabId(tab.id)}
                  className={"flex items-center gap-0.5 px-2 py-0.5 text-xs rounded transition-colors " + (tab.id === activeTabId ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
                >
                  <span className="truncate max-w-[60px]">{tab.name}</span>
                  <X className="w-2.5 h-2.5 hover:text-destructive cursor-pointer opacity-60 hover:opacity-100" onClick={(e) => closeTab(e, tab.id)} />
                </button>
              ))}
              <button onClick={addTab} className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </CardFooter>
        </Card>

        <Card className="w-[60%] flex-shrink-0 flex flex-col min-w-0">
          <CardHeader className="flex-shrink-0 py-1 px-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1">
                <ArrowDownUp className="w-3 h-3" />结果
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 py-0 px-0 overflow-auto">
            {parseResult.success ? (
              <div style={{ fontSize: activeTab.fontSize }} className="h-full">
                <JsonRenderer data={parseResult.data as object} />
              </div>
            ) : parseResult.error ? (
              <div className="p-2">
                <div className="text-destructive text-xs font-semibold mb-1">JSON 解析错误</div>
                <div className="text-destructive text-xs bg-destructive/10 p-2 rounded border border-destructive/20">
                  {parseResult.error}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs p-2">结果将显示在这里...</div>
            )}
          </CardContent>
          <CardFooter className="flex-shrink-0 py-1 px-2 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-3 h-3 text-muted-foreground" />
              <Input
                type="number"
                value={activeTab.fontSize}
                onChange={handleFontSizeChange}
                className="h-6 w-16 text-xs"
                min={10}
                max={24}
              />
            </div>
            <div className="text-[10px] text-muted-foreground">
              {parseResult.success ? "✓ 有效 JSON" : parseResult.error ? "✗ 格式错误" : "等待输入..."}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
