export interface QRCodeConfig {
  content: string;
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
  customStyle?: Partial<QRCodeConfig>;
  filename?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface BatchConfig {
  data: BatchItem[];
  globalStyle: QRCodeConfig;
  exportFormat: 'png' | 'jpeg';
  filenamePattern: string;
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
