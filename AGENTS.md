# AGENTS.md

本文件为 AI 编码助手在本仓库中进行开发工作时提供指导。

## 项目概览

**flowcloudai-ui-monorepo** 是一个基于 React 19 的组件库 monorepo，包含一个集成的演示/ playgrounds 应用。它旨在构建一个可复用的
UI 组件库，供内部使用以及作为 npm 包（`flowcloudai-ui`）发布。

### 目录结构

```
flowcloudai-ui-monorepo/
├── package.json        # 根工作区存根，仅包含 devDependencies
├── ui/                 # 组件库（以 flowcloudai-ui 发布到 npm）
│   ├── src/
│   │   ├── components/ # 按类型组织的所有 UI 组件
│   │   ├── hooks/      # 共享 hooks（例如 useClickOutside）
│   │   ├── style/
│   │   │   └── index.css   # 全局设计令牌 + 组件 CSS 导入
│   │   ├── ThemeProvider.tsx
│   │   └── index.ts    # 单一公共入口
│   ├── package.json    # 库导出：ESM、types、CSS
│   └── tsup.config.ts  # tsup 构建配置
├── app/                # 基于 Vite 的演示 playgrounds
│   ├── src/
│   │   ├── demos/      # 每个组件一个演示文件
│   │   ├── App.tsx     # 带导航的演示外壳
│   │   └── main.tsx    # 应用入口，包裹 providers
│   ├── index.html
│   ├── vite.config.ts  # 含 Tauri 集成的 Vite 配置
│   └── package.json    # 通过 install-local 链接本地 ui 包
└── memory/             # 项目记忆笔记（RelationGraph 等）
```

## 技术栈

- **React 19** — 现代 React，支持 hooks
- **TypeScript ~5.9** — 两个包均启用严格模式
- **Vite 8** — 开发服务器与应用打包
- **tsup 8** — 零配置库打包工具（仅 ESM）
- **CSS 自定义属性** — 通过 `--fc-*` 设计令牌实现主题化
- **关键运行时依赖**
  - `@dnd-kit/core`, `@dnd-kit/sortable` — 拖拽功能（Tree、TabBar）
  - `@xyflow/react` — 关系图渲染
  - `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/react` — 地图预览层
  - `@uiw/react-md-editor` — Markdown 编辑器
  - `html-to-image` — 关系图图片导出
  - `d3-force` — 仅演示用的 RelationGraph 力导向布局
  - `lucide-react` — playgrounds 中的图标

## 关键命令

### UI 库开发

**构建库**（输出到 `ui/dist/`）：

```bash
cd ui && npm run build
```

构建产物：

- `dist/index.js` — ESM 包
- `dist/index.d.ts` — TypeScript 声明
- `dist/index.css` — 打包后的全局 + 组件样式

**开发应用**（通过 Vite 别名同时监听 `ui` 和 `app`）：

```bash
cd app && npm run dev
```

这将启动一个 Vite 开发服务器，地址为 `http://localhost:5174`。

**克隆后初始化**（安装依赖并链接本地 `ui` 包）：

```bash
cd app && npm run install:local
```

> 注意：根目录的 `package.json` 未定义工作区脚本。请从 `ui/` 或 `app/` 目录运行命令。

## 架构与重要模式

### UI 库 (`ui/`)

**导出策略**：所有组件、hooks、类型和工具函数均从 `ui/src/index.ts` 导出。这是唯一的公共入口点。

**构建输出**：tsup 配置为仅生成 ESM（`format: ['esm']`）。没有 CJS 输出。

**样式**：CSS 被单独打包到一个 `dist/index.css` 文件中。它**不会**注入到各个组件中。使用者必须显式导入样式：

```tsx
import 'flowcloudai-ui/style'
```

全局样式表（`ui/src/style/index.css`）使用 `--fc-*` CSS 自定义属性定义设计系统，并通过 tsup 消费的导入链包含所有组件级 CSS。

**ThemeProvider**：提供 light/dark/system 主题上下文。它会将 `data-theme="light"` 或 `data-theme="dark"` 写入
`document.documentElement`（或自定义的 `target` 元素）。使用 `useTheme()` 来读取或更改主题。

**上下文 Providers**：导出了三个基于上下文的系统：

- `ThemeProvider` — 主题
- `AlertProvider` + `useAlert` — 警告、提示、确认
- `ContextMenuProvider` + `useContextMenu` — 右键菜单

### 演示应用 (`app/`)

**用途**：展示所有库组件，并作为开发 playgrounds。

**本地链接**：使用 `install-local` npm 包为本地 `ui/` 包创建符号链接。Vite 配置还添加了别名，使 `flowcloudai-ui` 解析到
`../ui/dist/index.js`，`flowcloudai-ui/style` 解析到 `../ui/dist/index.css`。

**⚠️ 关键导入规则**：始终从 `flowcloudai-ui` 包名导入，**切勿**使用 `../../ui/src` 等相对路径。直接从源文件导入会导致 React
上下文不匹配和运行时错误（例如 "useTheme must be used within <ThemeProvider>"）。

- ✅ `import { useTheme, Button } from 'flowcloudai-ui'`
- ❌ `import { useTheme, Button } from '../../ui/src'`

### Tauri 集成

`app/vite.config.ts` 包含 Tauri 专用配置：

