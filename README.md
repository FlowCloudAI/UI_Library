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

时间线事件数据结构。

- `id: string`：事件 ID（必填，唯一）
- `title: string`：事件标题
- `startTime: number`：起始年份（支持负数表示公元前）
- `endTime?: number`：结束年份（可选，用于持续时间段）
- `description?: string`：事件描述文本
- `parentId?: string`：父事件 ID（可选，用于层级关系）

### `RelationNodeInput`

RelationGraph 节点输入数据。

- `id: string`：节点 ID（必填，唯一）
- `label?: string`：节点标签，缺省时显示 id
- `[key: string]: unknown`：宿主可携带任意扩展字段

### `RelationEdgeInput`

RelationGraph 边输入数据。

- `id?: string`：边 ID，缺省时由 source + target + index 自动生成
- `source: string`：起点节点 ID
- `target: string`：终点节点 ID
- `label?: string`：边标签
- `kind?: 'one_way' | 'two_way'`：方向性，默认 `'one_way'`
- `sourceHandle?: string`：起点连接点 ID
- `targetHandle?: string`：终点连接点 ID

### `LayoutRequest`

前端向布局函数传入的请求体（字段名固定，不可修改）。

- `nodeOrigin?: [number, number]`：节点坐标原点，默认 `[0, 0]`
- `nodes: LayoutNode[]`：已测量尺寸的节点列表
- `edges: LayoutEdge[]`：边列表

#### `LayoutNode`

- `id: string`：节点 ID
- `width: number`：DOM 测量宽度（像素，不得猜测）
- `height: number`：DOM 测量高度（像素，不得猜测）

#### `LayoutEdge`

- `id?: string`
- `source: string`
- `target: string`
- `sourceHandle?: string`
- `targetHandle?: string`
- `kind?: 'one_way' | 'two_way'`

### `LayoutResponse`

布局函数返回的响应体（字段名固定，不可修改）。

- `positions: Record<string, { x: number; y: number }>`：按节点 ID 索引的坐标；缺失的节点保留当前坐标
- `bounds?: { x: number; y: number; width: number; height: number }`：图的外接矩形，用于首轮 `fitBounds`
- `layoutHash?: string`：可选的不透明哈希，前端不解析

### `LayoutFunction`

```ts
type LayoutFunction = (request: LayoutRequest) => Promise<LayoutResponse>
```

宿主注入给 RelationGraph 的异步布局函数。组件只调用这个函数，内部不写任何 `invoke` 或 HTTP 请求。

### `RelationLayoutState`

- `layoutReady: boolean`：首轮布局已成功应用
- `layoutLoading: boolean`：正在等待布局响应
- `layoutError: Error | null`：最近一次布局调用的错误

### `RelationGraphRef`

- `exportImage(options?)`：按当前所有节点的 AABB 自动导出图片，返回 `Promise<RelationGraphExportResult>`
- `downloadImage(options?)`：按当前所有节点的 AABB 自动下载图片，返回 `Promise<RelationGraphExportResult>`

### `RelationGraphExportOptions`

- `format?: 'png' | 'jpeg'`：导出格式，默认 `'png'`
- `padding?: number`：节点 AABB 四周扩展的像素留白，默认 `24`
- `scale?: number`：清晰度倍率，默认 `2`
- `backgroundColor?: string`：导出背景色，默认 `#ffffff`
- `quality?: number`：JPEG 质量，范围 `0–1`，默认 `0.92`
- `fileName?: string`：下载文件名，不带扩展名时会自动补齐

### `RelationGraphExportResult`

- `blob: Blob`：导出的图片数据
- `bounds: { x: number; y: number; width: number; height: number }`：本次导出的节点 AABB
- `width: number`：导出区域宽度（含 padding，像素）
- `height: number`：导出区域高度（含 padding，像素）
- `fileName: string`：最终文件名

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
- `onDelete?: () => void`：删除回调；传入后会在编辑态右侧显示 `x` 删除按钮
- `mode?: 'show' | 'edit'`：显示模式，`show` 可双击进入编辑，`edit` 始终编辑
- `editing?: boolean`：受控编辑状态；传入时由调用方负责维护，组件不再内部管理；不传时组件自管（双击进入、提交/取消退出）
- `onEditingChange?: (editing: boolean) => void`：编辑状态变化回调（双击进入、提交或取消时触发）
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

用途：Markdown 编辑与预览组件，支持受控双栏、工具栏扩展、自定义预览渲染和颜色覆盖。

参数：

