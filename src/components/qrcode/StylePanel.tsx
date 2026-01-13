import { QRCodeConfig } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Label } from '../ui/Label';
import { Slider } from '../ui/Slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { ColorPicker } from '../ui/ColorPicker';
import { Button } from '../ui/Button';

interface StylePanelProps {
  config: QRCodeConfig;
  onChange: (config: Partial<QRCodeConfig>) => void;
}

export function StylePanel({ config, onChange }: StylePanelProps) {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({ logo: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    onChange({ logo: undefined });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>样式设置</CardTitle>
        <CardDescription>
          自定义二维码的外观样式
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Size */}
        <div className="space-y-4">
          <div className="flex justify-between">
            <Label>尺寸</Label>
            <span className="text-sm text-muted-foreground">{config.width}px</span>
          </div>
          <Slider
            value={[config.width]}
            min={128}
            max={2048}
            step={64}
            onValueChange={([value]) => onChange({ width: value })}
          />
        </div>

        {/* Margin */}
        <div className="space-y-4">
          <div className="flex justify-between">
            <Label>边距</Label>
            <span className="text-sm text-muted-foreground">{config.margin}</span>
          </div>
          <Slider
            value={[config.margin]}
            min={0}
            max={10}
            step={1}
            onValueChange={([value]) => onChange({ margin: value })}
          />
        </div>

        {/* Error Correction Level */}
        <div className="space-y-2">
          <Label>错误纠正等级</Label>
          <Select
            value={config.errorCorrectionLevel}
            onValueChange={(value: 'L' | 'M' | 'Q' | 'H') => 
              onChange({ errorCorrectionLevel: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L (7%)</SelectItem>
              <SelectItem value="M">M (15%)</SelectItem>
              <SelectItem value="Q">Q (25%)</SelectItem>
              <SelectItem value="H">H (30%)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            更高的等级支持更多损坏，但二维码会更密集
          </p>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <ColorPicker
            label="前景色"
            color={config.foregroundColor}
            onChange={(color) => onChange({ foregroundColor: color })}
          />
          <ColorPicker
            label="背景色"
            color={config.backgroundColor}
            onChange={(color) => onChange({ backgroundColor: color })}
          />
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label>样式风格</Label>
          <Select
            value={config.style}
            onValueChange={(value: 'square' | 'dot' | 'rounded') => 
              onChange({ style: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square">方形</SelectItem>
              <SelectItem value="dot">圆点</SelectItem>
              <SelectItem value="rounded">圆角</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logo */}
        <div className="space-y-4">
          <Label>Logo 图片</Label>
          {config.logo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img
                  src={config.logo}
                  alt="Logo"
                  className="w-16 h-16 object-contain border rounded"
                />
                <Button variant="outline" size="sm" onClick={removeLogo}>
                  移除
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Logo 大小</Label>
                <Slider
                  value={[config.logoWidth || 0.2]}
                  min={0.1}
                  max={0.3}
                  step={0.05}
                  onValueChange={([value]) => onChange({ logoWidth: value })}
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload" className="cursor-pointer">
                <p className="text-sm text-muted-foreground">
                  点击上传或拖拽图片到这里
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  支持 PNG、JPG、GIF 格式
                </p>
              </label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
