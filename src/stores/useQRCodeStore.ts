import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BatchConfig,
  BatchItem,
  ExportSettings,
  PreviewSettings,
  QRCodeConfig,
  QRCodeTab,
} from '../types';
import { generateId } from '../lib/utils';

const DEFAULT_TAB_NAME = '默认标签';

const createDefaultSingleConfig = (): QRCodeConfig => ({
  content: 'https://example.com',
  width: 400,
  margin: 2,
  errorCorrectionLevel: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  style: 'square',
});

const createDefaultBatchConfig = (): BatchConfig => ({
  data: [],
  globalStyle: createDefaultSingleConfig(),
  exportFormat: 'png',
  filenamePattern: 'qr_{index}',
});

const createDefaultExportSettings = (): ExportSettings => ({
  format: 'pdf',
  itemsPerPage: 12,
  columns: 3,
  rows: 4,
  splitThreshold: 0,
  expanded: false,
});

const createDefaultPreviewSettings = (): PreviewSettings => ({
  columns: 2,
  size: 240,
  rowHeight: 500,
  largeScreen: false,
});

function createDefaultTab(name = DEFAULT_TAB_NAME): QRCodeTab {
  const singleConfig = createDefaultSingleConfig();

  return {
    id: generateId(),
    name,
    singleConfig,
    batchConfig: {
      ...createDefaultBatchConfig(),
      globalStyle: { ...singleConfig },
    },
    usedContents: [],
    inputText: '',
    autoMode: true,
    manualMode: 'single',
    exportSettings: createDefaultExportSettings(),
    previewSettings: createDefaultPreviewSettings(),
  };
}

function cloneTab(tab: QRCodeTab): QRCodeTab {
  return {
    ...tab,
    singleConfig: { ...tab.singleConfig },
    batchConfig: {
      ...tab.batchConfig,
      globalStyle: { ...tab.batchConfig.globalStyle },
      data: tab.batchConfig.data.map((item) => ({ ...item })),
    },
    usedContents: [...tab.usedContents],
    exportSettings: { ...tab.exportSettings },
    previewSettings: { ...tab.previewSettings },
  };
}

function buildTabSnapshot(state: QRCodeState, tab: QRCodeTab): QRCodeTab {
  if (tab.id !== state.activeTabId) {
    return cloneTab(tab);
  }

  return {
    ...cloneTab(tab),
    singleConfig: { ...state.singleConfig },
    batchConfig: {
      ...state.batchConfig,
      globalStyle: { ...state.batchConfig.globalStyle },
      data: state.batchConfig.data.map((item) => ({ ...item })),
    },
    usedContents: [...state.usedContents],
    inputText: state.inputText,
    autoMode: state.autoMode,
    manualMode: state.manualMode,
    exportSettings: { ...state.exportSettings },
    previewSettings: { ...state.previewSettings },
  };
}

function buildTopLevelStateFromTab(tab: QRCodeTab) {
  return {
    singleConfig: { ...tab.singleConfig },
    batchConfig: {
      ...tab.batchConfig,
      globalStyle: { ...tab.batchConfig.globalStyle },
      data: tab.batchConfig.data.map((item) => ({ ...item })),
    },
    usedContents: [...tab.usedContents],
    inputText: tab.inputText,
    autoMode: tab.autoMode,
    manualMode: tab.manualMode,
    exportSettings: { ...tab.exportSettings },
    previewSettings: { ...tab.previewSettings },
  };
}

