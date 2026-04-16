import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Copy } from "lucide-react";
import { useEncoderStore } from "@/stores/useEncoderStore";
import { WorkspaceTabs } from "@/components/ui/WorkspaceTabs";

// 编码操作配置
type EncodingMode = 'encode' | 'decode';

const URL_ACTIONS: { mode: EncodingMode; label: string }[] = [
  { mode: 'encode', label: 'URL 编码' },
  { mode: 'decode', label: 'URL 解码' },
];

const BASE64_ACTIONS: { mode: EncodingMode; label: string }[] = [
  { mode: 'encode', label: 'Base64 编码' },
  { mode: 'decode', label: 'Base64 解码' },
];

const UNICODE_ACTIONS: { mode: EncodingMode; label: string }[] = [
  { mode: 'encode', label: 'Unicode 编码' },
  { mode: 'decode', label: 'Unicode 解码' },
];

export function Encoder() {
  const tabs = useEncoderStore(state => state.tabs);
  const activeTabId = useEncoderStore(state => state.activeTabId);
  const addTab = useEncoderStore(state => state.addTab);
  const closeTab = useEncoderStore(state => state.closeTab);
  const renameTab = useEncoderStore(state => state.renameTab);
  const moveTab = useEncoderStore(state => state.moveTab);
  const setActiveTab = useEncoderStore(state => state.setActiveTab);
  const updateTab = useEncoderStore(state => state.updateTab);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const encodeUrl = (input: string) => encodeURIComponent(input);
  const decodeUrl = (input: string) => decodeURIComponent(input);

  const encodeBase64 = (input: string) => btoa(unescape(encodeURIComponent(input)));
  const decodeBase64 = (input: string) => decodeURIComponent(escape(atob(input)));

  const encodeUnicode = (input: string) => {
    let result = '';
    for (let i = 0; i < input.length; i++) {
      result += '\\u' + input.charCodeAt(i).toString(16).padStart(4, '0');
    }
    return result;
  };

  const decodeUnicode = (input: string) => {
    return input.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  };

  const handleActionChange = (type: 'url' | 'base64' | 'unicode', mode: 'encode' | 'decode') => {
    if (activeTab) {
      updateTab(activeTab.id, { encodingType: type, mode });
      handleInputChange(activeTab.input, type, mode);
    }
  };

  const handleInputChange = (input: string, type?: 'url' | 'base64' | 'unicode', mode?: 'encode' | 'decode') => {
    if (!activeTab) return;
    const encodingType = type || activeTab.encodingType;
    const encodeMode = mode || activeTab.mode;

    let output = "";
    try {
      if (encodeMode === 'encode') {
        switch (encodingType) {
          case 'url': output = encodeUrl(input); break;
          case 'base64': output = encodeBase64(input); break;
          case 'unicode': output = encodeUnicode(input); break;
        }
      } else {
        switch (encodingType) {
          case 'url':
            // 自动循环解码，最多尝试 5 次
            let decoded = input;
            for (let i = 0; i < 5; i++) {
              try {
                const next = decodeUrl(decoded);
                if (next === decoded) break; // 相同则停止
                decoded = next;
              } catch {
                break;
              }
            }
            output = decoded;
            break;
          case 'base64': output = decodeBase64(input); break;
          case 'unicode': output = decodeUnicode(input); break;
        }
      }
    } catch (e) {
      output = "Error: " + (e as Error).message;
    }
    updateTab(activeTab.id, { input, output });
  };

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {}
  }, []);

  const handleClear = useCallback(() => {
    if (activeTab) updateTab(activeTab.id, { input: "", output: "" });
  }, [updateTab, activeTab]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 p-2 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          {/* 操作按钮组 - 按类型分组 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* URL 组 - 蓝色 */}
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950">
              {URL_ACTIONS.map((action) => {
                const isActive = activeTab?.encodingType === 'url' && activeTab?.mode === action.mode;
                return (
                  <Button
                    key={`url-${action.mode}`}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleActionChange('url', action.mode)}
                    className="h-7 px-2 text-xs"
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
            {/* Base64 组 - 绿色 */}
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 dark:bg-green-950">
              {BASE64_ACTIONS.map((action) => {
                const isActive = activeTab?.encodingType === 'base64' && activeTab?.mode === action.mode;
                return (
                  <Button
                    key={`base64-${action.mode}`}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleActionChange('base64', action.mode)}
                    className="h-7 px-2 text-xs"
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
            {/* Unicode 组 - 紫色 */}
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 dark:bg-purple-950">
              {UNICODE_ACTIONS.map((action) => {
                const isActive = activeTab?.encodingType === 'unicode' && activeTab?.mode === action.mode;
                return (
                  <Button
                    key={`unicode-${action.mode}`}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleActionChange('unicode', action.mode)}
                    className="h-7 px-2 text-xs"
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-8 px-2 text-xs"
            >
              清空
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleCopy(activeTab?.output || "")}
              className="h-8 px-2 text-xs"
              disabled={!activeTab?.output}
            >
              <Copy className="w-3 h-3 mr-1" />复制
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区 - 上下布局 */}
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden">
        {/* 输入框 */}
        <Card className="flex-shrink-0" style={{ height: '40%' }}>
          <CardContent className="p-2 h-full">
            <textarea
              value={activeTab?.input || ""}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full h-full resize-none border rounded p-2 font-mono text-sm bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="在此输入要转换的内容..."
            />
          </CardContent>
        </Card>

        {/* 输出框 */}
        <Card className="flex-1 flex-shrink-0">
          <CardContent className="p-2 h-full">
            <textarea
              value={activeTab?.output || ""}
              readOnly
              className="w-full h-full resize-none border rounded p-2 font-mono text-sm bg-muted/30"
              placeholder="转换结果..."
            />
          </CardContent>
        </Card>
      </div>

      <WorkspaceTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onAdd={addTab}
        onSelect={setActiveTab}
        onRename={renameTab}
        onDelete={closeTab}
        onMove={moveTab}
        addLabel="新建"
      />
    </div>
  );
}
