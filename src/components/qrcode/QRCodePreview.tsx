import { useEffect, useState } from 'react';
import { QRCodeConfig } from '@/types';
import { generateQRCode, configToOptions } from '@/lib/qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface QRCodePreviewProps {
  config: QRCodeConfig;
  className?: string;
}

// 二维码最小尺寸
const MIN_QR_SIZE = 256;

export function QRCodePreview({ config, className }: QRCodePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const generate = async () => {
      setLoading(true);
      setError('');
      try {
        const dataUrl = await generateQRCode(config.content, configToOptions(config));
        setQrDataUrl(dataUrl);
      } catch (err) {
        setError('生成二维码失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [config]);

  // 计算实际显示尺寸（确保不小于最小值）
  const displaySize = Math.max(config.width, MIN_QR_SIZE);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>预览</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center min-h-[500px]">
        {loading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-80 w-80 bg-muted rounded-lg" />
            <p className="mt-4 text-muted-foreground">生成中...</p>
          </div>
        ) : qrDataUrl ? (
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* 固定尺寸容器，确保二维码不会小于最小尺寸 */}
            <div 
              className="rounded-lg shadow-lg overflow-hidden flex-shrink-0"
              style={{
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                minWidth: `${MIN_QR_SIZE}px`,
                minHeight: `${MIN_QR_SIZE}px`,
                backgroundColor: config.backgroundColor
              }}
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                width={displaySize}
                height={displaySize}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              尺寸: {config.width}x{config.width}px
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
