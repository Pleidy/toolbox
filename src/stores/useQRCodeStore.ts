import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QRCodeConfig, BatchItem, BatchConfig } from '../types';
import { generateId } from '../lib/utils';

const defaultSingleConfig: QRCodeConfig = {
  content: 'https://example.com',
  width: 400,
  margin: 2,
  errorCorrectionLevel: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  style: 'square',
};

const defaultBatchConfig: BatchConfig = {
  data: [],
  globalStyle: defaultSingleConfig,
  exportFormat: 'png',
  filenamePattern: 'qr_{index}',
};

interface ExportSettings {
  format: 'pdf' | 'multiple' | 'collage';
  itemsPerPage: number;
  columns: number;
  expanded: boolean;
}

interface PreviewSettings {
  columns: number;
  size: number;
  rowHeight: number;
}

interface QRCodeState {
  // Single generation state
  singleConfig: QRCodeConfig;
  setSingleConfig: (config: Partial<QRCodeConfig>) => void;

  // Batch generation state
  batchConfig: BatchConfig;
  setBatchConfig: (config: Partial<BatchConfig>) => void;
  addBatchItem: (content: string) => void;
  removeBatchItem: (id: string) => void;
  updateBatchItem: (id: string, item: Partial<BatchItem>) => void;
  clearBatchItems: () => void;
  setBatchData: (data: BatchItem[]) => void;
  toggleUsed: (id: string) => void;  // 切换单个项目的已使用状态
  clearAllUsed: () => void;           // 清除所有已使用状态

  // 已标记内容缓存 (基于内容持久化，而不是ID)
  usedContents: string[];

  // Generation progress (not persisted)
  generating: boolean;
  progress: number;
  setGenerating: (generating: boolean) => void;
  setProgress: (progress: number) => void;

  // Input and mode settings (persisted)
  inputText: string;
  autoMode: boolean;
  manualMode: 'single' | 'batch';
  exportSettings: ExportSettings;
  previewSettings: PreviewSettings;

  // Actions for new persisted state
  setInputText: (text: string) => void;
  setAutoMode: (auto: boolean) => void;
  setManualMode: (mode: 'single' | 'batch') => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setPreviewSettings: (settings: Partial<PreviewSettings>) => void;
}

const defaultExportSettings: ExportSettings = {
  format: 'pdf',
  itemsPerPage: 12,
  columns: 3,
  expanded: false,
};

const defaultPreviewSettings: PreviewSettings = {
  columns: 4,
  size: 150,
  rowHeight: 180,
};

