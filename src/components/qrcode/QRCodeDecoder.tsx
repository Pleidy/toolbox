import { useState, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Upload, ScanLine, Copy, FileArchive, Loader2 } from 'lucide-react';

interface DecodeItem {
  id: string;
  fileName: string;
  data?: string;
  error?: string;
  timestamp: number;
}

export function QRCodeDecoder() {
  const [decoding, setDecoding] = useState(false);
  const [items, setItems] = useState<DecodeItem[]>([]);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const decodeImage = useCallback((file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas || !canvas.getContext('2d')) {
            resolve(null);
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          resolve(code?.data || null);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setDecoding(true);
    setItems([]);
    setProgress(0);

    const results: DecodeItem[] = [];
    let completed = 0;

    for (const file of files) {
      const result = await decodeImage(file);
      results.push({
        id: `${Date.now()}-${completed}`,
        fileName: file.name,
        data: result || undefined,
        error: result ? undefined : '未检测到二维码',
        timestamp: Date.now(),
      });
      completed++;
      setProgress(Math.round((completed / files.length) * 100));
    }

    setItems(results);
    setDecoding(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    
    if (files.length === 0) return;

    setDecoding(true);
    setItems([]);
    setProgress(0);

    const results: DecodeItem[] = [];
    let completed = 0;

    for (const file of files) {
      const result = await decodeImage(file);
      results.push({
        id: `${Date.now()}-${completed}`,
        fileName: file.name,
        data: result || undefined,
        error: result ? undefined : '未检测到二维码',
        timestamp: Date.now(),
      });
      completed++;
      setProgress(Math.round((completed / files.length) * 100));
    }

    setItems(results);
    setDecoding(false);
  }, [decodeImage]);

  const copyAll = async () => {
    const text = items
      .filter(item => item.data)
      .map(item => `${item.fileName}: ${item.data}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
  };

  const exportResults = () => {
    const text = items
      .filter(item => item.data)
      .map(item => `${item.fileName}: ${item.data}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode-results-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex gap-4">
      {/* 隐藏的画布 */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 左侧：上传区域 */}
      <div className="w-[400px] flex-shrink-0 flex flex-col gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              上传二维码图片
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
              
              {decoding ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">正在解码 {progress}%</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击或拖拽上传图片</p>
                  <p className="text-xs text-muted-foreground">支持多张图片批量解析</p>
                </div>
              )}
            </div>

            {/* 进度条 */}
            {decoding && (
              <div className="mt-4">
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        {items.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">批量操作</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={copyAll}
                  disabled={items.every(item => !item.data)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  复制全部
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={exportResults}
                  disabled={items.every(item => !item.data)}
                >
                  <FileArchive className="h-3 w-3 mr-1" />
                  导出结果
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                成功: {items.filter(i => i.data).length} / {items.length}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">使用说明</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 点击或拖拽上传图片（支持多张）</li>
              <li>• 图片中的二维码将被自动识别</li>
              <li>• 识别结果可复制或导出</li>
              <li>• 建议使用清晰、对比度高的图片</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 右侧：解析结果 */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            解析结果 ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 h-full overflow-y-auto">
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className={`p-3 rounded-lg border ${
                    item.data 
                      ? 'bg-muted/50 border-border' 
                      : 'bg-destructive/5 border-destructive/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{item.fileName}</p>
                      {item.data ? (
                        <p className="text-sm break-all font-mono mt-1">{item.data}</p>
                      ) : (
                        <p className="text-sm text-destructive mt-1">{item.error}</p>
                      )}
                    </div>
                    {item.data && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={() => navigator.clipboard.writeText(item.data!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              请上传包含二维码的图片（支持多张）
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
