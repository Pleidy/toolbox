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
      <Card className={`border-border/70 shadow-none ${className || ''}`}>
        <CardContent className="flex h-[500px] items-center justify-center">
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-foreground">输入内容后即可实时生成二维码</p>
            <p className="text-sm text-muted-foreground">支持单条内容预览，样式参数修改后会自动刷新结果。</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displaySize = Math.max(config.width, MIN_QR_SIZE);

  if (error) {
    return (
      <Card className={`border-border/70 shadow-none ${className || ''}`}>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border/70 shadow-none ${className || ''}`}>
      <CardContent className="flex min-h-[500px] items-center justify-center p-6">
        {loading ? (
          <div className="flex animate-pulse flex-col items-center">
            <div className="h-80 w-80 rounded-[28px] bg-muted" />
            <p className="mt-4 text-sm text-muted-foreground">正在生成预览…</p>
          </div>
        ) : qrDataUrl ? (
          <div className="flex w-full flex-col items-center space-y-4">
            <div
              className="overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-sm"
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
              <div className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-sm font-medium text-foreground">
                {config.label}
              </div>
            )}
            <p className="text-sm text-muted-foreground">尺寸 {config.width} x {config.width}px</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
