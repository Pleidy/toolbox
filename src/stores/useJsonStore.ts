import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface JsonTab {
  id: string;
  name: string;
  input: string;
  fontSize: number;
  updatedAt: number;
}

interface JsonCache {
  data: unknown;
  timestamp: number;
}

interface JsonState {
  tabs: JsonTab[];
  activeTabId: string | null;
  cache: Record<string, JsonCache>;
  
  // Actions
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<JsonTab>) => void;
  clearCache: (id: string) => void;
  clearAllCache: () => void;
  cleanupExpiredCache: () => void;
}

const CACHE_DURATION = 30 * 60 * 1000; // 30 分钟
const createId = () => Math.random().toString(36).substring(2, 9);

export const useJsonStore = create<JsonState>()(
  persist(
    (set, get) => ({
      tabs: [{ id: createId(), name: "标签 1", input: "", fontSize: 13, updatedAt: Date.now() }],
      activeTabId: null,
      cache: {},

      addTab: () => {
        const { tabs } = get();
        const newTab: JsonTab = {
          id: createId(),
          name: `标签 ${tabs.length + 1}`,
          input: "",
          fontSize: tabs[0]?.fontSize || 13,
          updatedAt: Date.now(),
        };
        set({
          tabs: [...tabs, newTab],
          activeTabId: newTab.id,
        });
      },

      closeTab: (id: string) => {
        const { tabs, cache } = get();
        if (tabs.length <= 1) return;
        
        const newTabs = tabs.filter(t => t.id !== id);
        const newCache = { ...cache };
        delete newCache[id];
        
        set({
          tabs: newTabs,
          activeTabId: newTabs[0]?.id || null,
          cache: newCache,
        });
      },

      setActiveTab: (id: string) => {
        set({ activeTabId: id });
      },

      updateTab: (id: string, updates: Partial<JsonTab>) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        });
      },

      clearCache: (id: string) => {
        const { cache } = get();
        const newCache = { ...cache };
        delete newCache[id];
        set({ cache: newCache });
      },

      clearAllCache: () => {
        set({ cache: {} });
      },

      cleanupExpiredCache: () => {
        const { cache } = get();
        const now = Date.now();
        const newCache: Record<string, JsonCache> = {};
        
        Object.entries(cache).forEach(([key, value]) => {
          if (now - value.timestamp < CACHE_DURATION) {
            newCache[key] = value;
          }
        });
        
        set({ cache: newCache });
      },
    }),
    {
      name: 'json-toolbox-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        cache: state.cache,
      }),
      onRehydrateStorage: () => (state) => {
        // 重新hydrate后清理过期缓存
        state?.cleanupExpiredCache();
      },
    }
  )
);
