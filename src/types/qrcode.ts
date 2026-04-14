export interface QRCodeConfig {
  content: string;
  label?: string;
  width: number;
  margin: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  foregroundColor: string;
  backgroundColor: string;
  logo?: string;
  logoWidth?: number;
  logoHeight?: number;
  style: 'square' | 'dot' | 'rounded';
}

export interface BatchItem {
  id: string;
  content: string;
  label?: string;
  customStyle?: Partial<QRCodeConfig>;
  filename?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  used?: boolean;
  error?: string;
}

export interface BatchConfig {
  data: BatchItem[];
  globalStyle: QRCodeConfig;
  exportFormat: 'png' | 'jpeg';
  filenamePattern: string;
}

export interface ExportSettings {
  format: 'pdf' | 'multiple' | 'collage';
  itemsPerPage: number;
  columns: number;
  rows: number;
  splitThreshold: number;
  expanded: boolean;
}

export interface PreviewSettings {
  columns: number;
  size: number;
  rowHeight: number;
}

export interface QRCodeTab {
  id: string;
  name: string;
  singleConfig: QRCodeConfig;
  batchConfig: BatchConfig;
  usedContents: string[];
  inputText: string;
  autoMode: boolean;
  manualMode: 'single' | 'batch';
  exportSettings: ExportSettings;
  previewSettings: PreviewSettings;
}

export type Theme = 'light' | 'dark' | 'system';

export interface ExportConfig {
  format: 'png' | 'jpeg';
  quality: number;
  filename: string;
}

export type ImportSource =
  | { type: 'excel'; file: File }
  | { type: 'csv'; file: File }
  | { type: 'text'; file: File }
  | { type: 'manual'; items: string[] };
