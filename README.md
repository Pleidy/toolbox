<div align="center">

# Toolbox

### Desktop Productivity Suite for QR, Data, Encoding and Update Delivery

一款面向生产效率场景打造的桌面工具应用，聚焦二维码工作流、结构化数据导入导出、编码转换、JSON 处理与桌面端自动更新闭环。

<p>
  <img alt="version" src="https://img.shields.io/badge/version-1.3.1-2563eb?style=for-the-badge">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows-111827?style=for-the-badge">
  <img alt="runtime" src="https://img.shields.io/badge/runtime-Electron-0f766e?style=for-the-badge">
  <img alt="frontend" src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-7c3aed?style=for-the-badge">
  <img alt="updates" src="https://img.shields.io/badge/update-GitHub%20Releases-e11d48?style=for-the-badge">
</p>

<p>
  <strong>Toolbox</strong> 将高频桌面工具整合为统一工作台，强调
  <strong>批量处理效率</strong>、
  <strong>稳定交互体验</strong>、
  <strong>模块化演进能力</strong> 与
  <strong>自动更新交付链路</strong>。
</p>

</div>

---

## Contents

- [Why Toolbox](#why-toolbox)
- [Capability Matrix](#capability-matrix)
- [Core Modules](#core-modules)
- [Import → Generate → Export Workflow](#import--generate--export-workflow)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Build & Release](#build--release)
- [Auto Update](#auto-update)
- [Artifacts](#artifacts)
- [Roadmap](#roadmap)

---

## Why Toolbox

Toolbox 不是简单地“堆功能”，而是围绕真实桌面工作流做整合：

- 面向批量二维码生产与管理场景
- 支持从 `TXT / CSV / Excel` 进入统一生成流程
- 支持多标签工作区和独立缓存
- 支持大批量预览优化与可取消导出
- 支持 GitHub Releases 自动更新，降低版本分发成本

它适合：

- 运营批量投放二维码
- 内部工具桌面化交付
- 开发测试中的编码、格式化、解析类日常操作

---

## Capability Matrix

| Domain | Capability | Highlights |
| --- | --- | --- |
| QR Code | 单个 / 批量二维码生成 | 支持样式、Logo、预览、导出 |
| Workspace | 多标签工作区 | 新建、重命名、删除、拖拽排序、独立缓存 |
| Import | TXT / CSV / Excel 导入 | 表头识别、多列选择、横向 / 纵向展开 |
| Preview | 高性能批量预览 | 按需渲染、滚动加载、适配大批量数据 |
| Export | PDF / ZIP / 拼图图片 | 可取消、拆分阈值、再打包下载 |
| Decode | 二维码图片解析 | 上传、拖拽、粘贴、批量解析 |
| Encode | URL / Base64 / Unicode | 多标签、快速复制、双向转换 |
| JSON | 格式化 / 压缩 / 错误定位 | 支持结果视图与标签切换 |
| Delivery | 自动更新 | GitHub Releases、启动检查、手动检查 |

---

## Core Modules

### 1. QR Code Workspace

二维码模块是当前项目的核心能力中心，具备：

- 单个二维码生成
- 批量二维码生成
- 标签化工作区
- 每个标签独立保存：
  - 输入内容
  - 批量数据
  - 样式配置
  - 预览配置
  - 导出配置
  - 标记状态

支持的二维码配置包括：

- 尺寸
- 边距
- 纠错等级
- 前景色 / 背景色
- Logo 嵌入
- 风格切换

### 2. Structured Import Pipeline

支持导入：

- `TXT`
- `CSV`
- `Excel (.xls / .xlsx)`

支持能力：

- 首行自动识别为表头
- 多列选择
- `第 N 列` 显示辅助
- 横向 / 纵向展开顺序
- `CSV` 自动尝试 `UTF-8 / GB18030` 编码解析

### 3. Export Pipeline

支持导出到：

- `PDF`
- `ZIP`
- `拼图图片`

增强能力：

- 导出进度提示
- 导出取消
- 超量自动拆分
- 拆分后再 ZIP 打包下载

### 4. Decoder & Utility Modules

附加工具模块包括：

- 二维码图片解析
- URL / Base64 / Unicode 编码转换
- JSON 格式化 / 压缩 / 错误定位
- 图片工具工作区

---

## Import → Generate → Export Workflow

```text
TXT / CSV / Excel
        ↓
  表头识别 / 列选择
        ↓
  横向或纵向展开
        ↓
   批量二维码生成
        ↓
   预览 / 标记 / 筛查
        ↓
 PDF / ZIP / 拼图导出
        ↓
 GitHub Releases / 本地交付
```

---

## Architecture

```text
src/
├─ components/
│  ├─ qrcode/      # 二维码生成、导入、预览、导出、解析
│  ├─ encoder/     # 编码转换工具
│  ├─ json/        # JSON 格式化工具
│  ├─ image/       # 图片工具
│  └─ ui/          # 通用 UI 组件
├─ lib/            # 二维码、导入导出、文件处理等核心逻辑
├─ stores/         # Zustand 状态管理
├─ types/          # 类型定义
├─ App.tsx         # 前端入口
└─ main.tsx        # React 挂载入口

electron/
├─ main.js         # Electron 主进程
└─ preload.js      # Electron 预加载桥接
```

### Design Principles

- **Workspace First**  
  核心模块围绕“工作区状态”设计，而不是单页临时状态。

- **Bottom Tab Consistency**  
  跨模块统一底部标签栏交互风格，降低切换成本。

- **Performance Under Load**  
  大批量预览采用按需渲染策略，优先保证桌面端流畅性。

- **Separation of Preview and Export**  
  预览链路与导出链路解耦，避免复杂状态互相牵连。

- **Release-Oriented Delivery**  
  自动更新围绕 GitHub Releases 设计，适配公开仓库发布模式。

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| Desktop Runtime | Electron |
| Frontend | React 18 |
| Language | TypeScript |
| Build Tool | Vite |
| State Management | Zustand |
| Styling | Tailwind CSS |
| UI Foundation | Radix UI |
| QR Generate | qrcode |
| QR Decode | jsqr |
| Spreadsheet Import | xlsx |
| Document Export | jspdf |
| Archive Export | jszip |
| Auto Update | electron-updater |

---

## Development

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

---

## Build & Release

生产构建：

```bash
npm run build
```

构建 Electron 应用：

```bash
npm run electron:build
```

构建 Windows 安装包与测试包：

```bash
npm run electron:build:win
```

发布到 GitHub Releases：

```bash
npm run electron:publish:win
```

发布前请注入：

```bash
GH_TOKEN=your_github_token
```

---

## Auto Update

当前自动更新基于 `GitHub Releases`，支持：

- 启动后自动检查更新
- 用户手动检查更新
- 检测到新版本后提示是否下载
- 下载完成后提示是否重启安装
- 设置中关闭“启动自动检查更新”
- 仅面向正式版 `release`

发布自动更新版本时，GitHub Release 至少需要上传：

- `Toolbox-x.y.z.exe`
- `Toolbox-x.y.z.exe.blockmap`
- `latest.yml`

---

## Artifacts

默认输出目录：

```text
release/
```

核心产物：

- `Toolbox-<version>.exe`
- `Toolbox-<version>.exe.blockmap`
- `latest.yml`
- `Toolbox-<version>.zip`
- `win-unpacked/Toolbox.exe`

说明：

- 安装版 `.exe` 用于正式安装与自动更新
- `latest.yml` 与 `.blockmap` 是自动更新必需文件
- `win-unpacked` 更适合本地调试验证

---

## Validation

当前项目主要依赖以下方式验证：

- `tsc --noEmit`
- `npm run build`
- `npm run electron:build:win`

当前尚未接入完整自动化测试框架，因此构建与打包验证是交付前的重要环节。

---

## Roadmap

- 导入流程增加“标签列”选择
- 支持 Excel 多工作表切换
- 继续细化大包体积与动态拆包策略
- 优化自动更新状态展示
- 补充测试与发布文档

---

## Release Note Template

```text
Version X.Y.Z

- Added:
- Improved:
- Fixed:
- Packaging:
- Update:
```

---

## License

如需对外分发或商业化使用，建议补充正式许可证文件、发布规范与版本维护策略。