- `value: string`：编辑器内容
- `onChange: (value: string) => void`：内容变化回调
- `onAiComplete?: () => void`：AI 补全回调
- `minHeight?: number`：最小高度
- `height?: number | string`：固定高度；`autoHeight=false` 时优先生效
- `maxHeight?: number`：自动高度模式下的最大高度
- `autoHeight?: boolean`：是否根据内容自动撑高，默认 `true`
- `placeholder?: string`：占位文本
- `disabled?: boolean`：是否禁用输入
- `className?: string`：根容器额外类名
- `style?: CSSProperties`：根容器内联样式
- `textareaProps?: MDEditorProps['textareaProps']`：透传到底层 `textarea` 的属性，可用于监听键盘、输入、光标等事件
- `onFocus?: FocusEventHandler<HTMLTextAreaElement>`：编辑区获得焦点回调
- `onBlur?: FocusEventHandler<HTMLTextAreaElement>`：编辑区失去焦点回调
- `mode?: 'edit' | 'preview'`：显示模式
- `showSplitToggle?: boolean`：是否显示双栏切换按钮
- `defaultSplitView?: boolean`：非受控模式下的初始双栏状态
- `splitView?: boolean`：受控双栏状态
- `onSplitChange?: (split: boolean) => void`：双栏状态变化回调
- `showAiButton?: boolean`：是否显示 AI 按钮；默认跟随 `onAiComplete` 是否存在
- `toolbarCommands?: ICommand[]`：覆盖默认工具栏命令
- `extraCommands?: ICommand[]`：追加右侧扩展命令
- `hideFullscreen?: boolean`：是否隐藏全屏按钮
- `previewOptions?: MDEditorProps['previewOptions']`：透传到底层 Markdown 预览配置
- `previewRender?: MDEditorProps['components']['preview']`：自定义预览区渲染函数
- `background?: string`：编辑区背景色
- `toolbarBackground?: string`：工具栏背景色
- `borderColor?: string`：边框色
- `textColor?: string`：正文文字色
- `mutedTextColor?: string`：次级文字色、工具栏按钮默认色
- `toolbarButtonHoverBackground?: string`：工具栏按钮 hover 背景色
- `toolbarButtonHoverColor?: string`：工具栏按钮 hover 文字色
- `primaryColor?: string`：主色，用于 AI 按钮、双栏激活态、引用强调线等
- `primaryBackground?: string`：主色浅底，用于 AI / 双栏按钮激活态背景
- `editorTextBackground?: string`：编辑区正文背景色
- `previewBackground?: string`：预览区背景色
- `fontSizeScale?: number`：字号缩放倍率，`1` 为默认字号
- `codeInlineBackground?: string`：行内代码背景色
- `codeBlockBackground?: string`：代码块背景色
- `blockquoteBorderColor?: string`：引用块左侧边框色
- `selectionBackground?: string`：文本选中背景色

受控双栏、颜色覆盖与自定义预览示例：

```tsx
import { useState } from 'react'
import { MarkdownEditor } from 'flowcloudai-ui'
import MDEditor from '@uiw/react-md-editor'

function Example() {
  const [value, setValue] = useState('')
  const [splitView, setSplitView] = useState(true)

  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      splitView={splitView}
      onSplitChange={setSplitView}
      showSplitToggle
      showAiButton
      autoHeight
      minHeight={220}
      maxHeight={420}
      previewRender={(source, state) => (
        <div style={{ padding: 12 }}>
          <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.75 }}>
            自定义预览头部
          </div>
          <MDEditor.Markdown
            source={source}
            data-color-mode="light"
          />
        </div>
      )}
      textareaProps={{
        onKeyUp: (event) => {
          const textarea = event.currentTarget
          const cursor = textarea.selectionStart ?? 0
          const beforeCursor = textarea.value.slice(0, cursor)

          if (beforeCursor.endsWith('[[')) {
            console.log('打开词条选择弹窗')
          }
        },
      }}
      background="#0f172a"
      toolbarBackground="#111827"
      borderColor="#334155"
      textColor="#e5eefb"
      mutedTextColor="#94a3b8"
      toolbarButtonHoverBackground="rgba(59, 130, 246, 0.18)"
      toolbarButtonHoverColor="#f8fafc"
      primaryColor="#38bdf8"
      primaryBackground="rgba(56, 189, 248, 0.16)"
      editorTextBackground="#0f172a"
      previewBackground="#0b1120"
      fontSizeScale={1.1}
      codeInlineBackground="rgba(148, 163, 184, 0.16)"
      codeBlockBackground="#020617"
      blockquoteBorderColor="#38bdf8"
      selectionBackground="rgba(56, 189, 248, 0.28)"
    />
  )
}
```

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

### `MessageBox`

用途：高性能 AI 聊天消息组件，支持虚拟列表、Web Worker Markdown 解析、流式内容渲染。

**核心特性：**

- **Web Worker Markdown 解析**：使用 micromark 在 Web Worker 中异步解析 Markdown，避免阻塞 UI
- **虚拟列表支持**：通过 `isVisible` 和 `onHeightChange` 与虚拟列表集成，视口外降级为骨架屏
- **流式渲染**：支持打字机光标和段落级增量解析
- **推理区域折叠**：ReasoningSection 支持展开/折叠，已解析段落缓存复用
- **工具调用卡片**：ToolCallCard 可展开显示参数和结果
- **React 声明式渲染**：严格禁止 `dangerouslySetInnerHTML`（除 Worker 解析后的安全 HTML）

**数据类型：**

