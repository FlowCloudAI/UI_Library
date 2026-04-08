# FlowCloud UI Library

基于 React 19、TypeScript 和 Vite/tsup 构建的 UI 组件库，包含主题系统、基础表单、导航组件、内容展示、关系图谱和时间线等能力。

本文档只列组件和工具的自定义参数。`button`、`input`、`div`、`ul`、`li` 等原生 HTML 元素自带属性，以及通用的 `className`、`style` 等常规容器参数，不重复说明。

## 安装

```bash
npm install flowcloudai-ui
```

## 快速开始

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  ThemeProvider,
  AlertProvider,
  ContextMenuProvider,
  Button,
} from 'flowcloudai-ui'
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

## 本地开发

### 目录

- `ui/`：组件库源码、打包配置、发布包内容
- `app/`：组件演示应用

### 启动流程

```bash
cd ui
npm install
npm run build

cd ../app
npm install
npm run dev
```

演示应用默认端口为 `5174`。

## 主题与样式

### 样式入口

```tsx
import 'flowcloudai-ui/style'
```

### 主题 Provider

`ThemeProvider` 会把主题写入目标元素的 `data-theme` 属性：

- `data-theme="light"`
- `data-theme="dark"`

默认写入 `document.documentElement`；如果传入 `target`，则写入对应元素。

### 常用 CSS 变量

- `--fc-color-primary`
- `--fc-color-primary-hover`
- `--fc-color-primary-active`
- `--fc-color-bg`
- `--fc-color-bg-secondary`
- `--fc-color-bg-tertiary`
- `--fc-color-text`
- `--fc-color-text-secondary`
- `--fc-color-border`
- `--fc-radius-md`
- `--fc-font-family`

### 覆盖示例

```tsx
import 'flowcloudai-ui/style'
import './theme-override.css'
```

```css
:root {
  --fc-color-primary: #e8711a;
  --fc-color-primary-hover: #c05a12;
  --fc-color-primary-active: #994810;
}

[data-theme='dark'] {
  --fc-color-bg: #111111;
  --fc-color-bg-secondary: #1b1b1b;
}
```

## Hooks 与工具

### `useTheme`

返回：

- `theme`：用户设置的主题值，类型为 `'light' | 'dark' | 'system'`
- `resolvedTheme`：最终生效主题，类型为 `'light' | 'dark'`
- `setTheme(theme)`：切换主题

### `useAlert`

返回：

- `showAlert(msg, type, mode?, duration?)`：显示提示框、确认框或 toast，返回 `Promise<string>`

### `useContextMenu`

返回：

- `showContextMenu(event, items)`：在鼠标事件位置显示菜单

### `lazyLoad(importFn, options?)`

用途：按需懒加载组件，并提供超时兜底。

参数：

- `importFn`：动态导入函数，需返回默认导出组件
- `options.fallback`：加载中占位内容
- `options.timeout`：超时时间，单位毫秒

### `flatToTree(list)`

用途：把扁平分类列表转换为树结构。

返回：

- `roots`：根节点数组
- `orphans`：父节点缺失的孤儿节点数组

### `findNodeInfo(nodes, key, parent?)`

用途：在树中查找节点、父节点、兄弟列表和索引。

### `isDescendantOf(roots, ancestorKey, targetKey)`

用途：判断 `targetKey` 是否为 `ancestorKey` 的后代。

### `mockLayoutProvider`

用途：为 `Relation` 提供默认 mock 布局能力，适合 demo、Storybook 和本地联调。

### `useBackendLayout(options)`

用途：在关系图中驱动异步布局请求、视口拟合和加载状态同步。

## 辅助数据结构

### `SelectOption`

- `value: string | number`：选项值
- `label: string`：显示文本
- `disabled?: boolean`：是否禁用
- `group?: string`：所属分组名

### `SideBarItem`

- `key: string`：唯一标识
- `label: string`：显示文本
- `icon?: ReactNode`：图标
- `disabled?: boolean`：是否禁用
- `href?: string`：链接地址，传入后项会按链接渲染

### `TabItem`

