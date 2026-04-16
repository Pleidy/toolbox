<div align="center">

# Toolbox

## Desktop Workflow Platform for QR, Data, Encoding and Delivery

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
  <img alt="platform" src="https://img.shields.io/badge/platform-Windows-0f172a?style=for-the-badge">
  <img alt="runtime" src="https://img.shields.io/badge/runtime-Electron-0f766e?style=for-the-badge">
  <img alt="frontend" src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-7c3aed?style=for-the-badge">
  <img alt="updater" src="https://img.shields.io/badge/update-GitHub%20Releases-e11d48?style=for-the-badge">
</p>

<p>
  <img alt="build" src="https://img.shields.io/badge/build-passing-16a34a?style=flat-square">
  <img alt="release" src="https://img.shields.io/badge/release-NSIS%20%2B%20ZIP-1d4ed8?style=flat-square">
  <img alt="state" src="https://img.shields.io/badge/state-Zustand-7c2d12?style=flat-square">
  <img alt="import" src="https://img.shields.io/badge/import-CSV%20%2F%20Excel%20%2F%20TXT-5b21b6?style=flat-square">
  <img alt="export" src="https://img.shields.io/badge/export-PDF%20%2F%20ZIP%20%2F%20Collage-0f766e?style=flat-square">
</p>

</div>

---

## 目录

