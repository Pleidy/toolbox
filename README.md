# QRCode Toolbox

一个基于 `Electron + React + TypeScript + Vite` 的桌面工具箱，当前核心能力聚焦在二维码生成、批量处理、导入导出和二维码解析。

## 功能概览

### 二维码生成

- 单个二维码生成
- 批量二维码生成
- 前景色、背景色、边距、尺寸、纠错等级配置
- Logo 嵌入
- 预览区按可见区域懒加载，适合大批量数据

### 文件导入

- 支持 `TXT / CSV / Excel(.xls/.xlsx)` 导入
- `CSV / Excel` 会读取首行作为表头
- 支持多列选择
- 支持两种展开方式：
  - 先横向生成：按行依次读取所选列
  - 先纵向生成：按列依次读取完整数据
- 导入弹窗中每列会显示“第 N 列”，即使表头异常也能准确选择
- `CSV` 会自动尝试处理 `UTF-8 / GB18030` 编码

### 导出能力

- 单个二维码导出
- 批量导出为：
  - `PDF`
  - `ZIP`
  - `拼图图片`
- 批量导出支持进度显示
- 批量导出支持取消
- `PDF / 拼图` 支持按数量阈值拆分为多个文件，再统一打包成 `ZIP` 下载

### 二维码解析

- 支持图片上传解析
- 支持拖拽图片解析
- 支持粘贴图片解析
- 支持批量解析

## 技术栈

- Electron
- React 18
- TypeScript
- Vite
- Zustand
- Tailwind CSS
- Radix UI
- `qrcode`
- `jsqr`
- `xlsx`
- `jspdf`
- `jszip`

## 本地开发

安装依赖：

```bash
npm install
```

启动前端开发环境：

```bash
npm run dev
```

启动 Electron 开发环境：

```bash
npm run electron:dev
```

## 构建

生产构建：

```bash
npm run build
```

构建 Electron 应用：

```bash
npm run electron:build
```

构建 Windows 测试包：

```bash
npm run electron:build:win
```

## 打包产物

默认输出目录：

```text
release/
```

常见产物：

- `release/win-unpacked/Toolbox.exe`
- `release/Toolbox-<version>.zip`

当前项目版本：

```text
1.2.0
```

## 目录结构

```text
src/
├─ components/
│  ├─ qrcode/      # 二维码生成、导入、预览、导出、解析
│  ├─ encoder/     # 编码转换工具
│  ├─ json/        # JSON 格式化工具
│  ├─ image/       # 图片工具
│  └─ ui/          # 通用 UI 组件
├─ lib/            # 文件导入导出、二维码处理等工具函数
├─ stores/         # Zustand 状态管理
├─ types/          # 类型定义
├─ App.tsx         # 应用入口
└─ main.tsx        # React 挂载入口

electron/
├─ main.js         # Electron 主进程
└─ preload.js      # Electron 预加载脚本
```

## 当前实现重点

- 批量预览已经做了虚拟化和按需生成，避免大批量数据直接卡死
- 批量导出支持可取消流程
- 二维码工具模块已按功能拆包，降低主包首屏压力

## 注意事项

- 当前项目未配置自动化测试框架
- 构建和验证主要依赖：
  - `tsc --noEmit`
  - `npm run build`
  - `npm run electron:build:win`
- Vite 仍然会提示部分 chunk 较大，这属于后续可继续优化项

## 后续可扩展方向

- 为导入数据增加“标签列”选择
- 支持 Excel 多工作表选择
- 继续细化导出依赖拆包
- 补充自动化测试