```ts
type ContentBlock = 
  | { id: string; type: 'text'; content: string; isStreaming?: boolean }
  | { id: string; type: 'reasoning'; content: string; isStreaming?: boolean }
  | { id: string; type: 'tool_call'; index: number; name: string; arguments: string; isStreaming?: boolean }
  | { id: string; type: 'tool_result'; index: number; content: any; isError?: boolean };

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  blocks: ContentBlock[];
  status: 'streaming' | 'completed' | 'error';
  createdAt: number;
}
```

**参数：**

- `message: Message`：消息数据
- `isStreaming?: boolean`：是否正在接收流式事件（由上层缓冲池管理）
- `streamingCursor?: boolean`：是否显示闪烁光标
- `isVisible?: boolean`：是否在视口内（false 时降级为骨架屏）
- `onHeightChange?: (height: number) => void`：高度变化回调，用于虚拟列表更新
- `onReasoningToggle?: (expanded: boolean) => void`：推理区域展开/折叠回调
- `onCopy?: () => void`：复制回调
- `onToolCallExpand?: (index: number) => void`：工具调用卡片展开回调
- `className?: string`：额外 CSS 类名
- `style?: React.CSSProperties`：内联样式

**示例：**

```tsx
import { useState } from 'react'
import { MessageBox } from 'flowcloudai-ui'
import type { Message } from 'flowcloudai-ui'

function Example() {
  const [messages] = useState<Message[]>([
    {
      id: 'msg-1',
      type: 'assistant',
      blocks: [
        {
          id: 'block-1',
          type: 'reasoning',
          content: '用户询问的是关于 React 虚拟列表的概念。\n\n虚拟列表是一种性能优化技术...',
          isStreaming: false
        },
        {
          id: 'block-2',
          type: 'text',
          content: '虚拟列表（Virtual List）是一种性能优化技术...'
        }
      ],
      status: 'completed',
      createdAt: Date.now()
    }
  ])

  return (
    <div style={{ height: '600px' }}>
      {messages.map((message) => (
        <MessageBox
          key={message.id}
          message={message}
          isVisible={true}
          streamingCursor={message.status === 'streaming'}
          onHeightChange={(height) => {
            console.log(`Message height: ${height}px`)
          }}
          onReasoningToggle={(expanded) => {
            console.log('Reasoning:', expanded ? 'expanded' : 'collapsed')
          }}
        />
      ))}
    </div>
  )
}
```

**配合虚拟列表示例：**

```tsx
import { VirtualList } from 'flowcloudai-ui'
import { MessageBox } from 'flowcloudai-ui'

function ChatWithVirtualList({ messages }) {
  return (
    <VirtualList
      data={messages}
      height={600}
      itemHeight={100}
      renderItem={(message, index) => (
        <MessageBox
          key={message.id}
          message={message}
          isVisible={true} // 虚拟列表会控制此项
          onHeightChange={(height) => {
            // 更新虚拟列表的 itemHeight
          }}
        />
      )}
    />
  )
}
```

**流式输出示例：**

```tsx
import { useState, useEffect } from 'react'
import { MessageBox } from 'flowcloudai-ui'

function StreamingExample() {
  const [message, setMessage] = useState<Message>({
    id: 'streaming',
    type: 'assistant',
    blocks: [
      {
        id: 'text-block',
        type: 'text',
        content: '',
        isStreaming: true
      }
    ],
    status: 'streaming',
    createdAt: Date.now()
  })

  useEffect(() => {
    const fullContent = '这是流式输出的内容...'
    let index = 0
    
    const interval = setInterval(() => {
      if (index < fullContent.length) {
        index += 2
        setMessage(prev => ({
          ...prev,
          blocks: prev.blocks.map(block =>
            block.type === 'text'
              ? { ...block, content: fullContent.slice(0, index) }
              : block
          )
        }))
      } else {
        clearInterval(interval)
        setMessage(prev => ({
          ...prev,
          status: 'completed',
          blocks: prev.blocks.map(block =>
            block.type === 'text'
              ? { ...block, isStreaming: false }
              : block
          )
        }))
      }
    }, 50)

    return () => clearInterval(interval)
  }, [])

  return (
    <MessageBox
      message={message}
      streamingCursor={message.status === 'streaming'}
    />
  )
}
```

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

用途：横向时间线组件，展示带时间点的事件序列，支持拖拽滚动、缩放、事件选择和协同滚动。

参数：

- `events: TimelineEvent[]`：时间线事件数组
- `yearStart: number`：起始年份（如 -150 表示公元前150年）
- `yearEnd: number`：结束年份（如 650 表示公元650年）
- `syncId?: string`：同步组 ID，多个 Timeline 使用相同 syncId 可实现滚动同步
- `selectedEventId?: string | null`：受控选中的事件 ID
- `onEventSelect?: (eventId: string | null) => void`：事件选择回调

示例：

```tsx
import { useState } from 'react'
import { Timeline, type TimelineEvent } from 'flowcloudai-ui'

function Example() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const events: TimelineEvent[] = [
    { id: '1', title: '事件A', startTime: -100 },
    { id: '2', title: '事件B', startTime: 0, endTime: 100 },
  ]

  return (
    <Timeline
      events={events}
      yearStart={-150}
      yearEnd={650}
      syncId="my-timeline-group"
      selectedEventId={selectedId}
      onEventSelect={setSelectedId}
    />
  )
}
```

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

