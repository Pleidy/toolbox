import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Import Excel/CSV
export async function importFromExcel(file: File): Promise<string[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
  
  // Return all non-empty data from first column
  const contents: string[] = [];
  for (const row of rows as unknown[][]) {
    const content = row[0]?.toString();
    if (content && content.trim()) {
      contents.push(content);
    }
  }
  return contents;
}

// Import text file
export async function importFromText(file: File): Promise<string[]> {
  const text = await file.text();
  return text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

// Export single QR code
export async function exportQRCode(
  dataUrl: string,
  filename: string,
  format: 'png' | 'jpeg',
  label?: string
): Promise<void> {
  let blob: Blob;
  
  if (label) {
    // Compose QR code with label on canvas
    blob = await composeQRCodeWithLabel(dataUrl, label);
  } else {
    // Convert dataUrl to Blob directly
    const response = await fetch(dataUrl);
    blob = await response.blob();
  }
  
  // Add file extension
  const ext = format === 'png' ? 'png' : 'jpg';
  const fullFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
  
  saveAs(blob, fullFilename);
}

// Batch export as ZIP
export async function exportBatchQRCode(
  qrCodes: { dataUrl: string; filename: string }[],
  format: 'png' | 'jpeg'
): Promise<void> {
  const zip = new JSZip();
  const ext = format === 'png' ? 'png' : 'jpg';
  
  for (const { dataUrl, filename } of qrCodes) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const fullFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
    
    zip.file(fullFilename, blob);
  }
  
  // Generate and download ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `qr-codes-${Date.now()}.zip`);
}

// Get filename pattern
export function generateFilename(pattern: string, index: number, content: string): string {
  const ext = pattern.endsWith('.png') || pattern.endsWith('.jpg') 
    ? pattern 
    : `${pattern}`;
  
  return ext
    .replace('{index}', String(index).padStart(3, '0'))
    .replace('{content}', content.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_'))
    .replace('{timestamp}', Date.now().toString());
}

// Export batch as PDF (with adaptive grid layout)
export async function exportBatchAsPDF(
  qrCodes: { dataUrl: string; content: string; label?: string }[],
  options: {
    title?: string;
    pageSize?: { width: number; height: number };
    itemsPerPage?: number;  // Number of QR codes per page (auto-calculate grid)
    columns?: number;       // Number of columns per page
    rows?: number;          // Number of rows per page
    qrSize?: number;        // Size of each QR code in mm (optional, auto-calculate if not set)
  } = {}
): Promise<void> {
  const {
    title = 'QR Codes',
    pageSize = { width: 210, height: 297 }, // A4 size in mm
    columns,
    rows,
    qrSize              // Optional, will auto-calculate if not provided
  } = options;

  console.log('exportBatchAsPDF options:', { columns, rows, itemsPerPage: options.itemsPerPage });

  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: pageSize.width > pageSize.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageSize.width, pageSize.height],
  });

  // Use provided columns/rows directly if available
  const cols = columns ?? Math.ceil(Math.sqrt(options.itemsPerPage || 12));
  const rowsPerPage = rows ?? Math.ceil((options.itemsPerPage || 12) / cols);

  console.log('PDF layout:', { cols, rowsPerPage, itemsPerPage: cols * rowsPerPage });
  
  // Calculate QR code size based on page size and grid
  const margin = 10; // mm - 页边距
  const gap = 12; // mm - 二维码之间的间距（增大）
  const titleHeight = 10; // mm for page title
  const textHeight = 16; // mm - 二维码下方文字区域高度
  const bottomMargin = 8; // mm - 底部额外边距，确保最后一行标签可见

  // Available space for QR codes
  const availableWidth = pageSize.width - margin * 2;
  const availableHeight = pageSize.height - margin * 2 - titleHeight - bottomMargin;

  // Calculate QR size (use provided or auto-calculate)
  // 每个单元格高度 = 二维码高度 + 文字区域高度
  // 总高度 = 行数 * 单元格高度 + (行数-1) * 间距
  const finalQrSize = qrSize || Math.min(
    (availableWidth - (cols - 1) * gap) / cols,
    (availableHeight - (rowsPerPage - 1) * gap - textHeight * rowsPerPage) / rowsPerPage
  );

  const actualItemsPerPage = cols * rowsPerPage;
  const totalPages = Math.ceil(qrCodes.length / actualItemsPerPage);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    // Add page title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${title} - 第 ${page + 1}/${totalPages} 页 (${cols}×${rowsPerPage}=${actualItemsPerPage}/页)`, pageSize.width / 2, 6, { align: 'center' });

    // Draw each QR code on this page
    for (let i = 0; i < actualItemsPerPage; i++) {
      const index = page * actualItemsPerPage + i;
      if (index >= qrCodes.length) break;

      const { dataUrl, content, label } = qrCodes[index];

      const col = i % cols;
      const row = Math.floor(i / cols);

      // Calculate position with larger spacing
      const cellWidth = (availableWidth - (cols - 1) * gap) / cols + gap;
      const cellHeight = finalQrSize + textHeight + gap;
      const x = margin + col * cellWidth;
      const y = margin + titleHeight + row * cellHeight;

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);

        // Add QR code image
        doc.addImage(base64, 'PNG', x, y, finalQrSize, finalQrSize);

        // Add index number - 字体增大
        doc.setFontSize(Math.max(8, Math.min(10, finalQrSize / 4)));
        doc.setFont('helvetica', 'normal');
        const indexText = `#${index + 1}`;
        doc.text(indexText, x, y + finalQrSize + 4);

        // Add content preview - 字体增大
        const maxChars = Math.floor(finalQrSize / 2);
        const contentPreview = content.length > maxChars ? content.substring(0, maxChars) + '...' : content;
        doc.setFontSize(Math.max(7, Math.min(9, finalQrSize / 5)));
        doc.text(contentPreview, x + finalQrSize / 2, y + finalQrSize + 8, { align: 'center' });

        // Add label below content preview if present - 字体增大
        if (label) {
          doc.setFontSize(Math.max(7, Math.min(9, finalQrSize / 5)));
          doc.setFont('helvetica', 'bold');
          const labelText = label.length > 20 ? label.substring(0, 20) + '...' : label;
          doc.text(labelText, x + finalQrSize / 2, y + finalQrSize + 13, { align: 'center' });
        }

      } catch (error) {
        console.error('Failed to add QR code image:', error);
      }
    }
  }
  
  doc.save(`${title}-${Date.now()}.pdf`);
}

