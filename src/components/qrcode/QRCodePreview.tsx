import { useEffect, useRef, useState } from 'react';
import { QRCodeConfig } from '@/types';
import { generateQRCode, configToOptions } from '@/lib/qrcode';
import { Card, CardContent } from '../ui/Card';

interface QRCodePreviewProps {
  config: QRCodeConfig;
  className?: string;
  onDataUrlChange?: (dataUrl: string) => void;
}

const MIN_QR_SIZE = 256;

export function QRCodePreview({
  config,
  className,
  onDataUrlChange,
}: QRCodePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generationIdRef = useRef(0);

  useEffect(() => {
    const currentGenerationId = ++generationIdRef.current;
    let isMounted = true;

    const generate = async () => {
      if (!config.content || config.content.trim() === '') {
        if (isMounted) {
          setQrDataUrl('');
          setLoading(false);
          onDataUrlChange?.('');
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const dataUrl = await generateQRCode(config.content, configToOptions(config));
        if (isMounted && currentGenerationId === generationIdRef.current) {
          setQrDataUrl(dataUrl);
          onDataUrlChange?.(dataUrl);
        }
      } catch (generationError) {
        if (isMounted && currentGenerationId === generationIdRef.current) {
          setError('生成二维码失败');
          onDataUrlChange?.('');
          console.error(generationError);
        }
      } finally {
        if (isMounted && currentGenerationId === generationIdRef.current) {
          setLoading(false);
        }
      }
    };

    const timer = window.setTimeout(generate, 150);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [config, onDataUrlChange]);

  if (!config.content || config.content.trim() === '') {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">请输入内容生成二维码</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
      <CardContent className="flex items-center justify-center min-h-[500px] p-4">
        {loading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-80 w-80 bg-muted rounded-lg" />
            <p className="mt-4 text-muted-foreground">生成中...</p>
          </div>
        ) : qrDataUrl ? (
          <div className="flex flex-col items-center space-y-4 w-full">
            <div
              className="rounded-lg shadow-lg overflow-hidden flex-shrink-0"
              style={{
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                minWidth: `${MIN_QR_SIZE}px`,
                minHeight: `${MIN_QR_SIZE}px`,
                backgroundColor: config.backgroundColor,
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
                  objectFit: 'contain',
                }}
              />
            </div>
            {config.label && (
              <div className="mt-2 text-sm font-medium text-foreground text-center">
                {config.label}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              尺寸: {config.width}x{config.width}px
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
