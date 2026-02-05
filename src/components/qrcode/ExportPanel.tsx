import { useEffect } from 'react';
import { QRCodeConfig } from '@/types';
import { exportQRCode, exportBatchQRCode, exportBatchAsPDF, exportBatchAsCollage } from '@/lib/fileOperations';
import { useQRCodeStore } from '@/stores';
import { generateFilename } from '@/lib/utils';

interface ExportPanelProps {
  dataUrl: string;
  config: QRCodeConfig;
  mode: 'single' | 'batch';
}

export function ExportPanel({ dataUrl, config, mode }: ExportPanelProps) {
  const { batchConfig, setGenerating, setProgress } = useQRCodeStore();

  // 确保 data 是数组
  const batchData = batchConfig?.data || [];

  // 监听来自 QRCodeGenerator 的导出事件
  useEffect(() => {
    const handleExport = (event: CustomEvent) => {
      const { format, itemsPerPage, columns } = event.detail;

      // 延迟执行导出，确保状态已更新
      setTimeout(() => {
        if (mode === 'single') {
          handleSingleExport(dataUrl);
        } else {
          handleBatchExport(format, itemsPerPage, columns);
        }
      }, 50);
    };

    window.addEventListener('qrcode-export', handleExport as EventListener);
    return () => window.removeEventListener('qrcode-export', handleExport as EventListener);
  }, [mode, dataUrl, batchData, config]);

  const handleSingleExport = async (url: string) => {
    if (!url) return;

    try {
      await exportQRCode(url, 'qrcode', 'png');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleBatchExport = async (
    exportFormat: 'pdf' | 'multiple' | 'collage',
    pageCount: number,
    colCount: number
  ) => {
    if (batchData.length === 0) return;

    setGenerating(true);
    setProgress(0);

    try {
      // First generate all QR codes
      const qrCodesWithContent: { dataUrl: string; content: string }[] = [];

      for (let i = 0; i < batchData.length; i++) {
        const item = batchData[i];
        const options = {
          width: config.width,
          margin: config.margin,
          errorCorrectionLevel: config.errorCorrectionLevel,
          color: {
            dark: config.foregroundColor,
            light: config.backgroundColor,
          },
        };

        const { generateQRCode } = await import('@/lib/qrcode');
        const qrDataUrl = await generateQRCode(item.content, options);

        qrCodesWithContent.push({ dataUrl: qrDataUrl, content: item.content });
        setProgress(((i + 1) / batchData.length) * 50);
      }

      // Then export based on selected type
      if (exportFormat === 'pdf') {
        await exportBatchAsPDF(qrCodesWithContent, {
          title: 'QR Codes',
          itemsPerPage: pageCount,
        });
      } else if (exportFormat === 'collage') {
        await exportBatchAsCollage(qrCodesWithContent, {
          columns: colCount,
          cellSize: config.width,
          title: 'QR Codes'
        });
      } else {
        // Multiple files (ZIP)
        const qrCodes = qrCodesWithContent.map((item, index) => ({
          dataUrl: item.dataUrl,
          filename: generateFilename(
            batchConfig.filenamePattern || 'qr_{index}',
            index + 1,
            item.content
          ),
        }));

        await exportBatchQRCode(qrCodes, 'png');
      }

      setProgress(100);
    } catch (error) {
      console.error('Batch export failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  return null;
}