- `key: string`：唯一标识
- `label: ReactNode`：标签文本或自定义内容
- `disabled?: boolean`：是否禁用
- `closable?: boolean`：是否允许关闭，可覆盖 `TabBar` 全局设置

### `TagSchema`

- `id: string`：字段标识
- `name: string`：标签名
- `type: 'number' | 'string' | 'boolean'`：值类型
- `range_min?: number | null`：数值下限
- `range_max?: number | null`：数值上限

### `Message`

- `id: string`：消息 ID
- `content: string`：消息文本
- `type: 'user' | 'assistant' | 'system' | 'tool'`：消息角色
- `timestamp: Date`：消息时间
- `status?: 'sending' | 'sent' | 'error'`：发送状态
- `toolName?: string`：工具消息名称
- `toolResult?: any`：工具消息结果

### `Conversation`

- `id: string`：会话 ID
- `title: string`：会话标题
- `lastMessage: string`：最后一条消息摘要
- `timestamp: Date`：更新时间
- `messages: Message[]`：消息数组

### `TimelineEvent`

- `id: string`：事件 ID
- `title: string`：事件标题
- `startTime: number`：起始时间戳
- `date: string`：显示日期文本
- `description?: string`：事件说明
- `color?: string`：事件点颜色

### `RelationNodeData`

- `id: string`：节点 ID
- `name?: string`：节点名称
- `title?: string`：节点标题
- `type?: string`：节点类型
- `group?: string`：分组标识
- `categoryId?: string`：分类标识
- `summary?: string`：摘要
- `description?: string`：描述
- `content?: string`：正文内容
- `avatar?: string`：头像 URL
- `importance?: number`：重要度
- `color?: string`：节点颜色
- `icon?: string`：节点图标文本

### `RelationEdgeData`

- `source: string`：起点节点 ID
- `target: string`：终点节点 ID
- `label?: string`：边标签
- `content?: string`：边说明
- `type?: string`：边类型
- `relation?: 'one_way' | 'two_way'`：关系方向
- `direction?: 'one_way' | 'two_way'`：方向字段别名
- `strength?: number`：边强度
- `important?: boolean`：是否为重要边

### `RelationTypeStyle`

- `color?: string`：节点类型颜色
- `icon?: string`：节点类型图标文本

### `LayoutProvider`

- `computeLayout(request): Promise<LayoutResponse>`：执行布局计算并返回节点坐标和可选边界框

## 组件文档

## Providers

### `ThemeProvider`

用途：提供主题上下文和主题切换能力。

参数：

- `children: ReactNode`：子节点
- `defaultTheme?: 'light' | 'dark' | 'system'`：默认主题
- `target?: HTMLElement`：主题属性写入目标元素

### `AlertProvider`

用途：提供 `useAlert()` 上下文，并渲染弹窗/确认框/toast。

参数：

- `children: ReactNode`：子节点
- `background?: string`：弹层背景色覆盖
- `borderColor?: string`：弹层边框色覆盖

### `ContextMenuProvider`

用途：提供 `useContextMenu()` 上下文，并管理右键菜单浮层。

参数：

- `children: ReactNode`：子节点
- `background?: string`：菜单背景色覆盖
- `borderColor?: string`：菜单边框色覆盖
- `hoverBackground?: string`：菜单项 hover 背景色覆盖

## 基础组件

### `Button`

用途：通用按钮，支持多种视觉变体、尺寸和状态。

参数：