- [项目定位](#项目定位)
- [能力矩阵](#能力矩阵)
- [核心卖点](#核心卖点)
- [产品模块](#产品模块)
- [工作流展示](#工作流展示)
- [架构总览](#架构总览)
- [技术栈](#技术栈)
- [开发指南](#开发指南)
- [构建与发布](#构建与发布)
- [自动更新机制](#自动更新机制)
- [发布产物](#发布产物)
- [路线图](#路线图)

---

## 项目定位

Toolbox 不是“把一堆功能塞进一个窗口”，而是把多个高频、易碎、易散落的日常工具流程，收拢成一个桌面平台：

- 用统一界面承接二维码、编码、JSON、图片相关工作流
- 用多标签工作区承接上下文切换
- 用批量导入 / 批量导出支撑真实生产场景
- 用 GitHub Releases 自动更新把“交付”本身做成产品能力

它适合：

- 二维码批量运营与分发
- 内部工具桌面化交付
- 开发与测试中的高频编码 / 数据处理工作
- 需要持续发布、持续更新的轻量桌面产品

---

## 能力矩阵

| 领域 | 能力 | 关键特性 |
| --- | --- | --- |
| QR 生成 | 单个 / 批量二维码生成 | 样式、Logo、标签工作区、独立缓存 |
| 数据导入 | TXT / CSV / Excel | 首行表头识别、多列选择、横向 / 纵向展开 |
| 批量预览 | 大批量二维码渲染 | 按需渲染、滚动加载、性能优化 |
| 导出体系 | PDF / ZIP / 拼图图片 | 进度反馈、可取消、超量拆分、再打包 |
| 二维码解析 | 图像解析工作流 | 上传、拖拽、粘贴、批量解析 |
| 编码工具 | URL / Base64 / Unicode | 多标签、双向转换、快速复制 |
| JSON 工具 | 格式化 / 压缩 / 错误定位 | 结果查看、字号调节、底部标签栏 |
| 交付 | GitHub 自动更新 | 启动检查、手动检查、下载后重启安装 |

---

## 核心卖点

### 1. 真正面向批量场景

Toolbox 从一开始就不是只服务“单条输入”的小工具，而是围绕 **批量数据导入 → 批量生成 → 批量导出** 设计。

- Excel / CSV 首行表头识别
- 多列选择
- 横向 / 纵向展开
- PDF / 拼图 / ZIP 多出口
- 大批量导出拆分策略

### 2. 工作区而不是单页面

二维码模块不是一次性临时页，而是完整工作区：

- 标签支持新建、重命名、删除、拖拽排序
- 每个标签独立保存：
  - 输入内容
  - 批量数据
  - 样式配置
  - 预览配置
  - 导出配置
  - 标记状态

### 3. 桌面端交付闭环

项目不仅能本地跑，还具备完整桌面端交付能力：

- Windows 安装包
- Blockmap 差分文件
- `latest.yml` 更新元数据
- GitHub Releases 自动更新

这意味着它不只是“源码仓库”，而是一个已经具备持续发布能力的产品。

---

## 产品模块

### QR Workspace

当前项目最核心的模块，重点能力包括：

- 单个二维码生成
- 批量二维码生成
- 多标签工作区
- 输入区常驻
- 设置区统一折叠
- 底部标签栏统一切换

支持配置：

- 尺寸
- 边距
- 纠错等级
- 前景色 / 背景色
- Logo 嵌入
- 风格切换

### Structured Import

支持导入：

- `TXT`
- `CSV`
- `Excel (.xls / .xlsx)`

增强能力：

- 表头识别
- 列号标识
- 多列选择
- 横向 / 纵向展开
- `CSV` 自动尝试 `UTF-8 / GB18030`

### Export Engine

导出支持：

- `PDF`
- `ZIP`
- `拼图图片`

并具备：

- 导出进度显示
- 导出可取消
- 数量阈值拆分
- 拆分后统一打包下载

### Decode / Encode / JSON / Image

其余模块覆盖：

- 二维码图片解析
- URL / Base64 / Unicode 编码转换
- JSON 格式化、压缩、错误定位
- 图片工具工作区

---

## 工作流展示

### 二维码批量工作流

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

### 桌面发布工作流

```text
代码修改
   ↓
版本升级
   ↓
构建安装包 / blockmap / latest.yml
   ↓
GitHub Release 上传
   ↓
客户端自动检查更新
   ↓
下载 / 重启 / 安装
```

---

## 架构总览

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

### 设计原则

#### Workspace First
核心模块围绕“工作区状态”建模，而不是围绕页面临时状态建模。

#### Bottom Tab Consistency
跨模块统一底部标签栏风格，降低学习成本与切换成本。

#### Performance Under Load
大批量预览优先按需渲染，优先保证桌面端流畅度。

#### Delivery as a Feature
发布、安装、更新不是额外脚本，而是产品能力本身的一部分。

#### GitHub-Native Update Strategy
自动更新直接围绕 GitHub Releases 设计，适合公开仓库快速迭代。

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| Desktop Runtime | Electron |
| Frontend | React 18 |
| Language | TypeScript |
| Build Tool | Vite |
| State | Zustand |
| Styling | Tailwind CSS |
| UI Foundation | Radix UI |
| QR Generate | qrcode |
| QR Decode | jsqr |
| Spreadsheet Import | xlsx |
| Document Export | jspdf |
| Archive Export | jszip |
| Auto Update | electron-updater |

---

## 开发指南

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

## 构建与发布

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

发布前请先注入：

```bash
GH_TOKEN=your_github_token
```

---

## 自动更新机制

当前自动更新基于 `GitHub Releases`：

- 启动后可自动检查更新
- 用户可手动检查更新
- 检测到新版本后提示是否下载
- 下载完成后提示是否重启安装
- 支持在设置中关闭“启动自动检查更新”
- 仅面向正式版 `release`

GitHub Release 至少需要上传：

- `Toolbox-x.y.z.exe`
- `Toolbox-x.y.z.exe.blockmap`
- `latest.yml`

---

## 发布产物

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

## 验证方式

当前项目主要通过以下方式验证：

- `tsc --noEmit`
- `npm run build`
- `npm run electron:build:win`

在未引入完整自动化测试框架之前，构建与打包验证仍是交付前的关键质量门。

---

## 路线图

- 导入流程增加“标签列”选择
- 支持 Excel 多工作表切换
- 继续细化大包拆分与动态加载策略
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