// Export batch as single image (grid collage)
export async function exportBatchAsCollage(
  qrCodes: { dataUrl: string; content: string; label?: string }[],
  options: { columns?: number; cellSize?: number; gap?: number; title?: string } = {}
): Promise<void> {
  const { columns = 3, cellSize = 300, gap = 20, title = 'QR Codes' } = options;
  
  const rows = Math.ceil(qrCodes.length / columns);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Calculate canvas size
  const width = columns * cellSize + (columns - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap + 50; // Extra 50px for title
  
  canvas.width = width;
  canvas.height = height;
  
  // Fill background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Add title
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 35);
  
  // Draw each QR code
  for (let i = 0; i < qrCodes.length; i++) {
    const { dataUrl, label } = qrCodes[i];
    
    const col = i % columns;
    const row = Math.floor(i / columns);
    
    const x = col * (cellSize + gap);
    const y = row * (cellSize + gap) + 50;
    
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const img = await loadImage(blob);
      
      ctx.drawImage(img, x, y, cellSize, cellSize);
      
      // Add index
      ctx.fillStyle = '#666666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${i + 1}`, x + cellSize / 2, y + cellSize + 20);
      
      // Add label below QR code if present
      if (label) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(label, x + cellSize / 2, y + cellSize + 38);
      }
    } catch (error) {
      console.error('Failed to draw QR code:', error);
    }
  }
  
  // Convert to blob and download
  canvas.toBlob((blob) => {
    if (blob) {
      saveAs(blob, `${title}-${Date.now()}.png`);
    }
  }, 'image/png');
}

// Helper function to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper function to load image from blob
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// Helper function to compose QR code with label on canvas
async function composeQRCodeWithLabel(dataUrl: string, label: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const img = await loadImage(blob);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Calculate canvas size - add space for label below
  const labelHeight = 30; // pixels for label
  const padding = 10;
  canvas.width = img.width;
  canvas.height = img.height + labelHeight + padding;
  
  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw QR code
  ctx.drawImage(img, 0, 0);
  
  // Draw label below QR code
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, img.width / 2, img.height + labelHeight / 2 + 5);
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Failed to create blob'));
    }, 'image/png');
  });
}