- `variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'`：按钮变体
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`：按钮尺寸
- `radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`：圆角尺寸
- `disabled?: boolean`：是否禁用
- `loading?: boolean`：是否显示加载状态
- `block?: boolean`：是否占满整行宽度
- `circle?: boolean`：是否为圆形按钮
- `iconOnly?: boolean`：是否为纯图标按钮
- `iconLeft?: ReactNode`：左侧图标
- `iconRight?: ReactNode`：右侧图标
- `background?: string`：默认背景色
- `hoverBackground?: string`：hover 背景色
- `activeBackground?: string`：激活态背景色
- `color?: string`：默认文字色
- `hoverColor?: string`：hover 文字色
- `activeColor?: string`：激活态文字色
- `borderColor?: string`：默认边框色
- `hoverBorderColor?: string`：hover 边框色

### `ButtonGroup`

用途：将多个按钮按组排列。

参数：

- `children: ReactNode`：按钮组内容

### `ButtonToolbar`

用途：为按钮组提供工具栏级别的布局。

参数：

- `children: ReactNode`：工具栏内容
- `align?: 'left' | 'center' | 'right' | 'between'`：内容对齐方式

### `CheckButton`

用途：二值切换按钮，可用于亮暗切换、开关、模式切换。

参数：

- `checked?: boolean`：受控选中状态
- `defaultChecked?: boolean`：非受控初始状态
- `onChange?: (checked: boolean) => void`：状态变化回调
- `disabled?: boolean`：是否禁用
- `size?: 'sm' | 'md' | 'lg'`：尺寸
- `radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`：轨道圆角
- `labelLeft?: string`：左侧标签
- `labelRight?: string`：右侧标签
- `trackBackground?: string`：未选中轨道背景色
- `checkedTrackBackground?: string`：选中轨道背景色
- `thumbBackground?: string`：滑块背景色
- `thumbDotColor?: string`：滑块内部装饰色
- `labelColor?: string`：标签文字色

## 表单组件

### `Input`

用途：文本输入框，支持前后缀、清空、密码显隐和状态样式。

参数：

- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`：输入框尺寸
- `status?: 'default' | 'error' | 'warning' | 'success'`：状态样式
- `radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`：圆角尺寸
- `prefix?: ReactNode`：输入框前缀内容
- `suffix?: ReactNode`：输入框后缀内容
- `allowClear?: boolean`：是否显示清空按钮
- `passwordToggle?: boolean`：密码输入时是否显示显隐切换按钮
- `addonBefore?: ReactNode`：外层前置附加内容
- `addonAfter?: ReactNode`：外层后置附加内容
- `helperText?: string`：辅助说明文本
- `onChange?: (value: string) => void`：值变更回调，直接返回字符串值
- `onClear?: () => void`：点击清空时触发

### `Slider`

用途：单值或范围滑块，支持横向/纵向、刻度、tooltip 和颜色定制。

参数：

- `value?: number | [number, number]`：受控值
- `defaultValue?: number | [number, number]`：非受控初始值
- `onChange?: (value: number | [number, number]) => void`：值变化回调
- `min?: number`：最小值
- `max?: number`：最大值
- `step?: number`：步进值
- `range?: boolean`：是否启用双滑块范围模式
- `orientation?: 'horizontal' | 'vertical'`：方向
- `disabled?: boolean`：是否禁用
- `marks?: Record<number, string>`：刻度标签
- `tooltip?: boolean`：是否显示 tooltip
- `trackBackground?: string`：轨道背景色
- `fillBackground?: string`：已填充区域背景色
- `thumbBackground?: string`：滑块背景色
- `thumbBorderColor?: string`：滑块边框色
- `markDotColor?: string`：刻度点颜色
- `markLabelColor?: string`：刻度文字颜色
- `tooltipBackground?: string`：tooltip 背景色
- `tooltipColor?: string`：tooltip 文字色

### `Select`

用途：单选或多选下拉框，支持搜索、分组、虚拟滚动和颜色定制。

参数：

- `options: SelectOption[]`：选项数组
- `value?: string | number | (string | number)[]`：受控值
- `defaultValue?: string | number | (string | number)[]`：非受控初始值
- `onChange?: (value: string | number | (string | number)[]) => void`：值变更回调
- `placeholder?: string`：占位文本
- `searchable?: boolean`：是否启用搜索
- `multiple?: boolean`：是否启用多选
- `disabled?: boolean`：是否禁用
- `radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`：触发器和面板圆角
- `virtualScroll?: boolean`：是否启用虚拟滚动
- `virtualItemHeight?: number`：虚拟列表单项高度
- `maxHeight?: number`：下拉列表最大高度
- `triggerBackground?: string`：触发器背景色
- `triggerBorderColor?: string`：触发器边框色
- `selectedColor?: string`：已选项文字色
- `selectedBackground?: string`：已选项背景色
- `hoverBackground?: string`：hover 或键盘高亮背景色