用途：侧边栏导航组件，支持左右停靠、折叠、底部固定项、锚定展开/折叠状态和样式变量覆盖。

示例：

```tsx
import { useState } from 'react'
import { SideBar, type SideBarItem } from 'flowcloudai-ui'

const items: SideBarItem[] = [
  { key: 'home', label: '首页' },
  { key: 'search', label: '搜索' },
]

function Example() {
  const [selectedKey, setSelectedKey] = useState('home')
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', height: 320 }}>
      <main style={{ flex: 1 }}>内容区域</main>
      <SideBar
        items={items}
        selectedKey={selectedKey}
        collapsed={collapsed}
        placement="right"
        onSelect={setSelectedKey}
        onCollapse={setCollapsed}
      />
    </div>
  )
}
```

锚定状态示例：

```tsx
<SideBar
  items={items}
  selectedKey={selectedKey}
  collapsed={false}
  anchorState="collapse"
  onSelect={setSelectedKey}
  onCollapse={() => {}}
/>
```

传入 `anchorState` 后，侧边栏会以该值作为最终状态，并隐藏展开/折叠按钮及其所在头部区域。

参数：

- `items: SideBarItem[]`：主菜单项数组
- `bottomItems?: SideBarItem[]`：底部固定菜单项数组
- `selectedKey: string`：当前选中 key
- `collapsed: boolean`：是否折叠
- `anchorState?: 'collapse' | 'normal'`：锚定侧边栏状态；设置后隐藏展开/折叠按钮，并以该值作为最终状态
- `width?: number`：展开宽度
- `collapsedWidth?: number`：折叠宽度
- `placement?: 'left' | 'right'`：停靠位置，默认 `'left'`
- `onSelect: (key: string) => void`：选中项变更回调
- `onCollapse: (collapsed: boolean) => void`：折叠状态变化回调

### `Tree`

用途：树形结构组件，支持搜索、选择、受控展开、重命名、新建、删除、拖拽移动，以及标题 / 动作 / 颜色 token 定制。

示例：

```tsx
import {
  Tree,
  flatToTree,
  type CategoryTreeNode,
  type TreeActionItem,
  type TreeNodeActionHelpers,
  type TreeNodeRenderState,
} from 'flowcloudai-ui'

const { roots } = flatToTree(rows)

function getNodeActions(
  node: CategoryTreeNode,
  state: TreeNodeRenderState,
  helpers: TreeNodeActionHelpers,
): TreeActionItem[] {
  const actions: TreeActionItem[] = [
    {
      key: 'inspect',
      label: '查看',
      icon: '👁',
      onClick: () => console.log('inspect', node.key),
      showInline: !state.isCompactActions,
    },
  ]

  if (state.canRename) {
    actions.push({
      key: 'rename',
      label: '重命名',
      icon: '✏',
      onClick: helpers.startEdit,
    })
  }

  if (state.canCreate || state.canDelete) {
    actions.push({ type: 'divider', key: 'ops' })
  }

  if (state.canCreate) {
    actions.push({
      key: 'create',
      label: '添加子项',
      icon: '+',
      onClick: helpers.requestCreate,
    })
  }

  if (state.canDelete) {
    actions.push({
      key: 'delete',
      label: '删除',
      icon: '🗑',
      danger: true,
      onClick: helpers.requestDelete,
    })
  }

  return actions
}

<Tree
  treeData={roots}
  selectedKey={selectedKey}
  expandedKeys={expandedKeys}
  onExpandedKeysChange={setExpandedKeys}
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  searchable
  renderTitle={(node) => <span>{node.title}</span>}
  getNodeActions={getNodeActions}
  canRename={(node) => node.raw.parent_id !== null}
  canDelete={(node) => node.raw.parent_id !== null}
  canCreate={(node) => node === null || node.raw.parent_id !== null}
  canDrag={(node) => node.raw.parent_id !== null}
  canDrop={(source, target, position) => !(source.raw.parent_id === null && position === 'into')}
  indentSize={20}
  actionDisplayMode="auto"
  actionCollapseThreshold={240}
  colorTokens={{
    primary: '#6ea8fe',
    bgHover: '#16213d',
    bgSelected: '#1d2d57',
  }}
  onSelect={setSelectedKey}
  onRename={handleRename}
  onCreate={handleCreate}
  onDelete={handleDelete}
  onMove={handleMove}
/>
```

参数：

