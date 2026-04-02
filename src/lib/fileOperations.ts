import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const EXPORT_CANCELLED_ERROR = 'EXPORT_CANCELLED';

interface ExportProgressOptions {
  onProgress?: (current: number, total: number) => void;
  shouldCancel?: () => boolean;
}

interface PDFExportOptions extends ExportProgressOptions {
  title?: string;
  pageSize?: { width: number; height: number };
  itemsPerPage?: number;
  columns?: number;
  rows?: number;
  qrSize?: number;
}

interface CollageExportOptions extends ExportProgressOptions {
  columns?: number;
  cellSize?: number;
  gap?: number;
  title?: string;
}

export interface ImportColumnOption {
  id: string;
  header: string;
  index: number;
}

export interface ParsedBatchImportData {
  fileType: 'spreadsheet' | 'text';
  fileName: string;
  columns: ImportColumnOption[];
  rows: string[][];
  textLines: string[];
}

interface DecodedCsvCandidate {
  text: string;
  score: number;
}

function throwIfCancelled(shouldCancel?: () => boolean) {
  if (shouldCancel?.()) {
    throw new Error(EXPORT_CANCELLED_ERROR);
  }
}

export async function importFromExcel(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  const contents: string[] = [];

  for (const row of rows as unknown[][]) {
    const content = row[0]?.toString();
    if (content && content.trim()) {
      contents.push(content);
    }
  }

  return contents;
}

export async function importFromText(file: File): Promise<string[]> {
  const text = await file.text();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function normalizeHeaderRow(row: unknown[]): string[] {
  const seenHeaders = new Map<string, number>();

  return row.map((cell, index) => {
    const baseHeader = String(cell ?? '').trim() || `列${index + 1}`;
    const duplicateCount = seenHeaders.get(baseHeader) || 0;
    seenHeaders.set(baseHeader, duplicateCount + 1);

    return duplicateCount === 0
      ? baseHeader
      : `${baseHeader} (${duplicateCount + 1})`;
  });
}

function scoreDecodedCsvText(text: string): number {
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const suspiciousCount = (
    text.match(/[ÃÂÅÆÇÐÑÓÔÕÖ×ØÙÚÛÜÝÞãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ]/g) || []
  ).length;
  const cjkCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;

  return cjkCount * 2 - replacementCount * 20 - suspiciousCount;
}

function decodeCsvArrayBuffer(data: ArrayBuffer): string {
  const candidates: DecodedCsvCandidate[] = [];
  const encodings: Array<'utf-8' | 'gb18030'> = ['utf-8', 'gb18030'];

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, {
        fatal: false,
      });
      const text = decoder.decode(data);
      candidates.push({
        text,
        score: scoreDecodedCsvText(text),
      });
    } catch (error) {
      console.error(`Failed to decode CSV with ${encoding}:`, error);
    }
  }

  if (candidates.length === 0) {
    return new TextDecoder().decode(data);
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0].text;
}

export async function parseBatchImportFile(
  file: File
): Promise<ParsedBatchImportData> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.txt')) {
    const textLines = await importFromText(file);
    return {
      fileType: 'text',
      fileName,
      columns: [],
      rows: textLines.map((line) => [line]),
      textLines,
    };
  }

  const data = await file.arrayBuffer();
  const workbook = lowerName.endsWith('.csv')
    ? XLSX.read(decodeCsvArrayBuffer(data), { type: 'string', raw: false })
    : XLSX.read(data, { type: 'array', raw: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: '',
    blankrows: false,
  }) as unknown[][];

  const rows = rawRows
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (rows.length === 0) {
    return {
      fileType: 'spreadsheet',
      fileName,
      columns: [],
      rows: [],
      textLines: [],
    };
  }

  const headers = normalizeHeaderRow(rows[0]);
  const dataRows = rows.slice(1).map((row) =>
    headers.map((_, index) => row[index] || '')
  );

  return {
    fileType: 'spreadsheet',
    fileName,
    columns: headers.map((header, index) => ({
      id: `${index}`,
      header,
      index,
    })),
    rows: dataRows,
    textLines: [],
  };
}

