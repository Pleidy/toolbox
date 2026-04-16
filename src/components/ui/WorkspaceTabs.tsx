import { useState } from 'react';
import { Edit3, GripVertical, Plus, X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

interface WorkspaceTabItem {
  id: string;
  name: string;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTabItem[];
  activeTabId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
  addLabel?: string;
}

export function WorkspaceTabs({
  tabs,
  activeTabId,
  onAdd,
  onSelect,
  onRename,
  onDelete,
  onMove,
  addLabel = '新建',
}: WorkspaceTabsProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);

  const handleStartRename = (tab: WorkspaceTabItem) => {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  };

  const handleCommitRename = () => {
    if (!editingTabId) {
      return;
    }

    onRename(editingTabId, editingTabName);
    setEditingTabId(null);
    setEditingTabName('');
  };

  const handleDropTab = (targetTabId: string) => {
    if (!draggingTabId || draggingTabId === targetTabId) {
      setDraggingTabId(null);
      return;
    }

    onMove(draggingTabId, targetTabId);
    setDraggingTabId(null);
  };

  return (
    <div className="flex-shrink-0 p-2 border-t bg-muted/20">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = tab.id === editingTabId;

          return (
            <div
              key={tab.id}
              draggable={!isEditing}
              onDragStart={() => setDraggingTabId(tab.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDropTab(tab.id)}
              onDragEnd={() => setDraggingTabId(null)}
              className={`rounded-t-md border border-b-0 min-w-[120px] max-w-[180px] ${
                isActive ? 'bg-primary/12 border-primary/40 shadow-sm' : 'bg-muted/50'
              } ${draggingTabId === tab.id ? 'opacity-60' : ''}`}
            >
              {isEditing ? (
                <div className="p-1.5">
                  <Input
                    value={editingTabName}
                    onChange={(event) => setEditingTabName(event.target.value)}
                    onBlur={handleCommitRename}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleCommitRename();
                      }
                      if (event.key === 'Escape') {
                        setEditingTabId(null);
                        setEditingTabName('');
                      }
                    }}
                    className="h-6 text-xs"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() => onSelect(tab.id)}
                    className={`flex-1 truncate text-left text-[11px] font-medium ${
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {tab.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleStartRename(tab)}
                    title="重命名标签"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                  </Button>
                  {tabs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onDelete(tab.id)}
                      title="删除标签"
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-[11px] flex-shrink-0"
          onClick={onAdd}
        >
          <Plus className="mr-1 h-3 w-3" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