- `treeData: CategoryTreeNode[]`：树数据
- `onRename?: (key: string, newName: string) => Promise<void>`：重命名回调
- `onCreate?: (parentKey: string | null) => Promise<string>`：创建节点回调，需返回新节点 key
- `onDelete?: (key: string, mode: 'lift' | 'cascade') => Promise<void>`：删除回调
- `onDeleteRequest?: (node: CategoryTreeNode) => void`：发起删除前回调
- `onMove?: (key: string, targetKey: string, position: 'before' | 'after' | 'into') => Promise<void>`：拖拽移动回调
- `onSelect?: (key: string) => void`：选中节点回调
- `selectedKey?: string`：受控选中 key
- `expandedKeys?: string[]`：受控展开节点 key 列表
- `defaultExpandedKeys?: string[]`：非受控初始展开节点 key 列表
- `onExpandedKeysChange?: (keys: string[]) => void`：展开状态变化回调
- `searchable?: boolean`：是否显示搜索框
- `searchValue?: string`：受控搜索值
- `defaultSearchValue?: string`：非受控初始搜索值
- `onSearchChange?: (value: string) => void`：搜索值变化回调
- `searchPlaceholder?: string`：搜索框占位文本
- `renderTitle?: (node: CategoryTreeNode, state: TreeNodeRenderState) => ReactNode`：自定义节点标题渲染
- `getNodeActions?: (node: CategoryTreeNode, state: TreeNodeRenderState, helpers: TreeNodeActionHelpers) => TreeActionItem[]`：自定义节点 hover / 菜单动作
- `canDrag?: (node: CategoryTreeNode) => boolean`：按节点控制是否允许拖拽
- `canDrop?: (source: CategoryTreeNode, target: CategoryTreeNode, position: 'before' | 'after' | 'into') => boolean`：按拖拽来源、目标和位置控制是否允许放下
- `canRename?: (node: CategoryTreeNode) => boolean`：按节点控制是否允许重命名
- `canDelete?: (node: CategoryTreeNode) => boolean`：按节点控制是否允许删除
- `canCreate?: (node: CategoryTreeNode | null) => boolean`：按节点控制是否允许添加子项；传 `null` 表示根级创建
- `indentSize?: number`：每层缩进宽度，默认 `20`
- `actionDisplayMode?: 'auto' | 'inline' | 'overflow'`：动作区显示模式；`auto` 会在窄宽度下自动折叠为 `⋯`
- `actionCollapseThreshold?: number`：`auto` 模式下折叠阈值，单位像素
- `colorTokens?: TreeColorTokens`：树组件局部颜色 token 覆盖
- `scrollHeight?: string`：滚动区域高度
- `collapseDuration?: number`：折叠/展开动画时长（秒），默认 `0.12`

相关类型：

- `TreeNodeRenderState`：节点当前层级、选中、展开、编辑、权限和动作折叠状态
- `TreeNodeActionHelpers`：节点动作辅助方法，包含 `select`、`toggleExpand`、`expandSubtree`、`collapseSubtree`、`startEdit`、`requestCreate`、`requestDelete`
- `TreeActionItem`：自定义动作项，支持 `divider`、危险态、禁用态，以及 `showInline` / `showInMenu` 两套展示控制
- `TreeColorTokens`：树组件颜色 token，包含 `text`、`textMuted`、`bgHover`、`bgSelected`、`border`、`borderFocus`、`primary`、`primarySubtle`、`danger`、`actionHoverBg`、`dropIndicator`

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

### `RelationGraph`

用途：关系图谱组件，基于 React Flow 渲染节点与边，负责节点渲染、边渲染、尺寸测量、布局触发、视口适配和双向边视觉优化。**组件内部不含任何布局算法**，宿主通过 `layoutFn` 注入一个异步函数，可以是 Tauri `invoke`、HTTP 接口或任意后端调用。

#### 快速示例

```tsx
import { useRef } from 'react'
import { Button, RelationGraph } from 'flowcloudai-ui'
import type { LayoutFunction } from 'flowcloudai-ui'
import type { RelationGraphRef } from 'flowcloudai-ui'

// 宿主注入的布局函数，例如调用 Tauri Rust 后端
const layoutFn: LayoutFunction = (req) => invoke('graph_layout', { request: req })

function Demo() {
  const graphRef = useRef<RelationGraphRef>(null)

  return (
    <>
      <Button
        onClick={() =>
          graphRef.current?.downloadImage({
            padding: 40,
            scale: 2,
            fileName: '人物关系图',
          })
        }
      >
        导出图片
      </Button>

      <RelationGraph
        ref={graphRef}
        nodes={[
          { id: 'a', label: 'Alice' },
          { id: 'b', label: 'Bob' },
        ]}
        edges={[
          { source: 'a', target: 'b', label: '认识', kind: 'two_way' },
          { source: 'b', target: 'a', kind: 'two_way' },
        ]}
        layoutFn={layoutFn}
        height={480}
        onLayoutStateChange={(s) => console.log(s)}
      />
    </>
  )
}
```