- 检测 `TAURI_ENV_PLATFORM` 并设置构建目标（Windows 为 `chrome105`，macOS/Linux 为 `safari13`）
- 当存在 `HOST` 环境变量时，通过 WebSocket 处理 HMR
- 暴露前缀为 `VITE_` 和 `TAURI_ENV_*` 的环境变量
- 在调试构建中禁用压缩（`TAURI_ENV_DEBUG`）

## 组件库导览

组件位于 `ui/src/components/<Name>/<Name>.tsx`，并附带同目录的 `<Name>.css`。

**Providers**

- `ThemeProvider` — 主题上下文
- `AlertProvider` — 警告/提示/确认上下文
- `ContextMenuProvider` — 右键菜单上下文

**基础组件**

- `Button` — 通用按钮
- `CheckButton` — 切换/开关按钮
- `ButtonGroup` — 按钮组
- `ButtonToolbar` — 按钮组的工具栏布局容器

**表单组件**

- `Input` — 文本输入框，支持前缀、后缀、清空、密码切换
- `Slider` — 单滑块或范围滑块
- `Select` — 单选/多选下拉框，支持搜索、分组、虚拟滚动
- `TagItem` — 结构化标签展示/编辑器（字符串/数字/布尔值）

**展示组件**

- `Avatar` — 图片头像，支持 fallback 和懒加载
- `Card` — 内容容器，支持图片、悬停效果、标签
- `ListGroup` / `ListGroupItem` — 垂直列表容器和列表项
- `RollingBox` — 自定义滚动内容容器（水平方向时将滚轮转换为滚动）
- `VirtualList` — 窗口化高性能列表
- `MarkdownEditor` — Markdown 编辑 + 预览（基于 `@uiw/react-md-editor`）
- `SmartMessage` — 消息气泡组件
- `MessageBox` — 富 AI 聊天消息（推理、工具、Markdown、流式）
- `Chat` — 带对话历史的完整聊天容器
- `Timeline` (`Time.tsx`) — 水平时间轴，支持缩放、选择和同步组
- `RelationGraph` — 关系图可视化（基于 React Flow）；宿主注入 `layoutFn`
- `MapShapeEditor` — 基于 SVG 的形状编辑器，带 deck.gl 预览层

**导航 / 结构组件**

- `TabBar` — 标签页，支持附着/浮动样式、关闭、新增、拖拽排序
- `SideBar` — 可折叠侧边导航
- `Tree` — 层级树，支持搜索、编辑、创建、删除、拖拽
  - `DeleteDialog` — 删除确认，支持 lift/cascade 模式
  - `OrphanDialog` — 孤儿节点处理
  - `flatToTree` — 将扁平列表转换为树的工具函数

**覆盖层 / 工具组件**

- `Alert` / `AlertContext` — 警告系统
- `ContextMenu` / `ContextMenuContext` — 右键菜单系统
- `LazyLoad` — 懒加载辅助工具，带超时 fallback

### 添加新组件

1. 创建 `ui/src/components/ComponentName/ComponentName.tsx` 和 `ComponentName.css`
2. 在 `ui/src/index.ts` 中导出该组件
3. 创建 `app/src/demos/ComponentNameDemo.tsx`
4. 在 `app/src/App.tsx` 的 `DEMO_COMPONENTS` 和 `NAV_GROUPS` 中注册该演示

## TypeScript 配置

`ui/` 和 `app/` 均使用严格的 TypeScript 设置（`tsconfig.app.json`）：

- `"strict": true`
- `"noUnusedLocals": true`
- `"noUnusedParameters": true`
- `"erasableSyntaxOnly": true`
- `"noUncheckedSideEffectImports": true`
- `"moduleResolution": "bundler"`
- `"jsx": "react-jsx"`

为所有组件的 props 和返回值添加类型。避免隐式 `any`。

## 代码风格与约定

- **语言**：源代码注释和文档使用**中文**编写。Agent 在修改代码注释或文档时应尊重这一点。
- **文件命名**：组件使用 PascalCase，工具函数使用 camelCase。
- **CSS 命名**：组件类名使用前缀，如 `.fc-button`、`.fc-input`、`.fc-rg`（RelationGraph）。
- **CSS 变量**：所有设计令牌使用 `--fc-*` 前缀（例如 `--fc-color-primary`、`--fc-color-bg`）。
- **Props 模式**：组件接受大量的颜色覆盖 props（例如 `background`、`borderColor`、`hoverBackground`），以便宿主可以在不更改全局
  CSS 的情况下为单个实例设置主题。

## 测试与质量

- 本仓库**当前未配置测试框架**（不存在 Jest、Vitest 或 Playwright 配置）。
- 仓库根目录**不存在 ESLint 配置文件**。如需进行代码检查，必须先创建配置。
- 严格的 `tsconfig.app.json` 设置强制执行类型检查。

## 安全注意事项

- 应用在本地运行 Vite 开发服务器。开发时请勿将其暴露给不受信任的网络。
- 仓库中未存储任何密钥或 API token。
- `MapShapeEditor` 和 `RelationGraph` 消费宿主注入的函数（`api`、`layoutFn`）。在信任之前，请在宿主边界验证所有数据。

## Git 说明

- 当前分支：`main`
- `dist/` 和 `node_modules/` 已加入 gitignore。
- 除非明确要求，否则请勿运行 `git commit`、`git push` 或其他 git 变更操作。
