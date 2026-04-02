import { useCallback, useEffect, useRef } from 'react';
import { QRCodeConfig } from '@/types';
import {
  createBatchCollageBlob,
  createBatchPDFBlob,
  EXPORT_CANCELLED_ERROR,
  exportBatchAsCollage,
  exportBatchAsPDF,
  exportBatchQRCode,
  exportBlobBundleAsZip,
  exportQRCode,
} from '@/lib/fileOperations';
import { useQRCodeStore } from '@/stores';
import { configToOptions, generateQRCode } from '@/lib/qrcode';
import { generateFilename } from '@/lib/utils';

interface ExportPanelProps {
  dataUrl: string;
  config: QRCodeConfig;
  mode: 'single' | 'batch';
}

interface QRCodeExportItem {
  dataUrl: string;
  content: string;
  label?: string;
}

const GENERATION_PROGRESS_WEIGHT = 60;
const EXPORT_PROGRESS_WEIGHT = 40;
const SPLIT_FILE_PROGRESS_WEIGHT = 30;
const SPLIT_ZIP_PROGRESS_WEIGHT = 10;

export function ExportPanel({ dataUrl, config, mode }: ExportPanelProps) {
  const {
    batchConfig,
    exportSettings,
    cancelRequested,
    setGenerating,
    setProgress,
    setProgressLabel,
    setCancelRequested,
    resetExportState,
  } = useQRCodeStore();

  const batchDataRef = useRef(batchConfig?.data || []);
  const configRef = useRef(config);
  const batchConfigRef = useRef(batchConfig);
  const exportSettingsRef = useRef(exportSettings);
  const cancelRequestedRef = useRef(cancelRequested);

  batchDataRef.current = batchConfig?.data || [];
  configRef.current = config;
  batchConfigRef.current = batchConfig;
  exportSettingsRef.current = exportSettings;

  useEffect(() => {
    cancelRequestedRef.current = cancelRequested;
  }, [cancelRequested]);

  const throwIfCancelled = () => {
    if (cancelRequestedRef.current) {
      throw new Error(EXPORT_CANCELLED_ERROR);
    }
  };

  const handleSingleExport = useCallback(async (url: string, label?: string) => {
    if (!url) return;

    try {
      await exportQRCode(url, 'qrcode', 'png', label);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  const generateBatchQRCodes = useCallback(async () => {
    const currentBatchData = batchDataRef.current;
    const currentConfig = configRef.current;
    const qrCodesWithContent: QRCodeExportItem[] = [];
    const options = configToOptions(currentConfig);
    const totalItems = currentBatchData.length;
    const generationChunkSize = Math.max(
      10,
      Math.min(50, Math.ceil(totalItems / 40))
    );

    for (let start = 0; start < totalItems; start += generationChunkSize) {
      throwIfCancelled();

      const chunk = currentBatchData.slice(start, start + generationChunkSize);
      setProgressLabel(
        `正在生成二维码 ${start + 1}-${Math.min(
          start + chunk.length,
          totalItems
        )}/${totalItems}`
      );

      for (let index = 0; index < chunk.length; index += 1) {
        throwIfCancelled();

        const item = chunk[index];
        const qrDataUrl = await generateQRCode(item.content, options);

        qrCodesWithContent.push({
          dataUrl: qrDataUrl,
          content: item.content,
          label: item.label,
        });

        const completed = start + index + 1;
        setProgress((completed / totalItems) * GENERATION_PROGRESS_WEIGHT);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    return qrCodesWithContent;
  }, [setProgress, setProgressLabel]);

  const exportSplitBundle = useCallback(
    async (
      exportFormat: 'pdf' | 'collage',
      qrCodesWithContent: QRCodeExportItem[],
      colCount: number,
      rowCount: number,
      splitThreshold: number
    ) => {
      const totalItems = qrCodesWithContent.length;
      const totalParts = Math.ceil(totalItems / splitThreshold);
      const splitFiles: { filename: string; blob: Blob }[] = [];

      for (let partIndex = 0; partIndex < totalParts; partIndex += 1) {
        throwIfCancelled();

        const start = partIndex * splitThreshold;
        const end = Math.min(start + splitThreshold, totalItems);
        const chunk = qrCodesWithContent.slice(start, end);
        const commonTitle = `QR Codes Part ${partIndex + 1}`;

        setProgressLabel(
          `正在拆分导出 ${partIndex + 1}/${totalParts} (${start + 1}-${end})`
        );

        const handleChunkProgress = (current: number) => {
          const overallCurrent = start + current;
          const overallRatio = overallCurrent / totalItems;
          setProgress(
            GENERATION_PROGRESS_WEIGHT +
              overallRatio * SPLIT_FILE_PROGRESS_WEIGHT
          );
        };

        if (exportFormat === 'pdf') {
          const blob = await createBatchPDFBlob(chunk, {
            title: commonTitle,
            columns: colCount,
            rows: rowCount,
            onProgress: handleChunkProgress,
            shouldCancel: () => cancelRequestedRef.current,
          });

          splitFiles.push({
            filename: `${commonTitle}.pdf`,
            blob,
          });
        } else {
          const blob = await createBatchCollageBlob(chunk, {
            title: commonTitle,
            columns: colCount,
            cellSize: configRef.current.width,
            onProgress: handleChunkProgress,
            shouldCancel: () => cancelRequestedRef.current,
          });

          splitFiles.push({
            filename: `${commonTitle}.png`,
            blob,
          });
        }
      }

      setProgressLabel('正在打包拆分文件...');
      await exportBlobBundleAsZip(
        splitFiles,
        `qr-codes-${exportFormat}-bundle-${Date.now()}.zip`,
        {
          onProgress: (current, total) => {
            setProgress(
              GENERATION_PROGRESS_WEIGHT +
                SPLIT_FILE_PROGRESS_WEIGHT +
                (current / total) * SPLIT_ZIP_PROGRESS_WEIGHT
            );
          },
          shouldCancel: () => cancelRequestedRef.current,
        }
      );
    },
    [setProgress, setProgressLabel]
  );

  const handleBatchExport = useCallback(
    async (
      exportFormat: 'pdf' | 'multiple' | 'collage',
      colCount: number,
      rowCount: number
    ) => {
      const currentBatchData = batchDataRef.current;
      const currentConfig = configRef.current;
      const currentBatchConfig = batchConfigRef.current;
      const currentExportSettings = exportSettingsRef.current;

      if (currentBatchData.length === 0) {
        return;
      }

      setCancelRequested(false);
      setGenerating(true);
      setProgress(0);
      setProgressLabel('准备导出...');

      try {
        const qrCodesWithContent = await generateBatchQRCodes();
        const splitThreshold = Math.max(0, currentExportSettings.splitThreshold || 0);
        const shouldSplit =
          splitThreshold > 0 &&
          qrCodesWithContent.length > splitThreshold &&
          exportFormat !== 'multiple';

        if (shouldSplit) {
          await exportSplitBundle(
            exportFormat === 'pdf' ? 'pdf' : 'collage',
            qrCodesWithContent,
            colCount,
            rowCount,
            splitThreshold
          );
        } else if (exportFormat === 'pdf') {
          setProgressLabel('正在写入 PDF...');
          await exportBatchAsPDF(qrCodesWithContent, {
            title: 'QR Codes',
            columns: colCount,
            rows: rowCount,
            onProgress: (current, total) => {
              setProgress(
                GENERATION_PROGRESS_WEIGHT +
                  (current / total) * EXPORT_PROGRESS_WEIGHT
              );
            },
            shouldCancel: () => cancelRequestedRef.current,
          });
        } else if (exportFormat === 'collage') {
          setProgressLabel('正在生成拼图...');
          await exportBatchAsCollage(qrCodesWithContent, {
            title: 'QR Codes',
            columns: colCount,
            cellSize: currentConfig.width,
            onProgress: (current, total) => {
              setProgress(
                GENERATION_PROGRESS_WEIGHT +
                  (current / total) * EXPORT_PROGRESS_WEIGHT
              );
            },
            shouldCancel: () => cancelRequestedRef.current,
          });
        } else {
          setProgressLabel('正在打包 ZIP...');
          const qrCodes = qrCodesWithContent.map((item, index) => ({
            dataUrl: item.dataUrl,
            filename: generateFilename(
              currentBatchConfig.filenamePattern || 'qr_{index}',
              index + 1,
              item.content
            ),
          }));

          await exportBatchQRCode(qrCodes, 'png', {
            onProgress: (current, total) => {
              setProgress(
                GENERATION_PROGRESS_WEIGHT +
                  (current / total) * EXPORT_PROGRESS_WEIGHT
              );
            },
            shouldCancel: () => cancelRequestedRef.current,
          });
        }

        setProgress(100);
        setProgressLabel('导出完成');
      } catch (error) {
        if (error instanceof Error && error.message === EXPORT_CANCELLED_ERROR) {
          setProgressLabel('导出已取消');
        } else {
          console.error('Batch export failed:', error);
          setProgressLabel('导出失败');
        }
      } finally {
        window.setTimeout(() => {
          resetExportState();
        }, 500);
      }
    },
    [
      exportSplitBundle,
      generateBatchQRCodes,
      resetExportState,
      setCancelRequested,
      setGenerating,
      setProgress,
      setProgressLabel,
    ]
  );

  useEffect(() => {
    const handleExport = (event: CustomEvent) => {
      const { format, columns, rows } = event.detail;

      if (mode === 'single') {
        void handleSingleExport(dataUrl, configRef.current.label);
      } else {
        void handleBatchExport(format, columns, rows);
      }
    };

    window.addEventListener('qrcode-export', handleExport as EventListener);
    return () =>
      window.removeEventListener('qrcode-export', handleExport as EventListener);
  }, [dataUrl, handleBatchExport, handleSingleExport, mode]);

  return null;
}