#### 参数

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `nodes` | `RelationNodeInput[]` | — | 节点数组，建议 `useMemo` 保持引用稳定，否则可能触发不必要的重排 |
| `edges` | `RelationEdgeInput[]` | — | 边数组，同上 |
| `layoutFn` | `LayoutFunction` | — | **必填**，宿主注入的异步布局函数 |
| `nodeOrigin` | `[number, number]` | `[0, 0]` | React Flow 节点坐标原点，`[0,0]` 表示坐标指向节点左上角 |
| `fitPadding` | `number` | `0.1` | `fitBounds` 视口边距，取值 0–1（0.1 = 10%） |
| `fitDuration` | `number` | `500` | `fitBounds` 动画时长（ms） |
| `onLayoutStateChange` | `(s: RelationLayoutState) => void` | — | 布局状态变化回调 |
| `height` | `string \| number` | `'100%'` | 容器高度，React Flow 要求此值为有限值 |
| `width` | `string \| number` | `'100%'` | 容器宽度 |
| `className` | `string` | — | 根元素额外 CSS 类 |
| `style` | `CSSProperties` | — | 根元素内联样式 |

#### 导出图片

组件支持通过 `ref` 导出 PNG/JPEG。导出时会自动：

1. 等待布局完成；若仍在布局中或布局失败，会直接抛错
2. 读取当前所有已测量节点，计算节点 AABB
3. 基于 `padding` 扩展导出区域
4. 按 `scale` 输出更高清的图片

```tsx
const result = await graphRef.current?.exportImage({
  format: 'png',
  padding: 32,
  scale: 3,
  backgroundColor: '#ffffff',
})

console.log(result?.bounds)
```

#### 注入真实布局函数

组件内部只调用传入的 `layoutFn`，不写任何 `invoke` 或 `fetch`：

```ts
// Tauri（Rust 后端）
const layoutFn: LayoutFunction = (req) =>
  invoke<LayoutResponse>('graph_layout', { request: req })

// HTTP 后端
const layoutFn: LayoutFunction = async (req) => {
  const res = await fetch('/api/layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`布局失败：${res.status}`)
  return res.json() as Promise<LayoutResponse>
}

// Mock / 测试
const layoutFn: LayoutFunction = async (req) => ({
  positions: Object.fromEntries(req.nodes.map((n, i) => [n.id, { x: i * 200, y: 0 }])),
  bounds: { x: 0, y: 0, width: req.nodes.length * 200, height: 100 },
})
```

#### 通信协议

字段名固定，不可修改。

**LayoutRequest（前端 → 后端）**

| 字段 | 类型 | 说明 |
|---|---|---|
| `nodeOrigin` | `[number, number]?` | 坐标原点，默认 `[0, 0]` |
| `nodes` | `LayoutNode[]` | 已测量尺寸的节点列表 |
| `edges` | `LayoutEdge[]` | 边列表 |

`LayoutNode`：`id: string`、`width: number`、`height: number`（来自 DOM 真实测量，**不得猜测**）

`LayoutEdge`：`id?: string`、`source: string`、`target: string`、`sourceHandle?: string`、`targetHandle?: string`、`kind?: 'one_way' | 'two_way'`

**LayoutResponse（后端 → 前端）**

| 字段 | 类型 | 说明 |
|---|---|---|
| `positions` | `Record<string, { x: number; y: number }>` | 按节点 ID 索引的坐标；缺失的节点保留当前坐标 |
| `bounds` | `{ x, y, width, height }?` | 图的外接矩形（左上角坐标系），用于首轮 `fitBounds` |
| `layoutHash` | `string?` | 可选不透明哈希，前端不解析 |

#### 布局触发时机

1. React Flow 挂载节点，所有节点初始坐标为 `{x:0, y:0}`
2. React Flow 测量每个节点的 DOM 尺寸，存入 `node.measured`
3. `useNodesInitialized()` 在**全部**节点测量完成后变为 `true`
4. Hook 计算图签名，与上次已应用的签名比较
5. 签名不同则构造 `LayoutRequest` 并调用 `layoutFn`
6. 成功后通过 `setNodes` 应用坐标，仅首轮执行一次 `fitBounds`

**空图快速路径**：节点数组为空时，直接标记布局完成，不调用 `layoutFn`。

布局状态流程：

1. 首轮布局前：`layoutReady = false`
2. 布局进行中：`layoutLoading = true`
3. 布局成功：`layoutReady = true`，执行一次 `fitBounds`，后续不再自动 fit
4. 布局失败：`layoutError` 被设置，图面板显示错误提示

#### 图签名策略

签名为以下内容拼接的确定性字符串（与顺序无关，排序后合并）：

- **节点**：`id:width x height`
- **边**：`source -> target [kind] (sourceHandle, targetHandle)`

触发重排的情况：新增/删除节点、节点尺寸变化、新增/删除边。  
**不触发**重排的情况：拖拽节点（只改坐标，不改签名）。

#### 异步安全策略

每次发起布局时，把当前签名写入 `pendingSigRef`。当响应返回时，与 `pendingSigRef.current` 对比：若不一致（已被更新的请求覆盖），则静默丢弃——不调用 `setNodes`，不调用 `fitBounds`。只有最新一次请求的响应会被应用。

#### 双向边渲染

若输入边集中同时存在 `A→B` 和 `B→A`，两条边会被标记为 `bidirectional: true`。边渲染器（`BidirectionalEdge`）使用浮动边算法：从节点中心向对端中心作射线，取射线与节点矩形 border 的交叉点作为连接锚，配合垂直偏移使两条线分居连接直线两侧，保持可读性。此优化纯属视觉层面，不影响边语义，也不影响发往后端的协议数据。

