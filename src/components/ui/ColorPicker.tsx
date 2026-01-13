import { HexColorPicker } from 'react-colorful';
import { Button } from './Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Dialog';
import { Label } from './Label';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
  className?: string;
}

export function ColorPicker({ color, onChange, label, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <span
              className="mr-2 h-4 w-4 rounded-full border"
              style={{ backgroundColor: color }}
            />
            {color}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>选择颜色</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <HexColorPicker color={color} onChange={onChange} />
          </div>
          <div className="flex items-center justify-between">
            <Label>预览:</Label>
            <span
              className="h-8 w-8 rounded border"
              style={{ backgroundColor: color }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
