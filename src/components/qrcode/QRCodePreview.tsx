import { useEffect, useState } from 'react';
import { QRCodeConfig } from '@/types';
import { generateQRCode, configToOptions } from '@/lib/qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface QRCodePreviewProps {
  config: QRCodeConfig;
  className?: string;
}

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
      <CardContent className="flex items-center justify-center min-h-[300px]">
        {loading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-64 w-64 bg-muted rounded-lg" />
            <p className="mt-4 text-muted-foreground">生成中...</p>
          </div>
        ) : qrDataUrl ? (
          <div className="flex flex-col items-center space-y-4">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="max-w-full h-auto rounded-lg shadow-lg"
              style={{ maxHeight: '400px' }}
            />
            <p className="text-sm text-muted-foreground">
              尺寸: {config.width}x{config.width}px
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