#### CSS 自定义属性

在 `.fc-rg` 上覆盖以下变量可定制主题：

| 变量 | 浅色默认值 | 说明 |
|---|---|---|
| `--fc-rg-node-bg` | `var(--fc-color-bg-elevated)` | 节点背景色 |
| `--fc-rg-node-border` | `var(--fc-color-border)` | 节点边框色 |
| `--fc-rg-node-border-sel` | `var(--fc-color-primary)` | 选中节点边框色 |
| `--fc-rg-node-text` | `var(--fc-color-text)` | 节点标签颜色 |
| `--fc-rg-edge-color` | `var(--fc-gray-400)` | 边线颜色 |
| `--fc-rg-edge-selected-color` | `var(--fc-color-primary)` | 选中边线颜色 |

> **注意**：`RelationGraph` 内部引用了 `@xyflow/react/dist/style.css`。若你的打包工具不自动去重，与项目中其他 React Flow 用法同时存在时该文件可能被引入两次，但不影响功能。

## 地图编辑组件

### `MapShapeEditor`

用途：地图编辑 MVP 组件。左侧使用 SVG 作为编辑层，支持闭合图形描点、顶点拖拽、图形整体拖拽、双击边插点和关键地点编辑；底部 deck
展示层只消费后端返回结果，用于提交后的回显。

#### 当前迭代定位

这是一个**迭代中的地图编辑组件**，当前目标不是一次性覆盖完整 GIS / CAD 能力，而是先把“前端可编辑草稿 + 后端可消费结构 +
deck 展示回显”这条链路打通。

当前版本已经稳定表达的职责有：

- 前端维护一份可编辑草稿：`shapes + keyLocations`
- 用户在 SVG 层完成基础编辑，再提交给后端
- 后端返回一份**展示态场景**，供 deck 预览层渲染
- 前端不自行推导 deck 展示数据，展示层以**后端返回结果为准**

当前版本暂不承诺的能力：

- 不做地图底图投影、地理坐标转换
- 不做布尔运算、自动吸附、撤销重做、版本历史
- 不做复杂拓扑修复
- 不约束后端持久化方案，组件只关心请求和响应结构

#### 快速示例

```tsx
import {
  MapShapeEditor,
  createMockMapShapeEditorApi,
} from 'flowcloudai-ui'
import type {
  MapPreviewScene,
  MapShapeEditorDraft,
} from 'flowcloudai-ui'

const api = createMockMapShapeEditorApi()

const draft: MapShapeEditorDraft = {
  shapes: [
    {
      id: 'shape-1',
      name: '园区 A',
      fill: '#d8ecff',
      stroke: '#185fa5',
      vertices: [
        { id: 'v-1', x: 180, y: 120 },
        { id: 'v-2', x: 420, y: 140 },
        { id: 'v-3', x: 460, y: 340 },
        { id: 'v-4', x: 220, y: 360 },
      ],
    },
  ],
  keyLocations: [
    {
      id: 'loc-1',
      name: '主入口',
      type: '入口',
      x: 260,
      y: 180,
      shapeId: 'shape-1',
    },
  ],
}

const preview: MapPreviewScene | null = null

export function Demo() {
  return (
    <MapShapeEditor
      initialDraft={draft}
      initialPreview={preview}
      api={api}
      width="100%"
      height="auto"
      canvas={{ width: 1000, height: 640 }}
    />
  )
}
```

#### 参数

| 参数               | 类型                        | 默认值                            | 说明                                           |
|------------------|---------------------------|--------------------------------|----------------------------------------------|
| `initialDraft`   | `MapShapeEditorDraft`     | —                              | 编辑层初始草稿，包含图形和关键地点                            |
| `initialPreview` | `MapPreviewScene \| null` | `null`                         | deck 展示层初始回显数据                               |
| `api`            | `MapShapeEditorApi`       | 内置 mock API                    | 提交接口适配层，默认使用 `createMockMapShapeEditorApi()` |
| `canvas`         | `MapEditorCanvas`         | `{ width: 1000, height: 640 }` | SVG 编辑坐标系尺寸                                  |
| `width`          | `string \| number`        | `'100%'`                       | 根容器宽度                                        |
| `height`         | `string \| number`        | `'auto'`                       | 根容器高度                                        |
| `className`      | `string`                  | —                              | 根元素额外类名                                      |
| `style`          | `CSSProperties`           | —                              | 根元素内联样式                                      |

#### 编辑交互约定

这部分建议后端也了解，因为它决定了前端会在什么时机提交什么数据：

- 初始可以处于“未选中任何图形”状态
- 双击图形才进入图形编辑态
- 点击画布空白处会取消当前图形选中
- 当图形未选中时，可以直接在该图形上拖拽平移地图视图
- 只有图形已选中时，才允许整体拖拽该图形
- 关键地点始终是独立对象，但通过 `shapeId` 关联到某个图形
- 图形整体拖动时，已关联的关键地点会跟随一起移动

