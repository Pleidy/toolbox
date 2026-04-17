<div align="center">

# Toolbox

### Desktop Productivity Suite for QR, Data, Encoding and Update Delivery
## Desktop Workflow Platform for QR, Data, Encoding and Delivery

一款面向生产效率场景打造的桌面工具应用，聚焦二维码工作流、结构化数据导入导出、编码转换、JSON 处理与桌面端自动更新闭环。
<p>
  一款面向高频桌面工作流打造的 <strong>旗舰级工具平台</strong>，围绕
  <strong>二维码生成</strong>、
  <strong>批量导入导出</strong>、
  <strong>编码转换</strong>、
  <strong>JSON 处理</strong> 与
  <strong>GitHub 自动更新交付</strong>
  构建统一操作台。
</p>

<p>
  <img alt="version" src="https://img.shields.io/badge/version-1.3.1-2563eb?style=for-the-badge">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows-111827?style=for-the-badge">
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows-0f172a?style=for-the-badge">
  <img alt="runtime" src="https://img.shields.io/badge/runtime-Electron-0f766e?style=for-the-badge">
  <img alt="frontend" src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-7c3aed?style=for-the-badge">
  <img alt="updates" src="https://img.shields.io/badge/update-GitHub%20Releases-e11d48?style=for-the-badge">
  <img alt="updater" src="https://img.shields.io/badge/update-GitHub%20Releases-e11d48?style=for-the-badge">
</p>

<p>
  <strong>Toolbox</strong> 将高频桌面工具整合为统一工作台，强调
  <strong>批量处理效率</strong>、
  <strong>稳定交互体验</strong>、
  <strong>模块化演进能力</strong> 与
  <strong>自动更新交付链路</strong>。
  <img alt="build" src="https://img.shields.io/badge/build-passing-16a34a?style=flat-square">
  <img alt="release" src="https://img.shields.io/badge/release-NSIS%20%2B%20ZIP-1d4ed8?style=flat-square">
  <img alt="state" src="https://img.shields.io/badge/state-Zustand-7c2d12?style=flat-square">
  <img alt="import" src="https://img.shields.io/badge/import-CSV%20%2F%20Excel%20%2F%20TXT-5b21b6?style=flat-square">
  <img alt="export" src="https://img.shields.io/badge/export-PDF%20%2F%20ZIP%20%2F%20Collage-0f766e?style=flat-square">
</p>

</div>

---

## 目录

- [项目简介](#项目简介)
- [功能概览](#功能概览)
- [模块说明](#模块说明)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [开发](#开发)
- [构建与打包](#构建与打包)
- [自动更新](#自动更新)
- [发布产物](#发布产物)
- [说明](#说明)

---

## 项目简介

Toolbox 是一个面向桌面场景的开源工具项目。它不是通用脚手架，而是一套围绕实际工作流持续演进的工具集合。

当前项目最成熟的部分是二维码模块，重点解决以下问题：

- 大批量二维码生成
- 结构化文件导入
- 批量预览与导出
- 多标签工作区管理
- Windows 应用打包与自动更新

---

## 功能概览

### 二维码工具

- 单个二维码生成
- 批量二维码生成
- 多标签工作区
- 标签支持：
  - 新建
  - 重命名
  - 删除
  - 拖拽排序
  - 独立缓存
- 支持样式配置：
  - 尺寸
  - 边距
  - 纠错等级
  - 前景色 / 背景色
  - Logo 嵌入
- 支持导出：
  - PDF
  - ZIP
  - 拼图图片
- 批量导出支持：
  - 进度显示
  - 取消
  - 超量拆分后再 ZIP 下载

### 文件导入

支持导入到二维码工作区的格式：

- `TXT`
- `CSV`
- `Excel (.xls / .xlsx)`

支持能力：

- 首行表头识别
- 多列选择
- 横向 / 纵向展开
- 列号辅助显示
- `CSV` 尝试处理 `UTF-8 / GB18030` 编码

### 二维码解析

- 图片上传解析
- 拖拽解析
- 粘贴板解析
- 批量解析

### 编码转换

- URL 编码 / 解码
- Base64 编码 / 解码
- Unicode 编码 / 解码
- 底部标签栏切换

### JSON 格式化

- JSON 格式化
- JSON 压缩
- 错误定位
- 字号调节
- 底部标签栏切换

### 图片工具

- 图片工具工作区
- 作为可扩展模块保留

---

## 模块说明

### 二维码模块

二维码模块是当前项目的核心模块，围绕“导入 -> 生成 -> 预览 -> 导出”完整工作流构建。

特点：

- 输入区常驻
- 设置区收纳
- 底部标签栏切换
- 预览针对大批量数据做了性能优化

### 自动更新

项目已接入基于 **GitHub Releases** 的自动更新能力：

- 支持启动后自动检查更新
- 支持手动检查更新
- 支持在设置中关闭“启动自动检查更新”
- 检测到新版本后提示下载
- 下载完成后提示重启安装

---

## 项目结构

```text
src/
├─ components/
│  ├─ qrcode/      # 二维码生成、导入、预览、导出、解析
│  ├─ encoder/     # 编码转换工具
│  ├─ json/        # JSON 格式化工具
│  ├─ image/       # 图片工具
│  └─ ui/          # 通用 UI 组件
├─ lib/            # 文件导入导出、二维码、工具函数
├─ stores/         # Zustand 状态管理
├─ types/          # 类型定义
├─ App.tsx         # 前端应用入口
└─ main.tsx        # React 挂载入口

electron/
├─ main.js         # Electron 主进程
└─ preload.js      # Electron 预加载桥接
```

---

## 技术栈

- Electron
- React 18
- TypeScript
- Vite
- Zustand
- Tailwind CSS
- Radix UI
- qrcode
- jsqr
- xlsx
- jspdf
- jszip
- electron-updater

---

## 开发

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

## 构建与打包

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

发布前需设置：

```bash
GH_TOKEN=your_github_token
```

---

## 自动更新

当前自动更新面向 **GitHub 正式版 Release**。

发布自动更新版本时，Release 至少应包含：

- `Toolbox-x.y.z.exe`
- `Toolbox-x.y.z.exe.blockmap`
- `latest.yml`

建议使用安装版 `.exe` 测试自动更新，不要使用 `win-unpacked/Toolbox.exe`。

---