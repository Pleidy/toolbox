import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ImageInfo {
  width: number;
  height: number;
  size: number;          // bytes
  format: string;
  hasAlpha: boolean;
}

export interface ImageTab {
  id: string;
  name: string;
  // 原始图片
  originalImage: string | null;  // base64
  originalInfo: ImageInfo | null;
  // 处理后图片
  processedImage: string | null;
  processedInfo: ImageInfo | null;
  // 当前功能模式
  mode: 'compress' | 'convert' | 'base64' | 'info';
  // 压缩设置
  compressQuality: number;       // 0-100
  compressScale: number;         // 0.1-1
  // 转换设置
  convertFormat: 'png' | 'jpeg' | 'webp';
  // Base64 设置
  base64Output: string;
  base64Input: string;
  updatedAt: number;
}

interface ImageState {
  tabs: ImageTab[];
  activeTabId: string | null;

  // Actions
  addTab: () => void;
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  moveTab: (fromId: string, toId: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<ImageTab>) => void;
  getActiveTab: () => ImageTab | null;
}

const createId = () => Math.random().toString(36).substring(2, 9);

const createDefaultTab = (): ImageTab => ({
  id: createId(),
  name: "图片 1",
  originalImage: null,
  originalInfo: null,
  processedImage: null,
  processedInfo: null,
  mode: 'compress',
  compressQuality: 80,
  compressScale: 1,
  convertFormat: 'png',
  base64Output: '',
  base64Input: '',
  updatedAt: Date.now(),
});

export const useImageStore = create<ImageState>()(
  persist(
    (set, get) => ({
      tabs: [createDefaultTab()],
      activeTabId: null,

      addTab: () => {
        const { tabs } = get();
        const newTab: ImageTab = {
          ...createDefaultTab(),
          id: createId(),
          name: `图片 ${tabs.length + 1}`,
        };
        set({
          tabs: [...tabs, newTab],
          activeTabId: newTab.id,
        });
      },

      closeTab: (id: string) => {
        const { tabs } = get();
        if (tabs.length <= 1) return;

        const newTabs = tabs.filter(t => t.id !== id);
        const currentActiveId = get().activeTabId;

        set({
          tabs: newTabs,
          activeTabId: currentActiveId === id ? newTabs[0]?.id || null : currentActiveId,
        });
      },

      renameTab: (id: string, name: string) => {
        const { tabs } = get();
        set({
          tabs: tabs.map((tab) =>
            tab.id === id ? { ...tab, name: name.trim() || tab.name } : tab
          ),
        });
      },

      moveTab: (fromId: string, toId: string) => {
        if (fromId === toId) return;

        const { tabs } = get();
        const fromIndex = tabs.findIndex((tab) => tab.id === fromId);
        const toIndex = tabs.findIndex((tab) => tab.id === toId);

        if (fromIndex === -1 || toIndex === -1) return;

        const nextTabs = [...tabs];
        const [movedTab] = nextTabs.splice(fromIndex, 1);
        nextTabs.splice(toIndex, 0, movedTab);
        set({ tabs: nextTabs });
      },

      setActiveTab: (id: string) => {
        set({ activeTabId: id });
      },

      updateTab: (id: string, updates: Partial<ImageTab>) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        });
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get();
        return tabs.find(t => t.id === activeTabId) || tabs[0] || null;
      },
    }),
    {
      name: 'toolbox-image-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
