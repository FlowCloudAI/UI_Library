# FlowCloud UI Library

一个现代化的 React 组件库，基于 TypeScript 和 Vite 构建。提供开箱即用的高质量 UI 组件，支持浅色/深色主题切换。

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev)

## 🎯 核心特性

- 📦 **20+ 高质量组件** - 涵盖表单、导航、内容展示等多个场景
- 🎨 **主题系统** - 内置浅色/深色主题，ThemeProvider 全局管理
- ⚡ **高性能** - 虚拟列表支持超大数据集，拖拽优化
- 🎯 **TypeScript** - 完整的类型定义，开发体验一流
- 📱 **响应式设计** - 适配各种屏幕尺寸
- 🎁 **开箱即用** - ESM、CJS、Types 完整分发

## 📦 安装

```bash
npm install flowcloudai-ui
# 或
yarn add flowcloudai-ui
```

## 🚀 快速开始

### 1. 导入样式

```typescript
import 'flowcloudai-ui/style'
```

### 2. 使用 ThemeProvider

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider, AlertProvider, ContextMenuProvider } from 'flowcloudai-ui'
import App from './App'
import 'flowcloudai-ui/style'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AlertProvider>
        <ContextMenuProvider>
          <App/>
        </ContextMenuProvider>
      </AlertProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
```

### 3. 在组件中使用

```typescript
import { Button, useTheme } from 'flowcloudai-ui'

export function MyComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        切换主题
      </Button>
    </div>
  )
}
```

## 📚 组件库

### 基础组件

#### Button（按钮）
多种变体和尺寸的按钮组件。

```typescript
import { Button } from 'flowcloudai-ui'

export function ButtonExample() {
  return (
    <>
      <Button>主要</Button>
      <Button variant="secondary">次要</Button>
      <Button variant="outline">轮廓</Button>
      <Button variant="danger">删除</Button>
      <Button variant="success">确认</Button>
      <Button size="sm">小尺寸</Button>
      <Button size="lg">大尺寸</Button>
      <Button iconLeft="←">返回</Button>
      <Button disabled>禁用</Button>
    </>
  )
}
```

**属性：**
- `variant`: primary | secondary | outline | ghost | danger | success | warning
- `size`: xs | sm | md | lg | xl
- `iconLeft` / `iconRight`: 按钮图标
- `block`: 块级按钮
- `disabled`: 禁用状态

---

#### CheckButton（复选按钮/切换按钮）
切换状态的按钮，常用于开关、模式切换。

```typescript
import { CheckButton } from 'flowcloudai-ui'

export function CheckButtonExample() {
  return (
    <CheckButton
      checked={isDark}
      onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      labelLeft="亮"
      labelRight="暗"
    />
  )
}
```

---

#### Alert（提示框）
支持多种模式的提示框组件，包括 alert、confirm、toast。

```typescript
import { Button, useAlert } from 'flowcloudai-ui'

export function AlertExample() {
  const { showAlert } = useAlert()

  return (
    <div>
      {/* 简单提示 */}
      <Button onClick={() => showAlert('操作成功', 'success')}>
        成功提示
      </Button>

      {/* 确认框 */}
      <Button
        onClick={async () => {
          const res = await showAlert('确定删除吗？', 'warning', 'confirm')
          if (res === 'yes') {
            // 用户点击了确认
          }
        }}
      >
        删除确认
      </Button>

      {/* 自动消失的 Toast */}
      <Button
        onClick={() => showAlert('加载完成', 'info', 'toast', 2000)}
      >
        2秒 Toast
      </Button>
    </div>
  )
}
```

**类型：**
- `alert`: 模态提示框
- `confirm`: 确认框，需要用户选择
- `toast`: 自动消失的浮窗提示

---

### 表单组件

#### Input（输入框）
带有主题支持的文本输入框。

```typescript
import { Input } from 'flowcloudai-ui'

export function InputExample() {
  return <Input placeholder="请输入内容..." />
}
```

---

#### Select（下拉选择器）
支持单选、搜索、自定义选项的下拉菜单。

```typescript
import { Select } from 'flowcloudai-ui'

export function SelectExample() {
  const options = [
    { value: '1', label: '选项1' },
    { value: '2', label: '选项2' },
  ]
  return <Select options={options} placeholder="选择一个选项..." />
}
```

---

#### Slider（滑块）
范围滑块组件，支持单个或范围选择。

```typescript
import { Slider } from 'flowcloudai-ui'

export function SliderExample() {
  return <Slider min={0} max={100} step={5} />
}
```

---

#### TagItem（标签）
用于显示标签、标记等内容。

```typescript
import { TagItem } from 'flowcloudai-ui'

export function TagItemExample() {
  return (
    <>
      <TagItem>标签1</TagItem>
      <TagItem variant="secondary">标签2</TagItem>
    </>
  )
}
```

---

### 展示组件

#### Avatar（头像）
用户头像组件，支持图片和文字。

```typescript
import { Avatar } from 'flowcloudai-ui'