#### 前端预校验

组件内置最小可用校验，提交前会在界面中直接给出中文提示，并阻止非法草稿进入后端：

- 图形至少需要 3 个点
- 图形不允许重复点或过近点
- 图形不允许自交
- 关键地点必须填写名称、类型，并关联一个存在的图形
- 关键地点必须位于关联图形内部
- 绘制中的未完成图形不会允许提交

校验逻辑已拆到 `ui/src/components/MapShapeEditor/validation.ts`，几何计算入口在
`ui/src/components/MapShapeEditor/geometry.ts`，后续如果要接布尔运算或更复杂的几何处理，可以继续沿这个入口扩展。

#### 前后端通信模型

`MapShapeEditor` 当前采用两套数据模型，后端需要明确区分：

**1. 编辑草稿（前端提交）**

这是用户正在编辑的原始结构，强调“好改、好回填、可保留业务 ID”。

```ts
interface MapShapeSaveRequest {
  canvas: { width: number; height: number }
  shapes: Array<{
    id: string
    name: string
    vertices: Array<{
      id: string
      x: number
      y: number
    }>
    fill?: string
    stroke?: string
  }>
  keyLocations: Array<{
    id: string
    name: string
    type: string
    x: number
    y: number
    shapeId?: string | null
  }>
}
```

字段含义和约束：

- `canvas.width / height`：前端编辑坐标系尺寸，不是经纬度范围
- `shape.id`、`vertex.id`、`keyLocation.id`：由前端生成的稳定标识，后端可直接复用，也可以建立自己的映射
- `vertices`：按顺序组成闭合多边形，前端不额外传首尾重复点
- `fill`、`stroke`：当前是可选的 16 进制颜色字符串，属于表现层辅助信息
- `keyLocations.shapeId`：表示关键地点关联的图形；允许为 `null`，但当前前端校验默认要求它关联到一个存在图形

**2. 展示场景（后端返回）**

这是给 deck 展示层消费的结构，强调“渲染友好”，不要求保留编辑期的全部细节。

```ts
interface MapShapeSaveResponse {
  scene: {
    canvas: { width: number; height: number }
    shapes: Array<{
      id: string
      name: string
      polygon: [number, number][]
      fillColor: [number, number, number, number]
      lineColor: [number, number, number, number]
    }>
    keyLocations: Array<{
      id: string
      name: string
      type: string
      position: [number, number]
      shapeId?: string | null
      color: [number, number, number, number]
    }>
  }
  savedAt: string
  message?: string
}
```

字段含义和约束：

- `polygon`：deck 使用的二维点数组，顺序应与展示轮廓一致
- `fillColor`、`lineColor`、`color`：RGBA 数组，范围按 deck 约定为 `0-255`
- `savedAt`：必填字符串，前端当前不解析格式，建议后端返回 ISO 时间串
- `message`：可选，直接显示在界面“后端提交”状态区域

#### 后端接入建议

如果由另一个 Codex 或后端同学负责接口，建议按下面的思路理解：

- 前端提交的是“编辑语义”数据，不是最终渲染数据
- 后端返回的是“展示语义”数据，可以做颜色归一、结构裁剪、格式转换
- 只要响应里 `scene` 和 `savedAt` 合法，前端就会把它视为最新展示结果
- 如果后端要加入业务校验，建议保留前端当前字段名，不要重命名
- 如果后端要补充业务主键、版本号、审计信息，优先放在外围接口层，不要破坏当前 `scene` 结构
- 若未来要接真实地图坐标，可把当前 `canvas` 坐标系视作一个中间编辑坐标系，再由后端负责投影换算

#### 当前推荐的后端处理步骤

1. 接收 `MapShapeSaveRequest`
2. 按业务需要做二次校验，例如名称唯一性、图形归属权限、区域合法性
3. 将 `vertices` 转成后端内部几何结构
4. 持久化图形和关键地点
5. 组装 `MapPreviewScene` 返回给前端，而不是把数据库实体原样透出

#### 已知扩展方向

这部分不是当前版本必须实现，但后端设计时最好预留：

- 真实底图坐标和编辑坐标系的换算
- 图形布尔运算和裁剪
- 多图层、分组、隐藏/锁定
- 历史版本、草稿与发布态分离
- 更细的后端校验码，而不仅是字符串消息

#### 提交与失败提示

- 前端预校验失败：界面显示“前端预校验”错误，不发请求
- 后端请求失败：界面显示“后端提交”错误，区分网络失败、超时和返回结构异常
- deck 展示层只更新最近一次成功提交后的返回结果，不直接读取当前编辑草稿

#### 相关导出

- `createMockMapShapeEditorApi()`：创建本地 mock API
- `submitMapShapeScene(api, request, options?)`：统一处理超时、结构校验和错误归一化
- `validateMapEditorDraft(draft, options?)`：执行前端校验

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
- 图谱组件：`ui/src/components/RelationGraph/`
- 时间线：`ui/src/components/Time/`
