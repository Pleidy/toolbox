import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QRCodeConfig, BatchItem, BatchConfig } from '../types';

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
  rows: number;
  expanded: boolean;
}

interface PreviewSettings {
  columns: number;
  size: number;
  rowHeight: number;
}

interface QRCodeState {
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
  setGenerating: (generating: boolean) => void;
  setProgress: (progress: number) => void;

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

const defaultExportSettings: ExportSettings = {
  format: 'pdf',
  itemsPerPage: 12,
  columns: 3,
  rows: 4,
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
      singleConfig: defaultSingleConfig,
      setSingleConfig: (config) =>
        set((state) => ({
          singleConfig: { ...state.singleConfig, ...config },
        })),

      batchConfig: defaultBatchConfig,
      setBatchConfig: (config) =>
        set((state) => ({
          batchConfig: { ...state.batchConfig, ...config },
        })),
      removeBatchItem: (id) =>
        set((state) => ({
          batchConfig: {
            ...state.batchConfig,
            data: state.batchConfig.data.filter((item) => item.id !== id),
          },
        })),
      updateBatchItem: (id, item) =>
        set((state) => ({
          batchConfig: {
            ...state.batchConfig,
            data: state.batchConfig.data.map((entry) =>
              entry.id === id ? { ...entry, ...item } : entry
            ),
          },
        })),
      clearBatchItems: () =>
        set((state) => ({
          batchConfig: { ...state.batchConfig, data: [] },
        })),
      setBatchData: (data) =>
        set((state) => {
          const usedContents = new Set(state.usedContents);

          return {
            batchConfig: {
              ...state.batchConfig,
              data: data.map((item) => ({
                ...item,
                used: item.used ?? usedContents.has(item.content),
              })),
            },
          };
        }),

      usedContents: [],

      toggleUsed: (id) =>
        set((state) => {
          const item = state.batchConfig.data.find((entry) => entry.id === id);
          if (!item) return state;

          const newUsedContents = item.used
            ? state.usedContents.filter((content) => content !== item.content)
            : [...state.usedContents, item.content];

          return {
            usedContents: newUsedContents,
            batchConfig: {
              ...state.batchConfig,
              data: state.batchConfig.data.map((entry) =>
                entry.id === id ? { ...entry, used: !entry.used } : entry
              ),
            },
          };
        }),

      clearAllUsed: () =>
        set((state) => ({
          usedContents: [],
          batchConfig: {
            ...state.batchConfig,
            data: state.batchConfig.data.map((item) => ({ ...item, used: false })),
          },
        })),

      generating: false,
      progress: 0,
      setGenerating: (generating) => set({ generating }),
      setProgress: (progress) => set({ progress }),

      inputText: '',
      autoMode: true,
      manualMode: 'single',
      exportSettings: defaultExportSettings,
      previewSettings: defaultPreviewSettings,

      setInputText: (inputText) => set({ inputText }),
      setAutoMode: (autoMode) => set({ autoMode }),
      setManualMode: (manualMode) => set({ manualMode }),
      setExportSettings: (settings) =>
        set((state) => ({
          exportSettings: { ...state.exportSettings, ...settings },
        })),
      setPreviewSettings: (settings) =>
        set((state) => ({
          previewSettings: { ...state.previewSettings, ...settings },
        })),
    }),
    {
      name: 'toolbox-config',
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
        usedContents: state.usedContents,
      }),
      version: 2,
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<QRCodeState>) || {};

        return {
          ...currentState,
          ...persisted,
          batchConfig: {
            ...currentState.batchConfig,
            ...(persisted.batchConfig || {}),
            data: currentState.batchConfig.data,
          },
          exportSettings: {
            ...currentState.exportSettings,
            ...(persisted.exportSettings || {}),
            rows: persisted.exportSettings?.rows || currentState.exportSettings.rows,
            columns:
              persisted.exportSettings?.columns || currentState.exportSettings.columns,
          },
          previewSettings: {
            ...currentState.previewSettings,
            ...(persisted.previewSettings || {}),
          },
          singleConfig: {
            ...currentState.singleConfig,
            ...(persisted.singleConfig || {}),
          },
          usedContents: persisted.usedContents || [],
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
