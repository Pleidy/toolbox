import { useCallback, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Upload } from 'lucide-react';
import {
  buildBatchContentsFromColumns,
  parseBatchImportFile,
  ParsedBatchImportData,
} from '@/lib/fileOperations';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

type ImportOrder = 'row-major' | 'column-major';

interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (contents: string[]) => void;
}

export function BatchImportDialog({
  open,
  onOpenChange,
  onImport,
}: BatchImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedBatchImportData | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [importOrder, setImportOrder] = useState<ImportOrder>('row-major');

  const resetState = useCallback(() => {
    setLoading(false);
    setError('');
    setParsedData(null);
    setSelectedColumns([]);
    setImportOrder('row-major');
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const importedContents = useMemo(() => {
    if (!parsedData) {
      return [];
    }

    if (parsedData.fileType === 'text') {
      return parsedData.textLines;
    }

    return buildBatchContentsFromColumns(
      parsedData.rows,
      selectedColumns,
      importOrder
    );
  }, [parsedData, selectedColumns, importOrder]);

  const previewLines = importedContents.slice(0, 12);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const parsed = await parseBatchImportFile(file);
      setParsedData(parsed);

      if (parsed.fileType === 'spreadsheet') {
        setSelectedColumns(parsed.columns.slice(0, 1).map((column) => column.index));
      } else {
        setSelectedColumns([]);
      }
    } catch (parseError) {
      console.error('Failed to parse import file:', parseError);
      setError('文件解析失败，请确认文件格式和编码是否正确。');
      setParsedData(null);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const toggleColumnSelection = (columnIndex: number) => {
    setSelectedColumns((current) =>
      current.includes(columnIndex)
        ? current.filter((index) => index !== columnIndex)
        : [...current, columnIndex]
    );
  };

  const handleImport = () => {
    if (importedContents.length === 0) {
      setError('当前没有可导入的内容。');
      return;
    }

    onImport(importedContents);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle>导入批量数据</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">选择文件</Label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              支持 Excel、CSV、TXT。Excel/CSV 将读取首行作为表头，并自动尝试修复 CSV 编码。
            </p>
          </div>

          {loading && (
            <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              正在解析文件...
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {parsedData && (
            <div className="space-y-4">
              <div className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  {parsedData.fileType === 'spreadsheet' ? (
                    <FileSpreadsheet className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span>{parsedData.fileName}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {parsedData.fileType === 'spreadsheet'
                    ? `检测到 ${parsedData.columns.length} 列，${parsedData.rows.length} 行数据`
                    : `检测到 ${parsedData.textLines.length} 行文本`}
                </div>
              </div>

              {parsedData.fileType === 'spreadsheet' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">选择要读取的列</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            setSelectedColumns(
                              parsedData.columns.map((column) => column.index)
                            )
                          }
                        >
                          全选
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedColumns([])}
                        >
                          清空
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-2">
                      {parsedData.columns.map((column) => {
                        const selected = selectedColumns.includes(column.index);

                        return (
                          <button
                            key={column.id}
                            type="button"
                            onClick={() => toggleColumnSelection(column.index)}
                            className={`rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                              selected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:bg-accent'
                            }`}
                          >
                            <div className="font-medium">第 {column.index + 1} 列</div>
                            <div className="mt-1 truncate text-[11px] text-muted-foreground">
                              {column.header}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">多列展开顺序</Label>
                    <Select
                      value={importOrder}
                      onValueChange={(value: ImportOrder) => setImportOrder(value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="row-major">先横向生成</SelectItem>
                        <SelectItem value="column-major">先纵向生成</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      先横向生成：按每一行依次读取所选列。先纵向生成：按列依次读取完整数据。
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-xs">导入结果预览</Label>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    共将导入 {importedContents.length} 条内容
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
                    {previewLines.length > 0 ? (
                      previewLines.map((line, index) => (
                        <div key={`${line}-${index}`} className="truncate">
                          {index + 1}. {line}
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">暂无可导入内容</div>
                    )}
                  </div>
                  {importedContents.length > previewLines.length && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      仅显示前 {previewLines.length} 条
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleImport} disabled={importedContents.length === 0}>
            <Upload className="mr-2 h-4 w-4" />
            导入到二维码列表
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
