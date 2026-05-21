# lib_ui — AGENTS.md

> 本文档面向 AI 编码助手。`README.md` 面向使用者，本文只保留开发、维护和禁止事项。

## 项目概览

`lib_ui` 是 FlowCloudAI 的 React 组件库仓库，发布包名为 `flowcloudai-ui`。仓库包含 `ui/` 组件库源码和 `app/` Vite 演示应用，桌面端 `app_main` 通过本地路径依赖消费该包。

## 构建 / 运行 / 测试 / lint

```bash
cd lib_ui

# 检查组件库边界、公共导出和新增大文件
npm install
npm run lint
npm run lint:boundaries

# 构建组件库，输出 ui/dist/
cd ui
npm install
npm run build

# 启动演示应用，默认 http://localhost:5174
cd ../app
npm install
npm run install:local
npm run dev
```

当前未配置 Jest / Vitest / Playwright。修改组件库源码至少运行 `cd ui && npm run build`；修改演示应用需手动打开 `npm run dev` 验证。

## 代码风格与命名约定

- React 19 + TypeScript 5.9，`ui/` 和 `app/` 均使用严格 TypeScript 配置。
- 注释、文档和示例文本使用中文。
- 组件文件使用 PascalCase，工具函数使用 camelCase，类型使用 PascalCase。
- 组件 CSS 类名沿用 `fc-` 前缀，例如 `.fc-button`、`.fc-input`、`.fc-tree`。
- 新增设计令牌必须先写入 `ui/src/style/index.css`，再在组件 CSS 中引用 `var(--fc-...)`。
- 公共入口只允许从 `ui/src/index.ts` 显式导出，禁止 `export *`。
- 演示应用必须从包名导入：`import { Button } from 'flowcloudai-ui'`；禁止相对导入 `../../ui/src`。

## 目录结构与模块职责

```text
lib_ui/
├── app/                 # Vite 演示应用和各组件 demo
├── docs/                # 版本记录和历史设计文档
├── memory/              # 维护记忆
├── scripts/             # 边界检查脚本
├── ui/
│   ├── src/
│   │   ├── components/  # 组件源码，每个组件独立目录
│   │   ├── hooks/       # 共享 hooks
│   │   ├── style/       # 全局 CSS token 和组件样式入口
│   │   ├── ThemeProvider.tsx
│   │   └── index.ts     # 唯一公共导出入口
│   ├── package.json     # 发布包配置、exports 和 peerDependencies
│   └── tsup.config.ts   # ESM + d.ts + CSS 构建
├── package.json         # 根级 lint 脚本
└── README.md
```

重点模块：

- `ui/src/style/index.css`：主题变量和组件样式导入链。
- `ui/src/ThemeProvider.tsx`：light / dark / system 主题上下文。
- `ui/src/components/Alert/`：全局提示和确认上下文。
- `ui/src/components/Box/RollingBox.tsx`：滚动展示容器，已在 demo 中作为展示类组件维护。
- `ui/src/components/ContextMenu/`：右键菜单上下文。
- `ui/src/components/Tree/`、`MessageBox/`、`MarkdownEditor/`、`TeraEditor/`：复杂组件，改动前先阅读现有类型和 demo。
- `app/vite.config.ts`：将 `flowcloudai-ui` 和 `flowcloudai-ui/style` 指向 `../ui/dist`，因此运行 demo 前要先构建 `ui/`。

## 提交信息与 PR 规范

- 提交信息默认使用中文，格式建议为“动词 + 范围 + 目的”，例如 `拆分树组件删除弹窗`。
- 一个提交只包含一个明确任务，不混入构建产物、格式化或无关组件调整。
- PR 说明需写明影响的组件、是否修改公共 API / CSS token、运行过的 `npm run lint`、`npm run build` 和手动 demo 验证。
- 新增组件需同时提供 `app/src/demos/<ComponentName>Demo.tsx`，并在 `app/src/App.tsx` 注册。

## 安全 / 禁止事项

- 不提交 `node_modules/`、`ui/dist/`、本地日志或临时截图。
- 不在组件库中依赖 `@tauri-apps/api`、`app_main`、`worldflow_core` 或 `core_ai_client`。
- 不把业务状态、真实用户数据或 API Key 写入 demo。
- 不直接修改打包产物；所有变更应落在 `ui/src`、`app/src` 或脚本源码。
- 不新增超过 300 行的 TSX / CSS 文件；确需承接历史大文件时，先写拆分计划。

## 项目特有坑点

- `flowcloudai-ui` 的 React 是 peer dependency；演示应用通过 alias 和 dedupe 避免双 React。
- `app/package.json` 的 `install:local` 会安装 `../ui`，但 Vite alias 仍指向 `ui/dist`，所以 demo 依赖最新构建结果。
- `scripts/check-boundaries.mjs` 会阻止相对导入 `ui/src`、反向依赖业务层、`export *`、已删除地图编辑组件残留和新增大文件。
- 样式不会自动注入，使用方必须导入 `flowcloudai-ui/style`。
- 修改 CSS token 名称会影响 `app_main`，需要同步搜索使用处并更新文档。
