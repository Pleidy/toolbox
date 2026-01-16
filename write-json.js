const fs = require('fs');

const content = `import * as React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Copy, Trash2, Type, ArrowDownUp, FileJson, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';

interface JsonTab {
  id: string;
  name: string;
  input: string;
  output: string;
  fontSize: number;
  foldedLines: Set<number>;
}

const createId = () => Math.random().toString(36).substring(2, 9);

interface JsonNode {
  key?: string;
  value: string | number | boolean | null;
  indent: number;
  lineNumber: number;
  isContainer: boolean;
  startBracket?: string;
  endBracket?: string;
  children?: JsonNode[];
}

function parseJsonToTree(json: string): { tree: JsonNode[]; error?: string } {
  try {
    const parsed = JSON.parse(json);
    const tree: JsonNode[] = [];
    buildTree(parsed, tree, 0);
    return { tree };
  } catch (e) {
    return { tree: [], error: (e as Error).message };
  }
}

function buildTree(obj: unknown, parent: JsonNode[], indent: number): void {
  const type = typeof obj;
  
  if (obj === null) {
    parent.push({ key: undefined, value: 'null', indent, lineNumber: parent.length, isContainer: false });
    return;
  }
  
  if (type === 'string') {
    parent.push({ key: undefined, value: '"' + obj + '"', indent, lineNumber: parent.length, isContainer: false });
    return;
  }
  
  if (type === 'number') {
    parent.push({ key: undefined, value: String(obj), indent, lineNumber: parent.length, isContainer: false });
    return;
  }
  
  if (type === 'boolean') {
    parent.push({ key: undefined, value: String(obj), indent, lineNumber: parent.length, isContainer: false });
    return;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      parent.push({ key: undefined, value: '[]', indent, lineNumber: parent.length, isContainer: false });
      return;
    }
    
    const node: JsonNode = {
      key: undefined,
      value: '',
      indent,
      lineNumber: parent.length,
      isContainer: true,
      startBracket: '[',
      endBracket: ']',
      children: []
    };
    parent.push(node);
    
    obj.forEach((item, index) => {
      if (index < obj.length - 1) {
        parent.push({ key: undefined, value: ',', indent: indent + 1, lineNumber: parent.length, isContainer: false });
      }
      buildTree(item, parent, indent + 1);
    });
    
    return;
  }
  
  if (type === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      parent.push({ key: undefined, value: '{}', indent, lineNumber: parent.length, isContainer: false });
      return;
    }
    
    const node: JsonNode = {
      key: undefined,
      value: '',
      indent,
      lineNumber: parent.length,
      isContainer: true,
      startBracket: '{',
      endBracket: '}',
      children: []
    };
    parent.push(node);
    
    keys.forEach((k, index) => {
      const childNode: JsonNode = {
        key: k,
        value: '',
        indent: indent + 1,
        lineNumber: parent.length,
        isContainer: true,
        startBracket: '',
        endBracket: '',
        children: []
      };
      parent.push(childNode);
      
      buildTree(obj[k], childNode.children || parent, indent + 1);
      
      if (index < keys.length - 1) {
        parent.push({ key: undefined, value: ',', indent: indent + 1, lineNumber: parent.length, isContainer: false });
      }
    });
    
    return;
  }
}

function flattenTree(tree: JsonNode[]): { nodes: (JsonNode | null)[]; lineCount: number } {
  const result = [];
  let lineCount = 0;
  
  function processNode(node) {
    if (node.isContainer && node.startBracket) {
      result.push({ ...node, lineNumber: lineCount++ });
    } else if (node.isContainer) {
      result.push({ ...node, lineNumber: lineCount++ });
    } else {
      result.push({ ...node, lineNumber: lineCount++ });
    }
    
    if (node.key && node.children) {
      node.children.forEach(child => processNode(child));
    }
    
    if (node.isContainer && node.endBracket) {
      result.push({
        key: undefined,
        value: node.endBracket,
        indent: node.indent,
        lineNumber: lineCount++,
        isContainer: false,
        startBracket: undefined,
        endBracket: undefined,
        children: undefined
      });
    }
  }
  
  tree.forEach(node => processNode(node));
  return { nodes: result, lineCount };
}

export function JsonFormatter() {
  const [tabs, setTabs] = useState([
    { id: createId(), name: '标签 1', input: '', output: '', fontSize: 13, foldedLines: new Set() }
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateActiveTab = useCallback((updates) => {
    setTabs(prev => prev.map(t => 
      t.id === activeTabId ? { ...t, ...updates } : t
    ));
  }, [activeTabId]);

  const parseResult = useMemo(() => {
    if (!activeTab.input.trim()) return null;
    return parseJsonToTree(activeTab.input);
  }, [activeTab.input]);

  const flatNodes = useMemo(() => {
    if (!parseResult?.tree.length) return { nodes: [], lineCount: 0 };
    return flattenTree(parseResult.tree);
  }, [parseResult]);

  const toggleFold = useCallback((lineNumber) => {
    const newFolded = new Set(activeTab.foldedLines);
    if (newFolded.has(lineNumber)) {
      newFolded.delete(lineNumber);
    } else {
      newFolded.add(lineNumber);
    }
    updateActiveTab({ foldedLines: newFolded });
  }, [activeTab.foldedLines, updateActiveTab]);

  const isLineVisible = useCallback((lineNumber) => {
    let currentLine = lineNumber;
    while (currentLine > 0) {
      currentLine--;
      if (activeTab.foldedLines.has(currentLine)) {
        const foldedNode = flatNodes.nodes[currentLine];
        const currentNode = flatNodes.nodes[lineNumber];
        
        if (foldedNode && currentNode && foldedNode.indent !== undefined && currentNode.indent !== undefined) {
          if (currentNode.indent > foldedNode.indent) {
            return false;
          }
        }
      }
    }
    return true;
  }, [activeTab.foldedLines, flatNodes]);

  const handleFormat = useCallback(() => {
    if (parseResult?.error) {
      updateActiveTab({ output: 'Error: ' + parseResult.error });
      return;
    }
    if (!activeTab.input.trim()) {
      updateActiveTab({ output: '' });
      return;
    }
    try {
      const parsed = JSON.parse(activeTab.input);
      updateActiveTab({ output: JSON.stringify(parsed, null, 2) });
    } catch (e) {
      updateActiveTab({ output: 'Error: ' + e.message });
    }
  }, [activeTab.input, parseResult, updateActiveTab]);

  const handleCompress = useCallback(() => {
    if (parseResult?.error) {
      updateActiveTab({ output: 'Error: ' + parseResult.error });
      return;
    }
    if (!activeTab.input.trim()) {
      updateActiveTab({ output: '' });
      return;
    }
    try {
      const parsed = JSON.parse(activeTab.input);
      updateActiveTab({ output: JSON.stringify(parsed) });
    } catch (e) {
      updateActiveTab({ output: 'Error: ' + e.message });
    }
  }, [activeTab.input, parseResult, updateActiveTab]);

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }, []);

  const handleClear = useCallback(() => {
    updateActiveTab({ input: '', output: '', foldedLines: new Set() });
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
      const target = e.target