### `TagItem`

用途：展示或编辑结构化标签值，支持字符串、数值和布尔值。

参数：

- `schema: TagSchema`：字段结构定义
- `value?: number | string | boolean`：当前值
- `onChange?: (value) => void`：值变更回调
- `mode?: 'show' | 'edit'`：显示模式，`show` 可双击进入编辑，`edit` 始终编辑
- `background?: string`：背景色
- `color?: string`：文字色
- `borderColor?: string`：边框色

## 展示组件

### `Avatar`

用途：头像组件，支持图片、回退图片、边框和懒加载。

参数：

- `src?: string`：头像图片地址
- `fallbackSrc?: string`：主图加载失败时的回退图片地址
- `size?: number | string`：头像尺寸
- `shape?: 'circle' | 'square'`：形状
- `alt?: string`：图片替代文本
- `lazyLoad?: boolean`：是否启用图片懒加载
- `onImageLoad?: () => void`：图片加载成功回调
- `onImageError?: (error?: Event) => void`：图片加载失败回调
- `bordered?: boolean`：是否显示边框

### `Card`

用途：卡片容器，支持图片区、文字区、悬停展开、渐变遮罩和标签角标。

参数：

- `image?: string`：图片地址
- `imageSlot?: ReactNode`：自定义图片区内容
- `imageHeight?: number | string`：图片区高度
- `title?: ReactNode`：标题
- `description?: ReactNode`：描述
- `actions?: ReactNode`：操作区内容
- `extraInfo?: ReactNode`：额外信息
- `variant?: 'default' | 'bordered' | 'shadow' | 'outline'`：卡片视觉风格
- `hoverable?: boolean`：是否启用 hover 效果
- `disabled?: boolean`：是否禁用交互
- `contentAreaRatio?: number`：文字区初始占比
- `hoverContentAreaRatio?: number`：hover 后文字区占比
- `expandContentOnHover?: boolean`：hover 时是否展开文字区
- `overlayStartOpacity?: number`：渐变遮罩起始透明度
- `overlayEndOpacity?: number`：渐变遮罩结束透明度
- `tag?: ReactNode`：左上角标签
- `onClick?: () => void`：点击回调

### `ListGroup`

用途：列表组容器，用于承载多项 `ListGroupItem`。

参数：

- `bordered?: boolean`：是否显示外边框
- `flush?: boolean`：是否去掉外层圆角和额外边距感

### `ListGroupItem`

用途：列表组单项，支持激活态、禁用态和点击交互。

参数：

- `active?: boolean`：是否处于激活态
- `disabled?: boolean`：是否禁用
- `onClick?: (event) => void`：点击回调

### `RollingBox`

用途：带自定义滚动条的内容容器，支持横向/纵向滚动和滚动条样式控制。

参数：

- `showThumb?: 'auto' | 'hide' | 'show'`：滚动条显示模式
- `horizontal?: boolean`：是否启用横向滚动
- `vertical?: boolean`：是否启用纵向滚动
- `thumbSize?: 'thin' | 'normal' | 'thick'`：滚动条尺寸
- `showTrack?: boolean`：是否显示轨道
- `children: ReactNode`：滚动内容
- `thumbColor?: string`：滚动条颜色
- `thumbHoverColor?: string`：hover 滚动条颜色
- `thumbActiveColor?: string`：滚动中滚动条颜色
- `trackColor?: string`：轨道背景色

### `VirtualList`

用途：只渲染可见区域的高性能列表。

参数：

- `data: T[]`：数据源
- `height: number`：容器高度
- `itemHeight: number`：单项固定高度
- `renderItem: (item, index) => ReactNode`：单项渲染函数
- `overscan?: number`：预渲染缓冲数量
- `showScrollbar?: boolean`：是否显示滚动条
- `onScrollEnd?: () => void`：滚动到底部回调

