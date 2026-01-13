import QRCode from 'qrcode';
import { QRCodeConfig } from '../types';

export interface GenerateOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
  logo?: string;
  logoWidth?: number;
  logoHeight?: number;
}

export async function generateQRCode(
  content: string,
  options: GenerateOptions = {}
): Promise<string> {
  const {
    width = 256,
    margin = 2,
    errorCorrectionLevel = 'M',
    color = { dark: '#000000', light: '#ffffff' },
    logo,
    logoWidth,
  } = options;

  const opts = {
    width,
    margin,
    errorCorrectionLevel,
    color,
  };

  // If no logo, generate basic QR code
  if (!logo) {
    return await QRCode.toDataURL(content, opts);
  }

  // If has logo, generate and embed
  const qrDataUrl = await QRCode.toDataURL(content, {
    ...opts,
    width: width * 4, // Increase resolution to support logo
  });

  // Compose logo on canvas
  return await embedLogo(qrDataUrl, logo, logoWidth, width);
}

async function embedLogo(
  qrDataUrl: string,
  logoUrl: string,
  logoWidth?: number,
  qrWidth?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const qrImg = new Image();
    const logoImg = new Image();
    
    qrImg.onload = () => {
      logoImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const qrSize = qrWidth || qrImg.width;
        canvas.width = qrSize;
        canvas.height = qrSize;
        
        // Draw QR code
        ctx?.drawImage(qrImg, 0, 0, qrSize, qrSize);
        
        // Calculate logo size and position
        const logoSize = qrSize * (logoWidth || 0.2);
        const logoX = (qrSize - logoSize) / 2;
        const logoY = (qrSize - logoSize) / 2;
        
        // Draw white background
        ctx!.fillStyle = '#ffffff';
        ctx!.fillRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10);
        
        // Draw logo
        ctx?.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      logoImg.onerror = reject;
      logoImg.src = logoUrl;
    };
    
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });
}

export function configToOptions(config: Partial<QRCodeConfig>): GenerateOptions {
  return {
    width: config.width,
    margin: config.margin,
    errorCorrectionLevel: config.errorCorrectionLevel,
    color: {
      dark: config.foregroundColor,
      light: config.backgroundColor,
    },
    logo: config.logo,
    logoWidth: config.logoWidth,
    logoHeight: config.logoHeight,
  };
}

export async function generateBatchQRCode(
  items: { content: string; options?: GenerateOptions }[],
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const { content, options } = items[i];
    const qrDataUrl = await generateQRCode(content, options);
    results.push(qrDataUrl);
    
    onProgress?.(i + 1, items.length);
  }
  
  return results;
}
