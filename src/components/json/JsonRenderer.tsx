import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Copy } from "lucide-react";

interface JsonRendererProps {
  data: unknown;
  fontSize?: number;
}

// 折叠状态管理
type CollapsedState = Record<string, boolean>;

// 行数据结构
interface LineData {
  lineNumber: number;        // 原始行号（不变）
  content: React.ReactNode;  // 行内容
  path?: string;             // 可折叠节点的路径
  isExpandable?: boolean;    // 是否可折叠
  isCollapsed?: boolean;     // 当前是否折叠
  skippedLines?: number;     // 折叠时跳过的行数
}

// 渲染 JSON 值
function renderValue(value: unknown): React.ReactNode {
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
  if (typeof value === "boolean") return <span className="text-purple-600 dark:text-purple-400">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>;
  if (typeof value === "string") return <span className="text-green-600 dark:text-green-400">"{value}"</span>;
  return null;
}

// 计算节点展开时的总行数
function countLines(data: unknown): number {
  if (typeof data !== "object" || data === null) return 1;
  const isArray = Array.isArray(data);
  const entries = isArray ? data : Object.values(data);
  let count = 2; // 开始行 + 结束行
  for (const entry of entries) {
    count += countLines(entry);
  }
  return count;
}

// 递归生成行数据
function generateLines(
  data: unknown,
  collapsedState: CollapsedState,
  lineCounter: { current: number },
  name?: string | number,
  depth: number = 0,
  path: string = "root",
  isLast: boolean = true
): LineData[] {
  const lines: LineData[] = [];
  const indent = depth * 16;
  const isCollapsed = collapsedState[path] ?? false;
  const displayName = name !== undefined
    ? <><span className="text-foreground">"</span><span className="text-black dark:text-foreground">{String(name)}</span><span className="text-foreground">"</span><span className="text-foreground">: </span></>
    : null;
  const comma = isLast ? "" : ",";

  const isObject = typeof data === "object" && data !== null && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isExpandable = isObject || isArray;

  if (!isExpandable) {
    // 简单值行
    lines.push({
      lineNumber: lineCounter.current++,
      content: (
        <div className="flex items-center hover:bg-muted/30 group h-full" style={{ paddingLeft: indent }}>
          {displayName}
          {renderValue(data)}
          <span className="text-foreground">{comma}</span>
          <button
            onClick={() => navigator.clipboard.writeText(typeof data === "string" ? data : JSON.stringify(data))}
            className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-muted rounded"
            title="复制值"
          >
            <Copy className="w-2.5 h-2.5 text-muted-foreground" />
          </button>
        </div>
      ),
    });
    return lines;
  }

  const openChar = isArray ? "[" : "{";
  const closeChar = isArray ? "]" : "}";
  const entries = isArray
    ? (data as unknown[]).map((item, idx) => ({ key: idx, value: item }))
    : Object.entries(data as object).map(([key, value]) => ({ key, value }));
  const itemCount = entries.length;

  // 计算折叠时跳过的行数
  const totalLinesIfExpanded = countLines(data);
  const skippedLines = totalLinesIfExpanded - 1; // 减去开始行

  const openLineNumber = lineCounter.current++;

  // 开始行
  lines.push({
    lineNumber: openLineNumber,
    path,
    isExpandable: true,
    isCollapsed,
    skippedLines: isCollapsed ? skippedLines : undefined,
    content: (
      <div className="flex items-center hover:bg-muted/30 group h-full" style={{ paddingLeft: indent }}>
        {displayName}
        <span className="text-foreground">{openChar}</span>
        {isCollapsed && (
          <>
            <span className="text-muted-foreground mx-1">...{itemCount} {isArray ? "items" : "keys"}</span>
            <span className="text-foreground">{closeChar}{comma}</span>
          </>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(data, null, 2)); }}
          className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-muted rounded"
          title="复制节点"
        >
          <Copy className="w-2.5 h-2.5 text-muted-foreground" />
        </button>
      </div>
    ),
  });

  if (isCollapsed) {
    // 折叠时跳过行号
    lineCounter.current += skippedLines;
  } else {
    // 展开时渲染子节点
    entries.forEach((entry, idx) => {
      const childPath = `${path}.${entry.key}`;
      const childLines = generateLines(
        entry.value,
        collapsedState,
        lineCounter,
        entry.key,
        depth + 1,
        childPath,
        idx === entries.length - 1
      );
      lines.push(...childLines);
    });

    // 结束行
    lines.push({
      lineNumber: lineCounter.current++,
      content: (
        <div className="flex items-center hover:bg-muted/30 h-full" style={{ paddingLeft: indent }}>
          <span className="text-foreground">{closeChar}{comma}</span>
        </div>
      ),
    });
  }

  return lines;
}

export function JsonRenderer({ data, fontSize = 13 }: JsonRendererProps) {
  const [collapsedState, setCollapsedState] = useState<CollapsedState>({});

  // 根据字体大小计算行高
  const lineHeight = Math.round(fontSize * 1.7);

  const toggleCollapse = (path: string) => {
    setCollapsedState(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const lines = useMemo(() => {
    if (data === undefined) return [];
    if (Array.isArray(data) || (typeof data === "object" && data !== null)) {
      return generateLines(data, collapsedState, { current: 1 });
    }
    // 简单值
    return [{
      lineNumber: 1,
      content: (
        <div className="flex items-center" style={{ height: lineHeight }}>
          {renderValue(data)}
        </div>
      ),
    }] as LineData[];
  }, [data, collapsedState, lineHeight]);

  if (data === undefined) {
    return <span className="text-muted-foreground">undefined</span>;
  }

  return (
    <div className="font-mono h-full overflow-auto" style={{ fontSize }}>
      {lines.map((line, idx) => (
        <div key={idx} className="flex" style={{ height: lineHeight }}>
          {/* 行号 */}
          <div
            className={`flex-shrink-0 select-none bg-muted/60 dark:bg-muted/30 border-r border-border px-1.5 flex items-center ${
              line.isExpandable
                ? "cursor-pointer hover:bg-primary/20 text-primary"
                : "text-muted-foreground/60"
            }`}
            style={{ fontSize: fontSize * 0.85, minWidth: 40 }}
            onClick={() => line.path && toggleCollapse(line.path)}
            title={line.isExpandable ? (line.isCollapsed ? "点击展开" : "点击折叠") : undefined}
          >
            {/* 固定宽度的图标区域 */}
            <span className="flex-shrink-0" style={{ width: fontSize * 0.9 }}>
              {line.isExpandable && (
                line.isCollapsed
                  ? <ChevronRight style={{ width: fontSize * 0.8, height: fontSize * 0.8 }} />
                  : <ChevronDown style={{ width: fontSize * 0.8, height: fontSize * 0.8 }} />
              )}
            </span>
            <span className="text-right flex-1">{line.lineNumber}</span>
          </div>
          {/* 内容 */}
          <div className="flex-1 pl-2 flex items-center whitespace-nowrap">
            {line.content}
          </div>
        </div>
      ))}
    </div>
  );
}

export default JsonRenderer;
