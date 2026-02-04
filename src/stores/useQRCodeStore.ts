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
      
      // Generation progress (not persisted - in memory only)
      generating: false,
      progress: 0,
      setGenerating: (generating) => set({ generating }),
      setProgress: (progress) => set({ progress }),
      
      // Input and mode settings (persisted)
      inputText: '',
      autoMode: true,
      manualMode: 'single',
      exportSettings: defaultExportSettings,
      previewSettings: defaultPreviewSettings,
      
      // Actions for persisted state
      setInputText: (inputText) => set({ inputText }),
      setAutoMode: (autoMode) => set({ autoMode }),
      setManualMode: (manualMode) => set({ manualMode }),
      setExportSettings: (settings) => set((state) => ({
        exportSettings: { ...state.exportSettings, ...settings }
      })),
      setPreviewSettings: (settings) => set((state) => ({
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
      }),
      version: 1,
    }
  )
);