export const useQRCodeStore = create<QRCodeState>()(
  persist(
    (set) => ({
      // Single generation state
      singleConfig: defaultSingleConfig,
      setSingleConfig: (config) => set((state) => ({
        singleConfig: { ...state.singleConfig, ...config }
      })),
      
      // Batch generation state
      batchConfig: defaultBatchConfig,
      setBatchConfig: (config) => set((state) => ({
        batchConfig: { ...state.batchConfig, ...config }
      })),
      addBatchItem: (content) => set((state) => ({
        batchConfig: {
          ...state.batchConfig,
          data: [
            ...state.batchConfig.data,
            {
              id: generateId(),
              content,
              status: 'pending',
            }
          ]
        }
      })),
      removeBatchItem: (id) => set((state) => ({
        batchConfig: {
          ...state.batchConfig,
          data: state.batchConfig.data.filter(item => item.id !== id)
        }
      })),
      updateBatchItem: (id, item) => set((state) => ({
        batchConfig: {
          ...state.batchConfig,
          data: state.batchConfig.data.map(i => 
            i.id === id ? { ...i, ...item } : i
          )
        }
      })),
      clearBatchItems: () => set((state) => ({
        batchConfig: { ...state.batchConfig, data: [] }
      })),
      setBatchData: (data) => set((state) => ({
        batchConfig: { ...state.batchConfig, data }
      })),
      
      // 已标记内容缓存
      usedContents: [] as string[],

      // Toggle used status for a single item (同时更新缓存)
      toggleUsed: (id: string) => set((state) => {
        const item = state.batchConfig.data.find((i: BatchItem) => i.id === id);
        if (!item) return state;

        const isCurrentlyUsed = item.used;
        const newUsedContents = isCurrentlyUsed
          ? state.usedContents.filter((c: string) => c !== item.content)
          : [...state.usedContents, item.content];

        return {
          usedContents: newUsedContents,
          batchConfig: {
            ...state.batchConfig,
            data: state.batchConfig.data.map((i: BatchItem) =>
              i.id === id ? { ...i, used: !i.used } : i
            )
          }
        };
      }),

      // Clear all used statuses
      clearAllUsed: () => set((state) => ({
        usedContents: [] as string[],
        batchConfig: {
          ...state.batchConfig,
          data: state.batchConfig.data.map((item: BatchItem) => ({ ...item, used: false }))
        }
      })),

      // Generation progress (not persisted - in memory only)
      generating: false,
      progress: 0,
      setGenerating: (generating: boolean) => set({ generating }),
      setProgress: (progress: number) => set({ progress }),

      // Input and mode settings (persisted)
      inputText: '',
      autoMode: true,
      manualMode: 'single' as const,
      exportSettings: defaultExportSettings,
      previewSettings: defaultPreviewSettings,

      // Actions for persisted state
      setInputText: (inputText: string) => set({ inputText }),
      setAutoMode: (autoMode: boolean) => set({ autoMode }),
      setManualMode: (manualMode: 'single' | 'batch') => set({ manualMode }),
      setExportSettings: (settings: Partial<ExportSettings>) => set((state) => ({
        exportSettings: { ...state.exportSettings, ...settings }
      })),
      setPreviewSettings: (settings: Partial<PreviewSettings>) => set((state) => ({
        previewSettings: { ...state.previewSettings, ...settings }
      })),
    }),
    {
      name: 'qrcode-toolbox-config',
      partialize: (state) => ({
        singleConfig: state.singleConfig,
        batchConfig: {
          globalStyle: state.batchConfig.globalStyle,
          exportFormat: state.batchConfig.exportFormat,
          filenamePattern: state.batchConfig.filenamePattern,
        },
        inputText: state.inputText,
        autoMode: state.autoMode,
        manualMode: state.manualMode,
        exportSettings: state.exportSettings,
        previewSettings: state.previewSettings,
        usedContents: state.usedContents, // 持久化已标记内容
      }),
      version: 2, // 版本号升级
      // 合并恢复的状态与默认状态，确保所有字段都存在
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<QRCodeState> || {};
        return {
          ...currentState,
          ...persisted,
          // 确保 batchConfig 正确合并，data 始终是数组
          batchConfig: {
            ...currentState.batchConfig,
            ...(persisted.batchConfig || {}),
            data: currentState.batchConfig.data, // data 不持久化，始终使用默认空数组
          },
          // 确保 exportSettings 正确合并
          exportSettings: {
            ...currentState.exportSettings,
            ...(persisted.exportSettings || {}),
          },
          // 确保 previewSettings 正确合并
          previewSettings: {
            ...currentState.previewSettings,
            ...(persisted.previewSettings || {}),
          },
          // 确保 singleConfig 正确合并
          singleConfig: {
            ...currentState.singleConfig,
            ...(persisted.singleConfig || {}),
          },
          // 确保 usedContents 是数组
          usedContents: persisted.usedContents || [],
        };
      },
      // 添加错误处理，防止损坏的状态导致空白页
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate state:', error);
          // 清除损坏的存储
          try {
            localStorage.removeItem('qrcode-toolbox-config');
          } catch (e) {
            console.error('Failed to clear storage:', e);
          }
        }
      },
    }
  )
);
