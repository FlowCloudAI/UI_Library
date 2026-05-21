# FlowCloud UI Library

`lib_ui` 是 FlowCloudAI 的 React 组件库仓库，发布包名为 `flowcloudai-ui`。它提供主题系统、基础控件、导航结构、内容展示、Markdown/Tera 编辑器和会话树等通用 UI 能力，供桌面端和官网前端复用。

## 快速开始

### 安装

```bash
npm install flowcloudai-ui
```

### 最小示例

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import {AlertProvider, Button, ContextMenuProvider, ThemeProvider} from 'flowcloudai-ui'
import 'flowcloudai-ui/style'

function App() {
    return <Button>你好，FlowCloud UI</Button>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme="system">
            <AlertProvider>
                <ContextMenuProvider>
                    <App />
                </ContextMenuProvider>
            </AlertProvider>
        </ThemeProvider>
    </React.StrictMode>,
)
```

### 本地开发

```bash
cd lib_ui
npm install
npm run lint

cd ui
npm install
npm run build

cd ../app
npm install
npm run install:local
npm run dev
```

演示应用默认监听 `http://localhost:5174`。`app/vite.config.ts` 将 `flowcloudai-ui` 和 `flowcloudai-ui/style` 指向 `../ui/dist`，因此运行 demo 前需要先构建 `ui/`。

## 主要功能 / 使用方式

- **主题系统**：`ThemeProvider`、`useTheme`、`useOptionalTheme` 和 `flowcloudai-ui/style` 中的 `--fc-*` CSS 变量。
- **基础控件**：`Button`、`ButtonGroup`、`ButtonToolbar`、`CheckButton`、`Input`、`Slider`、`Select`、`TagItem`。
- **内容展示**：`Avatar`、`Card`、`RollingBox`、`ListGroup`、`VirtualList`、`MarkdownEditor`、`MessageBox`。
- **导航与结构**：`SideBar`、`TabBar`、`Tree`、`DeleteDialog`、`OrphanDialog`。
- **创作与 AI 相关组件**：`ConversationTreeView`、`Timeline`、`TeraEditor`。
- **交互基础设施**：`AlertProvider` / `useAlert`、`ContextMenuProvider` / `useContextMenu`、`lazyLoad`。
- **树工具函数**：`flatToTree`、`findNodeInfo`、`isDescendantOf`。

新增公共组件时，应从 `ui/src/index.ts` 导出组件和类型，并在 `app/src/demos/` 增加演示页。

## 技术栈

- React 19、TypeScript 5.9。
- `tsup` 8 打包组件库，输出 ESM、类型声明和 CSS。
- Vite 8 提供演示应用。
- 主要运行时依赖：`@dnd-kit/*`、`@uiw/react-md-editor`、`@monaco-editor/react`、`monaco-editor`、`react-markdown`、`react-syntax-highlighter`。
- 演示应用使用 `lucide-react` 图标。

## 目录结构

```text
lib_ui/
├── app/              # Vite 演示应用，默认端口 5174
├── docs/             # 版本记录与历史设计文档
├── memory/           # 维护记录
├── scripts/          # 边界检查等仓库脚本
├── ui/               # 组件库源码、样式入口和 tsup 配置
├── package.json      # 根级 lint 脚本
├── package-lock.json
├── AGENTS.md         # AI 编码助手维护指南
└── README.md         # 当前文档
```

## 许可证

TODO：仓库当前没有显式 LICENSE 文件，发布前需要确认许可证。

## 贡献方式

提交前请根据改动范围运行检查：

```bash
cd lib_ui
npm run lint

cd ui
npm run build
```

修改演示应用时，再运行 `cd app && npm run dev` 做手动验证。新增组件需同步更新 `ui/src/index.ts`、`app/src/demos/` 和本 README 的功能列表。