function syncActiveTab<T extends Partial<QRCodeState>>(
  state: QRCodeState,
  updates: T
) {
  const tabs = state.tabs.map((tab) =>
    tab.id === state.activeTabId
      ? {
          ...buildTabSnapshot(state, tab),
          ...(updates.singleConfig
            ? { singleConfig: { ...state.singleConfig, ...updates.singleConfig } }
            : {}),
          ...(updates.batchConfig
            ? {
                batchConfig: {
                  ...state.batchConfig,
                  ...updates.batchConfig,
                  globalStyle: {
                    ...state.batchConfig.globalStyle,
                    ...(updates.batchConfig as Partial<BatchConfig>).globalStyle,
                  },
                  data:
                    (updates.batchConfig as Partial<BatchConfig>).data ??
                    state.batchConfig.data,
                },
              }
            : {}),
          ...(updates.usedContents ? { usedContents: [...updates.usedContents] } : {}),
          ...(updates.inputText !== undefined ? { inputText: updates.inputText } : {}),
          ...(updates.autoMode !== undefined ? { autoMode: updates.autoMode } : {}),
          ...(updates.manualMode ? { manualMode: updates.manualMode } : {}),
          ...(updates.exportSettings
            ? {
                exportSettings: {
                  ...state.exportSettings,
                  ...updates.exportSettings,
                },
              }
            : {}),
          ...(updates.previewSettings
            ? {
                previewSettings: {
                  ...state.previewSettings,
                  ...updates.previewSettings,
                },
              }
            : {}),
        }
      : buildTabSnapshot(state, tab)
  );

  return {
    ...updates,
    tabs,
  };
}

interface QRCodeState {
  tabs: QRCodeTab[];
  activeTabId: string;
  addTab: () => void;
  deleteTab: (id: string) => void;
  moveTab: (fromId: string, toId: string) => void;
  renameTab: (id: string, name: string) => void;
  setActiveTab: (id: string) => void;
  resetTabs: () => void;

  singleConfig: QRCodeConfig;
  setSingleConfig: (config: Partial<QRCodeConfig>) => void;

  batchConfig: BatchConfig;
  setBatchConfig: (config: Partial<BatchConfig>) => void;
  removeBatchItem: (id: string) => void;
  updateBatchItem: (id: string, item: Partial<BatchItem>) => void;
  clearBatchItems: () => void;
  setBatchData: (data: BatchItem[]) => void;
  toggleUsed: (id: string) => void;
  clearAllUsed: () => void;

  usedContents: string[];

  generating: boolean;
  progress: number;
  progressLabel: string;
  cancelRequested: boolean;
  setGenerating: (generating: boolean) => void;
  setProgress: (progress: number) => void;
  setProgressLabel: (label: string) => void;
  setCancelRequested: (cancelRequested: boolean) => void;
  resetExportState: () => void;

  inputText: string;
  autoMode: boolean;
  manualMode: 'single' | 'batch';
  exportSettings: ExportSettings;
  previewSettings: PreviewSettings;

  setInputText: (text: string) => void;
  setAutoMode: (auto: boolean) => void;
  setManualMode: (mode: 'single' | 'batch') => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setPreviewSettings: (settings: Partial<PreviewSettings>) => void;
}

const defaultTab = createDefaultTab();