### `MarkdownEditor`

用途：Markdown 编辑与预览组件，可选 AI 完成功能入口。

参数：

- `value: string`：编辑器内容
- `onChange: (value: string) => void`：内容变化回调
- `onAiComplete?: () => void`：AI 补全回调，传入后显示 AI 按钮
- `minHeight?: number`：最小高度
- `placeholder?: string`：占位文本
- `mode?: 'edit' | 'preview'`：显示模式
- `background?: string`：编辑区背景色
- `toolbarBackground?: string`：工具栏背景色
- `borderColor?: string`：边框色

### `SmartMessage`

用途：消息气泡组件，支持用户、助手、系统和工具消息。

参数：

- `id: string`：消息 ID
- `content: string`：消息内容
- `role: 'user' | 'assistant' | 'system' | 'tool'`：消息角色
- `timestamp?: Date`：消息时间
- `status?: 'sending' | 'sent' | 'error'`：消息状态
- `toolName?: string`：工具名称
- `toolResult?: any`：工具结果
- `onCopy?: (content: string, role) => void`：复制回调

### `Chat`

用途：完整聊天容器，支持历史会话、消息面板、头部和最小化状态。

参数：

- `messages?: Message[]`：消息列表
- `title?: string`：标题
- `loading?: boolean`：是否显示加载状态
- `conversations?: Conversation[]`：历史会话列表
- `currentConversationId?: string`：当前会话 ID
- `emptyText?: string`：空历史文案
- `newConversationText?: string`：新建会话按钮文案
- `historyTitle?: string`：历史面板标题
- `showHistoryButton?: boolean`：是否显示历史按钮
- `showMinimizeButton?: boolean`：是否显示最小化按钮
- `showHeader?: boolean`：是否显示头部
- `showFooter?: boolean`：是否显示底部区域
- `autoScroll?: boolean`：消息更新时是否自动滚到底部
- `onSwitchConversation?: (conversationId: string) => void`：切换会话回调
- `onNewConversation?: () => void`：新建会话回调
- `onDeleteConversation?: (conversationId: string) => void`：删除会话回调
- `onMinimize?: () => void`：最小化回调
- `onRestore?: () => void`：恢复回调
- `onMessageCopy?: (message: Message) => void`：消息复制回调
- `height?: string`：整体高度
- `width?: string`：整体宽度

### `Timeline`

用途：横向时间线组件，展示带时间点的事件序列。

参数：

- `events: TimelineEvent[]`：时间线事件数组

## 导航与结构组件

### `TabBar`

用途：标签栏组件，支持 attached/floating 风格、关闭、新增、拖拽和颜色定制。

参数：

- `items: TabItem[]`：标签项数组
- `activeKey: string`：当前激活标签 key
- `variant?: 'attached' | 'floating'`：布局风格
- `radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`：容器圆角
- `tabRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'`：单个标签圆角
- `closable?: boolean`：是否允许关闭标签
- `addable?: boolean`：是否显示新增按钮
- `draggable?: boolean`：是否启用拖拽排序
- `minTabWidth?: string`：标签最小宽度
- `maxTabWidth?: string`：标签最大宽度
- `fillWidth?: boolean`：标签是否自动拉伸填满容器
- `onChange: (activeKey: string) => void`：激活标签变更回调
- `onClose?: (key: string) => void`：关闭标签回调
- `onAdd?: () => void`：新增标签回调
- `onReorder?: (items: TabItem[]) => void`：重排回调
- `renderCloseIcon?: (key: string) => ReactNode`：关闭图标渲染函数
- `renderAddButton?: () => ReactNode`：新增按钮渲染函数
- `background?: string`：容器背景色
- `tabColor?: string`：标签默认文字色
- `tabHoverColor?: string`：标签 hover 文字色
- `tabHoverBackground?: string`：标签 hover 背景色
- `tabActiveColor?: string`：标签激活态文字色
- `tabActiveBackground?: string`：标签激活态背景色
- `activeIndicatorColor?: string`：激活态指示器颜色
- `tauriDragRegion?: boolean`：是否把空白区域作为 Tauri 窗口拖拽区