export function AvatarExample() {
  return (
    <>
      <Avatar src="https://..." alt="用户名" />
      <Avatar>JD</Avatar>
    </>
  )
}
```

---

#### Card（卡片）
内容容器组件，用于展示卡片式内容。

```typescript
import { Card } from 'flowcloudai-ui'

export function CardExample() {
  return (
    <Card>
      <Card.Header>标题</Card.Header>
      <Card.Body>内容区域</Card.Body>
      <Card.Footer>底部区域</Card.Footer>
    </Card>
  )
}
```

---

#### ListGroup（列表组）
垂直排列的列表项组件。

```typescript
import { ListGroup } from 'flowcloudai-ui'

export function ListGroupExample() {
  return (
    <ListGroup>
      <ListGroup.Item>列表项 1</ListGroup.Item>
      <ListGroup.Item>列表项 2</ListGroup.Item>
      <ListGroup.Item active>列表项 3</ListGroup.Item>
    </ListGroup>
  )
}
```

---

#### VirtualList（虚拟列表）
高性能列表组件，支持超大数据集。采用虚拟化技术，只渲染可见项。

```typescript
import { VirtualList } from 'flowcloudai-ui'

export function VirtualListExample() {
  const items = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    label: `Item ${i}`,
  }))

  return (
    <VirtualList
      items={items}
      itemKey="id"
      itemHeight={40}
      height={600}
      renderItem={(item) => <div>{item.label}</div>}
    />
  )
}
```

---

#### MarkdownEditor（Markdown 编辑器）
支持 Markdown 预览和编辑的编辑器组件。

```typescript
import { MarkdownEditor } from 'flowcloudai-ui'

export function MarkdownEditorExample() {
  const [md, setMd] = React.useState('# 标题\n\n内容...')
  return (
    <MarkdownEditor
      value={md}
      onChange={setMd}
      height={500}
    />
  )
}
```

---

#### RollingBox（滚动盒子）
带动画效果的滚动内容展示组件。

```typescript
import { RollingBox } from 'flowcloudai-ui'

export function RollingBoxExample() {
  return (
    <RollingBox>
      <div>滚动内容 1</div>
      <div>滚动内容 2</div>
    </RollingBox>
  )
}
```

---

#### LazyLoad（懒加载）
当内容进入视口时才加载的组件。

```typescript
import { LazyLoad } from 'flowcloudai-ui'

export function LazyLoadExample() {
  return (
    <LazyLoad>
      {/* 这些内容只在进入视口时加载 */}
      <img src="large-image.jpg" alt="图片" />
    </LazyLoad>
  )
}
```

---

#### Chat（聊天界面）
AI 聊天应用的完整界面组件。

```typescript
import { Chat } from 'flowcloudai-ui'

export function ChatExample() {
  const messages = [
    {
      id: '1',
      content: '你好！',
      type: 'assistant' as const,
      timestamp: new Date(),
    },
    {
      id: '2',
      content: '你好！有什么可以帮助你的？',
      type: 'user' as const,
      timestamp: new Date(),
    },
  ]

  return (
    <Chat
      messages={messages}
      title="AI 智能助手"
      showHeader
      showFooter
    />
  )
}
```

---

### 导航组件

#### TabBar（标签栏）
标签页导航组件。

```typescript
import { TabBar } from 'flowcloudai-ui'

export function TabBarExample() {
  const [active, setActive] = React.useState('tab1')

  return (
    <TabBar active={active} onChange={setActive}>
      <TabBar.Tab key="tab1" label="标签 1" />
      <TabBar.Tab key="tab2" label="标签 2" />
      <TabBar.Tab key="tab3" label="标签 3" />
    </TabBar>
  )
}
```

---

#### SideBar（侧边栏）
侧边导航栏组件。

```typescript
import { SideBar } from 'flowcloudai-ui'

export function SideBarExample() {
  return (
    <SideBar>
      <SideBar.Item>首页</SideBar.Item>
      <SideBar.Item>用户管理</SideBar.Item>
      <SideBar.Item>设置</SideBar.Item>
    </SideBar>
  )
}
```

---

#### Tree（树形组件）
支持拖拽、编辑、删除的树形组件。

```typescript
import { Tree, flatToTree } from 'flowcloudai-ui'

export function TreeExample() {
  const [data, setData] = React.useState([
    { id: '1', parent_id: null, name: '根目录', sort_order: 0 },
    { id: '2', parent_id: '1', name: '子目录 1', sort_order: 0 },
    { id: '3', parent_id: '1', name: '子目录 2', sort_order: 1 },
  ])

  const { roots } = flatToTree(data)

  return (
    <Tree
      roots={roots}
      onRename={(key, name) => {
        // 处理重命名
      }}
      onDelete={(key, mode) => {
        // 处理删除
      }}
      onDrop={(dragKey, dropKey, position) => {
        // 处理拖拽
      }}
    />
  )
}
```

**特性：**
- ✨ 拖拽排序
- ✏️ 节点重命名
- 🗑️ 删除节点（级联或提升）
- 📁 创建新节点

---

### 覆盖层组件

#### ContextMenu（上下文菜单）
右键菜单组件，基于 Context API。

```typescript
import { Button, useContextMenu } from 'flowcloudai-ui'

