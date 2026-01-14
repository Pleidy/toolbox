import { create } from 'zustand';
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
  
  // Generation progress
  generating: boolean;
  progress: number;
  setGenerating: (generating: boolean) => void;
  setProgress: (progress: number) => void;
}

export const useQRCodeStore = create<QRCodeState>((set) => ({
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
  
  // Generation progress
  generating: false,
  progress: 0,
  setGenerating: (generating) => set({ generating }),
  setProgress: (progress) => set({ progress }),
}));
