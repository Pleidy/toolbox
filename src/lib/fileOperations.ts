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
  format: 'png' | 'jpeg'
): Promise<void> {
  // Convert dataUrl to Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
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
  qrCodes: { dataUrl: string; content: string }[],
  options: { 
    title?: string; 
    pageSize?: { width: number; height: number };
    itemsPerPage?: number;  // Number of QR codes per page (auto-calculate grid)
    qrSize?: number;        // Size of each QR code in mm (optional, auto-calculate if not set)
  } = {}
): Promise<void> {
  const { 
    title = 'QR Codes', 
    pageSize = { width: 210, height: 297 }, // A4 landscape size in mm
    itemsPerPage = 12,  // Default 12 per page
    qrSize              // Optional, will auto-calculate if not provided
  } = options;
  
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({
    orientation: pageSize.width > pageSize.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageSize.width, pageSize.height],
  });
  
  // Calculate optimal grid layout based on itemsPerPage
  // Try to make it as square as possible
  const cols = Math.ceil(Math.sqrt(itemsPerPage));
  const rows = Math.ceil(itemsPerPage / cols);
  
  // Calculate QR code size based on page size and grid
  const margin = 8; // mm
  const gap = 4; // mm
  const titleHeight = 8; // mm for page title
  
  // Available space for QR codes
  const availableWidth = pageSize.width - margin * 2;
  const availableHeight = pageSize.height - margin * 2 - titleHeight;
  
  // Calculate QR size (use provided or auto-calculate)
  const finalQrSize = qrSize || Math.min(
    (availableWidth - (cols - 1) * gap) / cols,
    (availableHeight - (rows - 1) * gap - 10) / rows  // -10 for text space
  );
  
  const actualItemsPerPage = cols * rows;
  const totalPages = Math.ceil(qrCodes.length / actualItemsPerPage);
  
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }
    
    // Add page title
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${title} - 第 ${page + 1}/${totalPages} 页 (${cols}×${rows}=${actualItemsPerPage}/页)`, pageSize.width / 2, 5, { align: 'center' });
    
    // Draw each QR code on this page
    for (let i = 0; i < actualItemsPerPage; i++) {
      const index = page * actualItemsPerPage + i;
      if (index >= qrCodes.length) break;
      
      const { dataUrl, content } = qrCodes[index];
      
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // Calculate position (centered)
      const x = margin + col * (finalQrSize + gap);
      const y = margin + titleHeight + row * (finalQrSize + 10);
      
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        
        // Add QR code image
        doc.addImage(base64, 'PNG', x, y, finalQrSize, finalQrSize);
        
        // Add index number
        doc.setFontSize(Math.min(6, finalQrSize / 5));
        doc.setFont('helvetica', 'normal');
        const indexText = `#${index + 1}`;
        doc.text(indexText, x, y + finalQrSize + 2);
        
        // Add content preview (truncate based on QR size)
        const maxChars = Math.floor(finalQrSize / 2.5);
        const contentPreview = content.length > maxChars ? content.substring(0, maxChars) + '...' : content;
        doc.setFontSize(Math.min(5, finalQrSize / 6));
        doc.text(contentPreview, x + finalQrSize / 2, y + finalQrSize + 5, { align: 'center' });
        
      } catch (error) {
        console.error('Failed to add QR code image:', error);
      }
    }
  }
  
  doc.save(`${title}-${Date.now()}.pdf`);
}

// Export batch as single image (grid collage)
export async function exportBatchAsCollage(
  qrCodes: { dataUrl: string; content: string }[],
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
    const { dataUrl } = qrCodes[i];
    
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
