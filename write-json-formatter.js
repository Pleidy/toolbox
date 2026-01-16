const fs = require('fs');
const content = `import * as React from 'react';
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Copy, Trash2, Type, ArrowDownUp, FileJson, Plus, X } from 'lucide-react';

interface JsonTab {
  id: string;
  name: string;
  input: string;
  output: string;
  fontSize: number;
}

const createId = () => Math.random().toString(36).substring(2, 9);

function formatJson(input) {
  if (!input.trim()) return { success: false, error: 'Empty input' };
  try {
    const parsed = JSON.parse(input);
    return { success: true, data: JSON.stringify(parsed, null, 2) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function compressJson(input) {
  if (!input.trim()) return { success: false, error: 'Empty input' };
  try {
    const parsed = JSON.parse(input);
    return { success: true, data: JSON.stringify(parsed) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function escapeJson(input) {
  if (!input.trim()) return { success: false, error: 'Empty input' };
  try {
    return { success: true, data: JSON.stringify(JSON.parse(input)) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function unescapeJson(input) {
  if (!input.trim()) return { success: false, error: 'Empty input' };
  try {
    const parsed = JSON.parse(input);
    return { success: true, data: JSON.stringify(parsed) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function JsonFormatter() {
  const [tabs, setTabs] = useState([
    { id: createId(), name: '标签 1', input: '', output: '', fontSize: 14 }
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = useCallback((updates) => {
    setTabs(prev => prev.map(t => 
      t.id === activeTabId ? { ...t, ...updates } : t
    ));
  }, [activeTabId]);

  const handleFormat = useCallback(() => {
    const result = formatJson(activeTab.input);
    if (result.success) {
      updateActiveTab({ output: result.data });
    } else {
      updateActiveTab({ output: 'Error: ' + result.error });
    }
  }, [activeTab, updateActiveTab]);

  const handleCompress = useCallback(() => {
    const result = compressJson(activeTab.input);
    if (result.success) {
      updateActiveTab({ output: result.data });
    } else {
      updateActiveTab({ output: 'Error: ' + result.error });
    }
  }, [activeTab, updateActiveTab]);

  const handleEscape = useCallback(() => {
    const result = escapeJson(activeTab.input);
    if (result.success) {
      updateActiveTab({ output: result.data });
    } else {
      updateActiveTab({ output: 'Error: ' + result.error });
    }
  }, [activeTab, updateActiveTab]);

  const handleUnescape = useCallback(() => {
    const result = unescapeJson(activeTab.input);
    if (result.success) {
      updateActiveTab({ output: result.data });
    } else {
      updateActiveTab({ output: 'Error: ' + result.error });
    }
  }, [activeTab, updateActiveTab]);

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }, []);

  const handleClear = useCallback(() => {
    updateActiveTab({ input: '', output: '' });
  }, [updateActiveTab]);

  const handleFontSizeChange = useCallback((e) => {
    const size = parseInt(e.target.value, 10);
    if (size >= 10 && size <= 32) {
      updateActiveTab({ fontSize: size });
    }
  }, [updateActiveTab]);

  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleFormat();
    }
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      const target = e.target;
      target.select();
    }
  }, [handleFormat]);

  const addTab = useCallback(() => {
    const newTab = {
      id: createId(),
      name: '标签 ' + (tabs.length + 1),
      input: '',
      output: '',
      fontSize: activeTab.fontSize
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length, activeTab.fontSize]);

  const closeTab = useCallback((e, tabId) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[0].id);
    }
  }, [tabs, activeTabId]);

  return (
    React.createElement(TooltipProvider, null,
      React.createElement('div', { className: 'flex flex-col h-full' },
        // Tab bar
        React.createElement('div', { className: 'flex items-center justify-between px-2 py-1 border-b bg-muted/30' },
          React.createElement('div', { className: 'flex items-center gap-1 overflow-x-auto' },
            tabs.map(tab => 
              React.createElement('button', {
                key: tab.id,
                onClick: () => setActiveTabId(tab.id),
                className: cn(
                  'flex items-center gap-1 px-3 py-1.5 text-sm rounded-t-md transition-colors',
                  tab.id === activeTabId
                    ? 'bg-background border border-b-0 border-muted shadow-sm'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )
              },
                React.createElement('span', { className: 'truncate max-w-[80px]' }, tab.name),
                React.createElement(X, {
                  className: 'w-3.5 h-3.5 hover:text-destructive cursor-pointer opacity-60 hover:opacity-100',
                  onClick: (e) => closeTab(e, tab.id)
                })
              )
            ),
            React.createElement(Tooltip, null,
              React.createElement(TooltipTrigger, { asChild: true },
                React.createElement('button', {
                  onClick: addTab,
                  className: 'flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition-colors'
                },
                  React.createElement(Plus, { className: 'w-4 h-4' })
                )
              ),
              React.createElement(TooltipContent, null, '添加标签')
            )
          )
        ),

        // Main content
        React.createElement('div', { className: 'flex-1 flex gap-2 p-2 overflow-hidden' },
          // Input panel
          React.createElement(Card, { className: 'flex-1 flex flex-col min-w-0' },
            React.createElement(CardHeader, { className: 'flex-shrink-0 pb-2' },
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement(CardTitle, { className: 'text-sm font-medium flex items-center gap-2' },
                  React.createElement(FileJson, { className: 'w-4 h-4' }),
                  '输入 JSON',
                  React.createElement('span', { className: 'text-muted-foreground text-xs font-normal' },
                    activeTab.input.length + ' 字符'
                  )
                ),
                React.createElement('div', { className: 'flex items-center gap-1 flex-wrap' },
                  React.createElement(Tooltip, null,
                    React.createElement(TooltipTrigger, { asChild: true },
                      React.createElement(Button, { variant: 'outline', size: 'sm', onClick: handleFormat, className: 'h-7 text-xs' }, '格式化')
                    ),
                    React.createElement(TooltipContent, null, 'Ctrl + Enter')
                  ),
                  React.createElement(Tooltip, null,
                    React.createElement(TooltipTrigger, { asChild: true },
                      React