### `SideBar`

用途：侧边栏导航组件，支持折叠、底部固定项和样式变量覆盖。

参数：

- `items: SideBarItem[]`：主菜单项数组
- `bottomItems?: SideBarItem[]`：底部固定菜单项数组
- `selectedKey: string`：当前选中 key
- `collapsed: boolean`：是否折叠
- `width?: number`：展开宽度
- `collapsedWidth?: number`：折叠宽度
- `onSelect: (key: string) => void`：选中项变更回调
- `onCollapse: (collapsed: boolean) => void`：折叠状态变化回调

### `Tree`

用途：树形结构组件，支持搜索、选择、重命名、新建、删除和拖拽移动。

参数：

- `treeData: CategoryTreeNode[]`：树数据
- `onRename?: (key: string, newName: string) => Promise<void>`：重命名回调
- `onCreate?: (parentKey: string | null) => Promise<string>`：创建节点回调，需返回新节点 key
- `onDelete?: (key: string, mode: 'lift' | 'cascade') => Promise<void>`：删除回调
- `onDeleteRequest?: (node: CategoryTreeNode) => void`：发起删除前回调
- `onMove?: (key: string, targetKey: string, position: 'before' | 'after' | 'into') => Promise<void>`：拖拽移动回调
- `onSelect?: (key: string) => void`：选中节点回调
- `selectedKey?: string`：受控选中 key
- `searchable?: boolean`：是否显示搜索框
- `scrollHeight?: string`：滚动区域高度

### `DeleteDialog`

用途：树节点删除确认弹窗，支持提升子节点或级联删除。

参数：

- `node: CategoryTreeNode | null`：待删除节点
- `onClose: () => void`：关闭弹窗回调
- `onDelete: (key: string, mode: 'lift' | 'cascade') => Promise<void>`：确认删除回调

### `OrphanDialog`

用途：处理 `flatToTree` 生成的孤儿节点，让调用方选择提升或移除。

参数：

- `orphans: CategoryTreeNode[]`：孤儿节点列表
- `onResolve: (resolutions: Record<string, 'lift' | 'remove'>) => void`：解决方案提交回调
- `onClose: () => void`：关闭弹窗回调

## 图谱组件

### `Relation`

用途：关系图谱组件，基于 React Flow 渲染节点与边，并通过 `layoutProvider` 计算布局。

参数：

- `data?: { nodes: RelationNodeData[]; edges: RelationEdgeData[] }`：图谱数据
- `layoutProvider: LayoutProvider`：布局提供器
- `nodeOrigin?: [number, number]`：节点原点
- `onNodeClick?: (node: RelationNodeData) => void`：节点点击回调
- `onEdgeClick?: (edge: RelationEdgeData) => void`：边点击回调
- `theme?: 'dark' | 'light'`：图谱主题
- `height?: string | number`：图谱高度
- `width?: string | number`：图谱宽度
- `enableRefresh?: boolean`：是否显示重新布局/刷新能力
- `autoFitContainer?: boolean`：布局完成后是否自动适配视口
- `labelMode?: 'always' | 'selected' | 'hover' | 'important' | 'never'`：边标签显示策略
- `typeStyles?: Record<string, RelationTypeStyle>`：节点类型样式映射
- `renderLayoutStatus?: (state: RelationLayoutState) => ReactNode`：自定义布局状态渲染

## 发布信息

- 包名：`flowcloudai-ui`
- 样式入口：`flowcloudai-ui/style`
- 构建命令：`cd ui && npm run build`
- 演示应用：`cd app && npm run dev`

## 组件源码入口建议

- 主题：`ui/src/ThemeProvider.tsx`
- 全局样式：`ui/src/style/index.css`
- 基础组件：`ui/src/components/Button/`
- 表单组件：`ui/src/components/Input/`、`Select/`、`Slider/`
- 树组件：`ui/src/components/Tree/`
- 图谱组件：`ui/src/components/Relation/`
- 时间线：`ui/src/components/Time/`