export function ContextMenuExample() {
  const { show } = useContextMenu()

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    show({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: '复制', onClick: () => console.log('复制') },
        { label: '粘贴', onClick: () => console.log('粘贴') },
        { type: 'divider' },
        { label: '删除', onClick: () => console.log('删除') },
      ],
    })
  }

  return (
    <div onContextMenu={handleContextMenu} style={{ padding: '20px' }}>
      右键点击
    </div>
  )
}
```

---

#### SmartMessage（智能消息）
动态内容展示组件。

```typescript
import { SmartMessage } from 'flowcloudai-ui'

export function SmartMessageExample() {
  return (
    <SmartMessage
      content="这是一条智能消息"
      type="info"
    />
  )
}
```

---

## 🎨 主题系统

### 使用 useTheme Hook

```typescript
import { useTheme } from 'flowcloudai-ui'

export function MyComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      当前主题: {theme}
    </button>
  )
}
```

### CSS 变量

组件使用 CSS 变量实现主题，可在全局样式中覆盖：

```css
:root {
  --fc-color-primary: #007bff;
  --fc-color-secondary: #6c757d;
  --fc-color-success: #28a745;
  --fc-color-danger: #dc3545;
  --fc-color-warning: #ffc107;
  --fc-color-info: #17a2b8;
  /* ... 更多变量 */
}

@media (prefers-color-scheme: dark) {
  :root {
    --fc-color-primary: #0d6efd;
    /* ... 暗色主题变量 */
  }
}
```

---

## 🛠️ 项目结构

```
flowcloudai-ui-monorepo/
├── ui/                          # 组件库
│   ├── src/
│   │   ├── components/          # 所有组件
│   │   │   ├── Button/
│   │   │   ├── Alert/
│   │   │   ├── Tree/
│   │   │   └── ...
│   │   ├── ThemeProvider.tsx    # 主题提供者
│   │   ├── AlertProvider.tsx    # 提示框提供者
│   │   ├── ContextMenuProvider.tsx
│   │   ├── style/               # 全局样式
│   │   └── index.ts             # 主入口
│   ├── dist/                    # 编译输出
│   ├── tsup.config.ts
│   └── package.json
├── app/                         # 演示应用
│   ├── src/
│   │   ├── demos/              # 每个组件的演示
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── README.md
```

---

## 📖 开发指南

### 快速开始

```bash
# 克隆项目
git clone <repo-url>
cd flowcloudai-ui-library

# 安装依赖并链接本地包
cd app && npm run install:local

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 查看所有组件演示。

### 构建

```bash
# 构建组件库
cd ui && npm run build

# 输出到 ui/dist/
# - dist/index.js (ESM)
# - dist/index.cjs (CJS)
# - dist/index.d.ts (Types)
# - dist/index.css (Styles)
```

### 添加新组件

1. 在 `ui/src/components/` 创建新文件夹
2. 实现组件并在 `ui/src/index.ts` 中导出
3. 在 `app/src/demos/` 创建演示文件
4. 在 `app/src/App.tsx` 的 `NAV_GROUPS` 和 `DEMO_COMPONENTS` 中注册

---

## ⚠️ 重要提示

### 导入规则

在 `app/` 中必须从 `flowcloudai-ui` 包导入，**不能直接从 `../../ui/src` 导入**。这确保 Context 提供者（ThemeProvider、AlertProvider、ContextMenuProvider）使用同一实例。

```typescript
// ✅ 正确
import { useTheme, Button } from 'flowcloudai-ui'

// ❌ 错误 - 会导致 "useTheme must be used within <ThemeProvider>" 错误
import { useTheme, Button } from '../../ui/src'
```

---

## 📦 npm 发布

```bash
# 构建库
cd ui && npm run build

# 发布到 npm
npm publish
```

消费者可以这样使用：

```bash
npm install flowcloudai-ui
```

```typescript
import { Button, ThemeProvider } from 'flowcloudai-ui'
import 'flowcloudai-ui/style'
```

---

## 🔧 技术栈

- **React 19** - UI 框架
- **TypeScript 5.9** - 类型系统
- **Vite 8** - 构建工具
- **tsup 8** - 库打包器
- **@dnd-kit** - 拖拽库
- **@uiw/react-md-editor** - Markdown 编辑器

---

## 📄 许可证

MIT

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📞 联系方式

- 📧 Email: support@flowcloudai.com
- 🐛 Issues: [GitHub Issues](https://github.com/flowcloudai/ui-library/issues)
