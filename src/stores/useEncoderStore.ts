import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type EncodingType = 'url' | 'base64' | 'unicode';
export type EncodeMode = 'encode' | 'decode';

export interface EncoderTab {
  id: string;
  name: string;
  input: string;
  output: string;
  encodingType: EncodingType;
  mode: EncodeMode;
  updatedAt: number;
}

interface EncoderState {
  tabs: EncoderTab[];
  activeTabId: string | null;

  // Actions
  addTab: () => void;
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  moveTab: (fromId: string, toId: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<EncoderTab>) => void;
}

const createId = () => Math.random().toString(36).substring(2, 9);

export const useEncoderStore = create<EncoderState>()(
  persist(
    (set, get) => ({
      tabs: [{ id: createId(), name: "标签 1", input: "", output: "", encodingType: "url", mode: "decode", updatedAt: Date.now() }],
      activeTabId: null,

      addTab: () => {
        const { tabs } = get();
        const newTab: EncoderTab = {
          id: createId(),
          name: `标签 ${tabs.length + 1}`,
          input: "",
          output: "",
          encodingType: tabs[0]?.encodingType || 'url',
          mode: tabs[0]?.mode || 'decode',
          updatedAt: Date.now(),
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

        set({
          tabs: newTabs,
          activeTabId: newTabs[0]?.id || null,
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

      updateTab: (id: string, updates: Partial<EncoderTab>) => {
        const { tabs } = get();
        set({
          tabs: tabs.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
          ),
        });
      },
    }),
    {
      name: 'toolbox-encoder-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
