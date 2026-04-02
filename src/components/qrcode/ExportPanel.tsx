import { useEffect, useRef, useCallback } from 'react';
import { QRCodeConfig } from '@/types';
import { exportQRCode, exportBatchQRCode, exportBatchAsPDF, exportBatchAsCollage } from '@/lib/fileOperations';
import { useQRCodeStore } from '@/stores';
import { configToOptions } from '@/lib/qrcode';
import { generateFilename } from '@/lib/utils';

interface ExportPanelProps {
  dataUrl: string;
  config: QRCodeConfig;
  mode: 'single' | 'batch';
}

export function ExportPanel({ dataUrl, config, mode }: ExportPanelProps) {
  const { batchConfig, setGenerating, setProgress } = useQRCodeStore();

  // 使用 ref 保存最新的 batchData 和 config
  const batchDataRef = useRef(batchConfig?.data || []);
  const configRef = useRef(config);
  const batchConfigRef = useRef(batchConfig);

  // 更新 ref
  batchDataRef.current = batchConfig?.data || [];
  configRef.current = config;
  batchConfigRef.current = batchConfig;

  const handleSingleExport = useCallback(async (url: string, label?: string) => {
    if (!url) return;

    try {
      await exportQRCode(url, 'qrcode', 'png', label);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const handleBatchExport = useCallback(async (
    exportFormat: 'pdf' | 'multiple' | 'collage',
    colCount: number,
    rowCount: number
  ) => {
    const currentBatchData = batchDataRef.current;
    const currentConfig = configRef.current;
    const currentBatchConfig = batchConfigRef.current;

    if (currentBatchData.length === 0) {
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      // First generate all QR codes
      const qrCodesWithContent: { dataUrl: string; content: string; label?: string }[] = [];
      const options = configToOptions(currentConfig);

      for (let i = 0; i < currentBatchData.length; i++) {
        const item = currentBatchData[i];

        const { generateQRCode } = await import('@/lib/qrcode');
        const qrDataUrl = await generateQRCode(item.content, options);

        qrCodesWithContent.push({ dataUrl: qrDataUrl, content: item.content, label: item.label });
        setProgress(((i + 1) / currentBatchData.length) * 50);
      }

      // Then export based on selected type
      if (exportFormat === 'pdf') {
        await exportBatchAsPDF(qrCodesWithContent, {
          title: 'QR Codes',
          columns: colCount,
          rows: rowCount,
        });
      } else if (exportFormat === 'collage') {
        await exportBatchAsCollage(qrCodesWithContent, {
          columns: colCount,
          cellSize: currentConfig.width,
          title: 'QR Codes'
        });
      } else {
        // Multiple files (ZIP)
        const qrCodes = qrCodesWithContent.map((item, index) => ({
          dataUrl: item.dataUrl,
          filename: generateFilename(
            currentBatchConfig.filenamePattern || 'qr_{index}',
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
  }, [setGenerating, setProgress]);

  // 监听来自 QRCodeGenerator 的导出事件
  useEffect(() => {
    const handleExport = (event: CustomEvent) => {
      const { format, columns, rows } = event.detail;

      if (mode === 'single') {
        handleSingleExport(dataUrl, configRef.current.label);
      } else {
        handleBatchExport(format, columns, rows);
      }
    };

    window.addEventListener('qrcode-export', handleExport as EventListener);
    return () => window.removeEventListener('qrcode-export', handleExport as EventListener);
  }, [mode, dataUrl, handleSingleExport, handleBatchExport]);

  return null;
}