export function buildBatchContentsFromColumns(
  rows: string[][],
  selectedColumnIndexes: number[],
  order: 'row-major' | 'column-major'
): string[] {
  const contents: string[] = [];

  if (selectedColumnIndexes.length === 0 || rows.length === 0) {
    return contents;
  }

  if (order === 'row-major') {
    for (const row of rows) {
      for (const columnIndex of selectedColumnIndexes) {
        const value = row[columnIndex]?.trim();
        if (value) {
          contents.push(value);
        }
      }
    }
    return contents;
  }

  for (const columnIndex of selectedColumnIndexes) {
    for (const row of rows) {
      const value = row[columnIndex]?.trim();
      if (value) {
        contents.push(value);
      }
    }
  }

  return contents;
}

export async function exportQRCode(
  dataUrl: string,
  filename: string,
  format: 'png' | 'jpeg',
  label?: string
): Promise<void> {
  let blob: Blob;

  if (label) {
    blob = await composeQRCodeWithLabel(dataUrl, label);
  } else {
    const response = await fetch(dataUrl);
    blob = await response.blob();
  }

  const ext = format === 'png' ? 'png' : 'jpg';
  const fullFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;

  saveAs(blob, fullFilename);
}

export async function exportBatchQRCode(
  qrCodes: { dataUrl: string; filename: string }[],
  format: 'png' | 'jpeg',
  options: ExportProgressOptions = {}
): Promise<void> {
  const zip = new JSZip();
  const ext = format === 'png' ? 'png' : 'jpg';
  const { onProgress, shouldCancel } = options;

  for (let index = 0; index < qrCodes.length; index += 1) {
    throwIfCancelled(shouldCancel);

    const { dataUrl, filename } = qrCodes[index];
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const fullFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;

    zip.file(fullFilename, blob);
    onProgress?.(index + 1, qrCodes.length);
  }

  throwIfCancelled(shouldCancel);

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `qr-codes-${Date.now()}.zip`);
}

export async function exportBlobBundleAsZip(
  files: { filename: string; blob: Blob }[],
  bundleName: string,
  options: ExportProgressOptions = {}
): Promise<void> {
  const zip = new JSZip();
  const { onProgress, shouldCancel } = options;

  for (let index = 0; index < files.length; index += 1) {
    throwIfCancelled(shouldCancel);

    const file = files[index];
    zip.file(file.filename, file.blob);
    onProgress?.(index + 1, files.length);
  }

  throwIfCancelled(shouldCancel);

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, bundleName);
}