export const useQRCodeStore = create<QRCodeState>()(
  persist(
    (set) => ({
      tabs: [defaultTab],
      activeTabId: defaultTab.id,

      addTab: () =>
        set((state) => {
          const nextTab = createDefaultTab(`标签${state.tabs.length + 1}`);
          const currentTabs = state.tabs.map((tab) => buildTabSnapshot(state, tab));

          return {
            tabs: [...currentTabs, nextTab],
            activeTabId: nextTab.id,
            ...buildTopLevelStateFromTab(nextTab),
          };
        }),

      deleteTab: (id) =>
        set((state) => {
          if (state.tabs.length <= 1) {
            return state;
          }

          const tabs = state.tabs.map((tab) => buildTabSnapshot(state, tab));
          const removeIndex = tabs.findIndex((tab) => tab.id === id);

          if (removeIndex === -1) {
            return state;
          }

          const nextTabs = tabs.filter((tab) => tab.id !== id);
          const nextActiveTab =
            state.activeTabId === id
              ? nextTabs[Math.max(0, removeIndex - 1)] || nextTabs[0]
              : nextTabs.find((tab) => tab.id === state.activeTabId) || nextTabs[0];

          return {
            tabs: nextTabs,
            activeTabId: nextActiveTab.id,
            ...buildTopLevelStateFromTab(nextActiveTab),
          };
        }),

      moveTab: (fromId, toId) =>
        set((state) => {
          if (fromId === toId) {
            return state;
          }

          const tabs = state.tabs.map((tab) => buildTabSnapshot(state, tab));
          const fromIndex = tabs.findIndex((tab) => tab.id === fromId);
          const toIndex = tabs.findIndex((tab) => tab.id === toId);

          if (fromIndex === -1 || toIndex === -1) {
            return state;
          }

          const nextTabs = [...tabs];
          const [movedTab] = nextTabs.splice(fromIndex, 1);
          nextTabs.splice(toIndex, 0, movedTab);

          return {
            tabs: nextTabs,
          };
        }),

      renameTab: (id, name) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === id
              ? {
                  ...buildTabSnapshot(state, tab),
                  name: name.trim() || DEFAULT_TAB_NAME,
                }
              : buildTabSnapshot(state, tab)
          ),
        })),

      setActiveTab: (id) =>
        set((state) => {
          const tabs = state.tabs.map((tab) => buildTabSnapshot(state, tab));
          const activeTab = tabs.find((tab) => tab.id === id) || tabs[0];

          return {
            tabs,
            activeTabId: activeTab.id,
            ...buildTopLevelStateFromTab(activeTab),
          };
        }),

      resetTabs: () => {
        const freshTab = createDefaultTab();
        return set(() => ({
          tabs: [freshTab],
          activeTabId: freshTab.id,
          ...buildTopLevelStateFromTab(freshTab),
          generating: false,
          progress: 0,
          progressLabel: '',
          cancelRequested: false,
        }));
      },

      singleConfig: { ...defaultTab.singleConfig },
      setSingleConfig: (config) =>
        set((state) => {
          const nextSingleConfig = { ...state.singleConfig, ...config };
          return syncActiveTab(state, { singleConfig: nextSingleConfig });
        }),

      batchConfig: {
        ...defaultTab.batchConfig,
        data: defaultTab.batchConfig.data.map((item) => ({ ...item })),
      },
      setBatchConfig: (config) =>
        set((state) => {
          const nextBatchConfig: BatchConfig = {
            ...state.batchConfig,
            ...config,
            globalStyle: {
              ...state.batchConfig.globalStyle,
              ...(config.globalStyle || {}),
            },
            data: config.data ?? state.batchConfig.data,
          };
          return syncActiveTab(state, { batchConfig: nextBatchConfig });
        }),

      removeBatchItem: (id) =>
        set((state) => {
          const nextBatchConfig = {
            ...state.batchConfig,
            data: state.batchConfig.data.filter((item) => item.id !== id),
          };
          return syncActiveTab(state, { batchConfig: nextBatchConfig });
        }),

      updateBatchItem: (id, item) =>
        set((state) => {
          const nextBatchConfig = {
            ...state.batchConfig,
            data: state.batchConfig.data.map((entry) =>
              entry.id === id ? { ...entry, ...item } : entry
            ),
          };
          return syncActiveTab(state, { batchConfig: nextBatchConfig });
        }),

      clearBatchItems: () =>
        set((state) => {
          const nextBatchConfig = { ...state.batchConfig, data: [] };
          return syncActiveTab(state, { batchConfig: nextBatchConfig });
        }),

      setBatchData: (data) =>
        set((state) => {
          const usedContents = new Set(state.usedContents);
          const nextBatchConfig = {
            ...state.batchConfig,
            data: data.map((item) => ({
              ...item,
              used: item.used ?? usedContents.has(item.content),
            })),
          };
          return syncActiveTab(state, { batchConfig: nextBatchConfig });
        }),

      usedContents: [...defaultTab.usedContents],

      toggleUsed: (id) =>
        set((state) => {
          const item = state.batchConfig.data.find((entry) => entry.id === id);
          if (!item) return state;

          const nextUsedContents = item.used
            ? state.usedContents.filter((content) => content !== item.content)
            : [...state.usedContents, item.content];
          const nextBatchConfig = {
            ...state.batchConfig,
            data: state.batchConfig.data.map((entry) =>
              entry.id === id ? { ...entry, used: !entry.used } : entry
            ),
          };

          return syncActiveTab(state, {
            usedContents: nextUsedContents,
            batchConfig: nextBatchConfig,
          });
        }),

      clearAllUsed: () =>
        set((state) => {
          const nextBatchConfig = {
            ...state.batchConfig,
            data: state.batchConfig.data.map((item) => ({ ...item, used: false })),
          };
          return syncActiveTab(state, {
            usedContents: [],
            batchConfig: nextBatchConfig,
          });
        }),

      generating: false,
      progress: 0,
      progressLabel: '',
      cancelRequested: false,
      setGenerating: (generating) => set({ generating }),
      setProgress: (progress) => set({ progress }),
      setProgressLabel: (progressLabel) => set({ progressLabel }),
      setCancelRequested: (cancelRequested) => set({ cancelRequested }),
      resetExportState: () =>
        set({
          generating: false,
          progress: 0,
          progressLabel: '',
          cancelRequested: false,
        }),

      inputText: defaultTab.inputText,
      autoMode: defaultTab.autoMode,
      manualMode: defaultTab.manualMode,
      exportSettings: { ...defaultTab.exportSettings },
      previewSettings: { ...defaultTab.previewSettings },

      setInputText: (inputText) =>
        set((state) => syncActiveTab(state, { inputText })),
      setAutoMode: (autoMode) =>
        set((state) => syncActiveTab(state, { autoMode })),
      setManualMode: (manualMode) =>
        set((state) => syncActiveTab(state, { manualMode })),
      setExportSettings: (exportSettings) =>
        set((state) =>
          syncActiveTab(state, {
            exportSettings: { ...state.exportSettings, ...exportSettings },
          })
        ),
      setPreviewSettings: (previewSettings) =>
        set((state) =>
          syncActiveTab(state, {
            previewSettings: { ...state.previewSettings, ...previewSettings },
          })
        ),
    }),
    {
      name: 'toolbox-config',
      version: 3,
      partialize: (state) => ({
        tabs: state.tabs.map((tab) => buildTabSnapshot(state, tab)),
        activeTabId: state.activeTabId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<QRCodeState>) || {};
        const tabs =
          persisted.tabs && persisted.tabs.length > 0
            ? persisted.tabs.map((tab) => ({
                ...createDefaultTab(tab.name || DEFAULT_TAB_NAME),
                ...tab,
                singleConfig: {
                  ...createDefaultSingleConfig(),
                  ...(tab.singleConfig || {}),
                },
                batchConfig: {
                  ...createDefaultBatchConfig(),
                  ...(tab.batchConfig || {}),
                  globalStyle: {
                    ...createDefaultSingleConfig(),
                    ...(tab.batchConfig?.globalStyle || {}),
                  },
                  data: (tab.batchConfig?.data || []).map((item) => ({ ...item })),
                },
                usedContents: [...(tab.usedContents || [])],
                exportSettings: {
                  ...createDefaultExportSettings(),
                  ...(tab.exportSettings || {}),
                },
                previewSettings: {
                  ...createDefaultPreviewSettings(),
                  ...(tab.previewSettings || {}),
                },
              }))
            : [createDefaultTab()];

        const activeTab =
          tabs.find((tab) => tab.id === persisted.activeTabId) || tabs[0];

        return {
          ...currentState,
          tabs,
          activeTabId: activeTab.id,
          ...buildTopLevelStateFromTab(activeTab),
          generating: false,
          progress: 0,
          progressLabel: '',
          cancelRequested: false,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate state:', error);

          try {
            localStorage.removeItem('qrcode-toolbox-config');
          } catch (storageError) {
            console.error('Failed to clear storage:', storageError);
          }
        }
      },
    }
  )
);