export async function createBatchPDFBlob(
  qrCodes: { dataUrl: string; content: string; label?: string }[],
  options: PDFExportOptions = {}
): Promise<Blob> {
  const {
    title = 'QR Codes',
    pageSize = { width: 210, height: 297 },
    columns,
    rows,
    qrSize,
    onProgress,
    shouldCancel,
  } = options;

  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: pageSize.width > pageSize.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageSize.width, pageSize.height],
  });

  const cols = columns ?? Math.ceil(Math.sqrt(options.itemsPerPage || 12));
  const rowsPerPage = rows ?? Math.ceil((options.itemsPerPage || 12) / cols);
  const margin = 10;
  const gap = 12;
  const titleHeight = 10;
  const textHeight = 16;
  const bottomMargin = 8;
  const availableWidth = pageSize.width - margin * 2;
  const availableHeight = pageSize.height - margin * 2 - titleHeight - bottomMargin;

  const finalQrSize =
    qrSize ||
    Math.min(
      (availableWidth - (cols - 1) * gap) / cols,
      (availableHeight - (rowsPerPage - 1) * gap - textHeight * rowsPerPage) /
        rowsPerPage
    );

  const actualItemsPerPage = cols * rowsPerPage;
  const totalPages = Math.ceil(qrCodes.length / actualItemsPerPage);

  for (let page = 0; page < totalPages; page += 1) {
    throwIfCancelled(shouldCancel);

    if (page > 0) {
      doc.addPage();
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${title} - ${page + 1}/${totalPages} (${cols}x${rowsPerPage}=${actualItemsPerPage}/page)`,
      pageSize.width / 2,
      6,
      { align: 'center' }
    );

    for (let i = 0; i < actualItemsPerPage; i += 1) {
      const index = page * actualItemsPerPage + i;
      if (index >= qrCodes.length) break;

      throwIfCancelled(shouldCancel);

      const { dataUrl, content, label } = qrCodes[index];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cellWidth = (availableWidth - (cols - 1) * gap) / cols + gap;
      const cellHeight = finalQrSize + textHeight + gap;
      const x = margin + col * cellWidth;
      const y = margin + titleHeight + row * cellHeight;

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        doc.addImage(base64, 'PNG', x, y, finalQrSize, finalQrSize);

        doc.setFontSize(Math.max(7, Math.min(9, finalQrSize / 5)));
        doc.setFont('helvetica', 'normal');
        doc.text(`#${index + 1}`, x, y + finalQrSize + 4);

        doc.setFontSize(Math.max(6, Math.min(8, finalQrSize / 6)));
        const maxWidth = cellWidth - gap;
        const contentLines = doc.splitTextToSize(content, maxWidth);
        doc.text(contentLines, x + finalQrSize / 2, y + finalQrSize + 8, {
          align: 'center',
        });

        if (label) {
          const contentHeight = contentLines.length * 3;
          doc.setFontSize(Math.max(6, Math.min(8, finalQrSize / 6)));
          doc.setFont('helvetica', 'bold');
          const labelLines = doc.splitTextToSize(label, maxWidth);
          doc.text(
            labelLines,
            x + finalQrSize / 2,
            y + finalQrSize + 8 + contentHeight + 1,
            { align: 'center' }
          );
        }
      } catch (error) {
        console.error('Failed to add QR code image:', error);
      }

      onProgress?.(index + 1, qrCodes.length);
    }
  }

  throwIfCancelled(shouldCancel);
  return doc.output('blob');
}

export async function exportBatchAsPDF(
  qrCodes: { dataUrl: string; content: string; label?: string }[],
  options: PDFExportOptions = {}
): Promise<void> {
  const title = options.title || 'QR Codes';
  const blob = await createBatchPDFBlob(qrCodes, options);
  saveAs(blob, `${title}-${Date.now()}.pdf`);
}

export async function createBatchCollageBlob(
  qrCodes: { dataUrl: string; content: string; label?: string }[],
  options: CollageExportOptions = {}
): Promise<Blob> {
  const {
    columns = 3,
    cellSize = 300,
    gap = 20,
    title = 'QR Codes',
    onProgress,
    shouldCancel,
  } = options;

  const rows = Math.ceil(qrCodes.length / columns);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const width = columns * cellSize + (columns - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap + 50;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 35);

  for (let index = 0; index < qrCodes.length; index += 1) {
    throwIfCancelled(shouldCancel);

    const { dataUrl, label } = qrCodes[index];
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * (cellSize + gap);
    const y = row * (cellSize + gap) + 50;

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const img = await loadImage(blob);

      ctx.drawImage(img, x, y, cellSize, cellSize);

      ctx.fillStyle = '#666666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${index + 1}`, x + cellSize / 2, y + cellSize + 20);

      if (label) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(label, x + cellSize / 2, y + cellSize + 38);
      }
    } catch (error) {
      console.error('Failed to draw QR code:', error);
    }

    onProgress?.(index + 1, qrCodes.length);
  }

  throwIfCancelled(shouldCancel);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create collage image'));
      }
    }, 'image/png');
  });
}

export async function exportBatchAsCollage(
  qrCodes: { dataUrl: string; content: string; label?: string }[],
  options: CollageExportOptions = {}
): Promise<void> {
  const title = options.title || 'QR Codes';
  const blob = await createBatchCollageBlob(qrCodes, options);
  saveAs(blob, `${title}-${Date.now()}.png`);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };
    img.src = objectUrl;
  });
}

async function composeQRCodeWithLabel(dataUrl: string, label: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const labelHeight = 30;
  const padding = 10;
  canvas.width = img.width;
  canvas.height = img.height + labelHeight + padding;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, img.width / 2, img.height + labelHeight / 2 + 5);

  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}
