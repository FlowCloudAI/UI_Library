# flowcloudai-ui 组件 API 与使用方法

本文档记录 `lib_ui` 中 `flowcloudai-ui` 当前公开组件、工具函数、公开类型、组件自定义属性和基础用法。信息依据 `lib_ui/ui/src/entries/*` 与 `lib_ui/ui/dist/*.d.ts` 整理。

## 导入约定

推荐按子路径导入，便于按需使用：

```tsx
import {Button} from 'flowcloudai-ui/Button'
import {Tree, type TreeProps} from 'flowcloudai-ui/Tree'
```

也可以从主入口导入：

```tsx
import {Button, Tree, type TreeProps} from 'flowcloudai-ui'
```

公共类型：

- `FcBaseProps`: `{ className?: string; style?: React.CSSProperties }`
- `FcSize`: `xs`、`sm`、`md`、`lg`、`xl`
- `FcRadius`: `none`、`sm`、`md`、`lg`、`xl`、`full`
- `FcStatus`: `default`、`success`、`warning`、`error`
- `FcChangeMeta<TEvent>`: `{ source?: 'click' | 'keyboard' | 'input' | 'drag' | 'programmatic'; event?: TEvent }`
- `FcChangeHandler<TValue, TMeta>`: `(nextValue: TValue, meta?: TMeta) => void`

兼容规则：

- 新推荐回调优先使用 `onValueChange`、`onCheckedChange`、`onSelectedKeyChange`、`onExpandedKeysChange`。
- 旧回调如 `onChange`、`onSelect`、`onEventSelect` 仍保留兼容，类型中已标记废弃。
- 深度样式覆盖统一使用 `tokens`。旧颜色属性、`colorTokens` 仍保留兼容。
- 继承 `React.*HTMLAttributes` 的组件还支持对应原生 DOM 属性，例如 `id`、`className`、`style`、`aria-*`、`data-*`。

## AlertProvider

导入：

```tsx
import {AlertProvider, useAlert, type AlertProviderProps} from 'flowcloudai-ui/Alert'
```

基础用法：

```tsx
function Root() {
    return (
        <AlertProvider offset="1rem">
            <App />
        </AlertProvider>
    )
}

function SaveButton() {
    const {showAlert} = useAlert()

    return (
        <button onClick={() => showAlert('保存成功', 'success', 'toast', 2000)}>
            保存
        </button>
    )
}
```

`useAlert()` 返回：

- `showAlert(msg, type, mode?, duration?)`: 显示提示并返回 `Promise<string>`。

`AlertProviderProps`：

- `children: ReactNode`: 子节点。
- `tokens?: Partial<AlertProviderTokens>`: 样式 token。
- `background?: string`: 废弃，推荐 `tokens.background`。
- `borderColor?: string`: 废弃，推荐 `tokens.borderColor`。
- `offset?: string`: `nonInvasive` 模式距视口顶部距离，默认 `1rem`。
- 继承 `HTMLAttributes<HTMLDivElement>`。

`AlertProviderTokens`：

- `background?: string`
- `borderColor?: string`

关联类型：

- `AlertType`: `success`、`error`、`warning`、`info`
- `AlertMode`: `alert`、`confirm`、`toast`、`nonInvasive`
- `AlertProps`: 内部提示数据结构，包含 `id`、`msg`、`type`、`mode`、`visible`、`duration`、`choice`。

## Button、ButtonGroup、ButtonToolbar

导入：

```tsx
import {Button, ButtonGroup, ButtonToolbar, type ButtonProps} from 'flowcloudai-ui/Button'
```

基础用法：

```tsx
<Button variant="primary" size="md" iconLeft={<SaveIcon />} onClick={save}>
    保存
</Button>

<ButtonGroup>
    <Button variant="outline">取消</Button>
    <Button>确认</Button>
</ButtonGroup>

<ButtonToolbar align="right">
    <Button variant="ghost">重置</Button>
    <Button variant="primary">提交</Button>
</ButtonToolbar>
```

`ButtonProps`：

- `variant?: ButtonVariant`: `primary`、`secondary`、`outline`、`ghost`、`danger`、`success`、`warning`。
- `size?: ButtonSize`: 同 `FcSize`。
- `radius?: ButtonRadius`: 同 `FcRadius`。
- `disabled?: boolean`: 禁用。
- `loading?: boolean`: 加载状态。
- `block?: boolean`: 宽度 100%。
- `circle?: boolean`: 圆形按钮。
- `iconOnly?: boolean`: 仅图标模式。
- `iconLeft?: React.ReactNode`: 左侧图标。
- `iconRight?: React.ReactNode`: 右侧图标。
- `tokens?: Partial<ButtonTokens>`: 样式 token。
- `background?: string`: 废弃，推荐 `tokens.background`。
- `hoverBackground?: string`: 废弃，推荐 `tokens.hoverBackground`。
- `activeBackground?: string`: 废弃，推荐 `tokens.activeBackground`。
- `color?: string`: 废弃，推荐 `tokens.color`。
- `hoverColor?: string`: 废弃，推荐 `tokens.hoverColor`。
- `activeColor?: string`: 废弃，推荐 `tokens.activeColor`。
- `borderColor?: string`: 废弃，推荐 `tokens.borderColor`。
- `hoverBorderColor?: string`: 废弃，推荐 `tokens.hoverBorderColor`。
- 继承 `React.ButtonHTMLAttributes<HTMLButtonElement>`。

`ButtonTokens`：

- `background?: string`
- `hoverBackground?: string`
- `activeBackground?: string`
- `color?: string`
- `hoverColor?: string`
- `activeColor?: string`
- `borderColor?: string`
- `hoverBorderColor?: string`

`ButtonGroupProps`：

- `children: React.ReactNode`
- 继承 `React.HTMLAttributes<HTMLDivElement>`。

`ButtonToolbarProps`：

- `children: React.ReactNode`
- `align?: ButtonToolbarAlign`: `left`、`center`、`right`、`between`。
- 继承 `React.HTMLAttributes<HTMLDivElement>`。

## Card

导入：

```tsx
import {Card, type CardProps} from 'flowcloudai-ui/Card'
```

基础用法：

```tsx
<Card
    title="世界观项目"
    description="包含实体、关系和时间线"
    image="/cover.png"
    variant="shadow"
    hoverable
    actions={<Button size="sm">打开</Button>}
/>
```

`CardProps`：

- `image?: string`: 图片地址。
- `imageSlot?: ReactNode`: 自定义图片区域。
- `imageHeight?: number | string`: 图片高度。
- `title?: ReactNode`: 标题。
- `description?: ReactNode`: 描述。
- `actions?: ReactNode`: 操作区。
- `extraInfo?: ReactNode`: 扩展信息。
- `variant?: CardVariant`: `default`、`bordered`、`shadow`、`outline`。
- `hoverable?: boolean`: 是否启用悬停效果。
- `disabled?: boolean`: 禁用。
- `contentAreaRatio?: number`: 内容区域比例。
- `hoverContentAreaRatio?: number`: 悬停时内容区域比例。
- `expandContentOnHover?: boolean`: 悬停时展开内容区。
- `overlayStartOpacity?: number`: 覆盖层起始透明度。
- `overlayEndOpacity?: number`: 覆盖层结束透明度。
- `tag?: ReactNode`: 标签内容。
- `className?: string`
- `style?: React.CSSProperties`
- `onClick?: React.MouseEventHandler<HTMLDivElement>`
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick' | 'title'>`。

## CheckButton

导入：

```tsx
import {CheckButton, type CheckButtonProps} from 'flowcloudai-ui/CheckButton'
```

受控用法：

```tsx
const [checked, setChecked] = useState(false)

<CheckButton
    checked={checked}
    onCheckedChange={setChecked}
    labelLeft="关闭"
    labelRight="开启"
/>
```

非受控用法：

```tsx
<CheckButton defaultChecked labelRight="自动保存" />
```

`CheckButtonBaseProps`：

- `onCheckedChange?: CheckButtonChangeHandler`: 推荐变更回调。
- `onChange?: (checked: boolean) => void`: 废弃兼容回调。
- `disabled?: boolean`: 禁用。
- `size?: CheckButtonSize`: `sm`、`md`、`lg`。
- `radius?: CheckButtonRadius`: 同 `FcRadius`。
- `labelLeft?: string`: 左侧文本。
- `labelRight?: string`: 右侧文本。
- `tokens?: Partial<CheckButtonTokens>`: 样式 token。
- `trackBackground?: string`: 废弃，推荐 `tokens.trackBackground`。
- `checkedTrackBackground?: string`: 废弃，推荐 `tokens.checkedTrackBackground`。
- `thumbBackground?: string`: 废弃，推荐 `tokens.thumbBackground`。
- `thumbDotColor?: string`: 废弃，推荐 `tokens.thumbDotColor`。
- `labelColor?: string`: 废弃，推荐 `tokens.labelColor`。
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>`。

`ControlledCheckButtonProps`：

- `checked: boolean`
- `defaultChecked?: never`

`UncontrolledCheckButtonProps`：

- `checked?: never`
- `defaultChecked?: boolean`

`CheckButtonTokens`：

- `trackBackground?: string`
- `checkedTrackBackground?: string`
- `thumbBackground?: string`
- `thumbDotColor?: string`
- `labelColor?: string`

## ContextMenuProvider

导入：

```tsx
import {ContextMenuProvider, useContextMenu, type ContextMenuItem} from 'flowcloudai-ui/ContextMenu'
```

基础用法：

```tsx
function Root() {
    return (
        <ContextMenuProvider>
            <App />
        </ContextMenuProvider>
    )
}

function Row() {
    const {showContextMenu} = useContextMenu()
    const items: ContextMenuItem[] = [
        {label: '重命名', onClick: rename},
        {type: 'divider'},
        {label: '删除', danger: true, onClick: remove},
    ]

    return <div onContextMenu={event => showContextMenu(event.nativeEvent, items)}>节点</div>
}
```

`useContextMenu()` 返回：

- `showContextMenu(e, items)`: 在鼠标坐标处显示菜单。

`ContextMenuProviderProps`：

- `children: ReactNode`
- `tokens?: Partial<ContextMenuProviderTokens>`
- `background?: string`: 废弃，推荐 `tokens.background`。
- `borderColor?: string`: 废弃，推荐 `tokens.borderColor`。
- `hoverBackground?: string`: 废弃，推荐 `tokens.hoverBackground`。
- 继承 `HTMLAttributes<HTMLUListElement>`。

`ContextMenuProviderTokens`：

- `background?: string`
- `borderColor?: string`
- `hoverBackground?: string`

`ContextMenuAction`：

- `label: string`
- `icon?: ReactNode`
- `onClick: () => void`
- `danger?: boolean`
- `disabled?: boolean`

`ContextMenuDivider`：

- `type: 'divider'`

`ContextMenuTriggerEvent`：

- 需要包含 `clientX`、`clientY`、`preventDefault`、`stopPropagation`。

## ConversationTreeView

导入：

```tsx
import {ConversationTreeView, type ConversationNode} from 'flowcloudai-ui/ConversationTreeView'
```

基础用法：

```tsx
<ConversationTreeView
    nodes={nodes}
    selectedNodeId={selectedNodeId}
    onSelectedNodeChange={setSelectedNodeId}
/>
```

`ConversationTreeViewProps`：

- `nodes: ConversationNode[]`: 对话节点。
- `selectedNodeId?: number | null`: 当前选中节点。
- `head?: number | null`: 废弃兼容，推荐 `selectedNodeId`。
- `onSelectedNodeChange?: ConversationTreeSelectedNodeChangeHandler`: 推荐选择回调。
- `onCheckout?: (nodeId: number) => void`: 废弃兼容。
- 继承 `React.HTMLAttributes<HTMLDivElement>`。

`ConversationNodeMessage`：

- `role: string`
- `content?: string | null`
- `reasoning_content?: string | null`
- `tool_call_id?: string | null`
- `tool_calls?: unknown[] | null`

`ConversationNode`：

- `id: number`
- `message: ConversationNodeMessage`
- `parent: number | null`
- `turn_id: number`
- `timestamp: string`

## DeleteDialog

导入：

```tsx
import {DeleteDialog, type DeleteMode} from 'flowcloudai-ui/DeleteDialog'
```

基础用法：

```tsx
<DeleteDialog
    node={deleteTarget}
    onClose={() => setDeleteTarget(null)}
    onDelete={async (key, mode) => {
        await deleteNode(key, mode)
        setDeleteTarget(null)
    }}
/>
```

`DeleteDialogProps`：

- `node: CategoryTreeNode | null`: 待删除节点。
- `onClose: DeleteDialogCloseHandler`: 关闭回调。
- `onDelete: DeleteDialogDeleteHandler`: 删除确认回调。
- 继承 `React.HTMLAttributes<HTMLDivElement>`。

关联类型：

- `DeleteMode`: `lift` 或 `cascade`。
- `DeleteDialogCloseHandler`: `(meta?: DeleteDialogCloseMeta) => void`
- `DeleteDialogDeleteHandler`: `(key: string, mode: DeleteMode, meta?: DeleteDialogDeleteMeta) => Promise<void>`

## Input

导入：

```tsx
import {Input, type InputProps} from 'flowcloudai-ui/Input'
```

基础用法：

```tsx
const [name, setName] = useState('')

<Input
    value={name}
    onValueChange={setName}
    placeholder="请输入名称"
    allowClear
    status={name ? 'success' : 'default'}
/>
```

`InputProps`：

- `size?: InputSize`: 同 `FcSize`。
- `status?: InputStatus`: 同 `FcStatus`。
- `radius?: InputRadius`: 同 `FcRadius`。
- `prefix?: React.ReactNode`: 前缀内容。
- `suffix?: React.ReactNode`: 后缀内容。
- `allowClear?: boolean`: 是否显示清除按钮。
- `passwordToggle?: boolean`: 密码可见切换。
- `addonBefore?: React.ReactNode`: 输入框前置区域。
- `addonAfter?: React.ReactNode`: 输入框后置区域。
- `helperText?: string`: 辅助说明。
- `onValueChange?: InputValueChangeHandler`: 推荐值变更回调。
- `onChange?: (value: string) => void`: 废弃兼容回调。
- `showNumberStepper?: boolean`: 数字步进器。
- `onClear?: () => void`: 清除回调。
- 继承 `Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'onChange'>`。

## lazyLoad

导入：

```tsx
import {lazyLoad, type LazyLoadOptions} from 'flowcloudai-ui/LazyLoad'
```

基础用法：

```tsx
const SettingsPanel = lazyLoad(() => import('./SettingsPanel'), {
    fallback: <div>加载中...</div>,
    timeout: 10000,
})
```

`LazyLoadOptions`：

- `fallback?: ReactNode`: 加载中占位内容。
- `timeout?: number`: 超时时间，单位毫秒。

## ListGroup、ListGroupItem

导入：

```tsx
import {ListGroup, ListGroupItem} from 'flowcloudai-ui/ListGroup'
```

基础用法：

```tsx
<ListGroup bordered>
    <ListGroupItem active>总览</ListGroupItem>
    <ListGroupItem disabled>归档</ListGroupItem>
</ListGroup>
```

`ListGroupProps`：

- `bordered?: boolean`: 显示边框。
- `flush?: boolean`: 贴边模式。
- 继承 `React.HTMLAttributes<HTMLUListElement>`。

`ListGroupItemProps`：

- `active?: boolean`: 激活态。
- `disabled?: boolean`: 禁用。
- `onClick?: (event: React.MouseEvent<HTMLLIElement>) => void`
- 继承 `React.LiHTMLAttributes<HTMLLIElement>`。

## MarkdownEditor

导入：

```tsx
import {MarkdownEditor, type MarkdownEditorRef} from 'flowcloudai-ui/MarkdownEditor'
```

基础用法：

```tsx
const [value, setValue] = useState('# 标题')

<MarkdownEditor
    value={value}
    onValueChange={setValue}
    height={360}
    showSplitToggle
    showAiButton
    onAiComplete={completeWithAi}
/>
```

`MarkdownEditorProps`：

- `value: string`: 受控内容。
- `onValueChange?: MarkdownEditorValueChangeHandler`: 推荐内容变更回调。
- `onChange?: (v: string) => void`: 废弃兼容回调。
- `onAiComplete?: () => void`: AI 补全回调。
- `minHeight?: number`
- `height?: number | string`
- `maxHeight?: number`
- `autoHeight?: boolean`
- `placeholder?: string`
- `disabled?: boolean`
- `textareaProps?: MDEditorProps['textareaProps']`
- `onFocus?: ...`: 文本域 focus 回调。
- `onBlur?: ...`: 文本域 blur 回调。
- `mode?: 'edit' | 'preview'`
- `onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>`
- `showSplitToggle?: boolean`: 显示分屏切换。
- `defaultSplitView?: boolean`: 默认分屏状态。
- `splitView?: boolean`: 受控分屏状态。
- `onSplitChange?: (split: boolean) => void`
- `showAiButton?: boolean`
- `toolbarCommands?: ICommand[]`
- `extraCommands?: ICommand[]`
- `hideFullscreen?: boolean`
- `previewOptions?: MarkdownPreviewOptions`
- `previewRender?: MarkdownPreviewRenderer`
- `tokens?: Partial<MarkdownEditorTokens>`
- `background?: string`: 废弃，推荐 `tokens.background`。
- `toolbarBackground?: string`: 废弃。
- `borderColor?: string`: 废弃。
- `textColor?: string`: 废弃。
- `mutedTextColor?: string`: 废弃。
- `toolbarButtonHoverBackground?: string`: 废弃。
- `toolbarButtonHoverColor?: string`: 废弃。
- `primaryColor?: string`: 废弃。
- `primaryBackground?: string`: 废弃。
- `editorTextBackground?: string`: 废弃。
- `previewBackground?: string`: 废弃。
- `fontSizeScale?: number`: 废弃，推荐 `tokens.fontSizeScale`。
- `codeInlineBackground?: string`: 废弃。
- `codeBlockBackground?: string`: 废弃。
- `blockquoteBorderColor?: string`: 废弃。
- `selectionBackground?: string`: 废弃。
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onFocus' | 'onBlur' | 'onKeyDown'>`。

`MarkdownEditorTokens`：

- `background?: string`
- `toolbarBackground?: string`
- `borderColor?: string`
- `textColor?: string`
- `mutedTextColor?: string`
- `toolbarButtonHoverBackground?: string`
- `toolbarButtonHoverColor?: string`
- `primaryColor?: string`
- `primaryBackground?: string`
- `editorTextBackground?: string`
- `previewBackground?: string`
- `fontSizeScale?: number`
- `codeInlineBackground?: string`
- `codeBlockBackground?: string`
- `blockquoteBorderColor?: string`
- `selectionBackground?: string`

`MarkdownEditorRef`：

- 公开引用类型，用于组件 ref。具体方法以底层编辑器适配实现为准。

## MessageBox

导入：

```tsx
import {MessageBox, type MessageBoxBlock} from 'flowcloudai-ui/MessageBox'
```

基础用法：

```tsx
<MessageBox role="assistant" markdown content={answer} onCopy={copyAnswer} />

<MessageBox
    role="assistant"
    blocks={[
        {type: 'reasoning', content: '正在分析...', streaming: true},
        {type: 'content', content: result, markdown: true},
    ]}
/>
```

`MessageBoxProps`：

- `role: 'user' | 'assistant' | 'system'`
- `content?: string`
- `streaming?: boolean`
- `markdown?: boolean`
- `children?: React.ReactNode`
- `maxWidth?: string`
- `lineHeight?: number | string`
- `reasoning?: string`
- `reasoningSeconds?: number`
- `reasoningStreaming?: boolean`
- `toolCalls?: ToolCallInfo[]`
- `toolCallDetail?: 'simple' | 'verbose'`
- `blocks?: MessageBoxBlock[]`
- `contextDisplay?: MessageBoxContextDisplay`: `full` 或 `compact`。
- `rolePlaying?: boolean`
- `nodeId?: number`
- `branchIndex?: number`
- `branchTotal?: number`
- `onSwitchBranch?: (direction: 'prev' | 'next') => void`
- `onCopy?: () => void`
- `onEdit?: () => void`
- `onRegenerate?: () => void`
- `onPlay?: () => void`
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onCopy' | 'role'>`。

`ToolCallInfo`：

- `index: number`
- `name: string`
- `args?: string`
- `result?: string`
- `isError?: boolean`

`MessageBoxBlock`：

- `{ id?: string; type: 'reasoning'; content: string; seconds?: number; streaming?: boolean }`
- `{ id?: string; type: 'tool'; tool: ToolCallInfo; detail?: 'simple' | 'verbose' }`
- `{ id?: string; type: 'tool_use'; tools: ToolCallInfo[]; detail?: 'simple' | 'verbose' }`
- `{ id?: string; type: 'content'; content: string; markdown?: boolean; streaming?: boolean }`
- `{ id?: string; type: 'children'; children: React.ReactNode }`

## OrphanDialog

导入：

```tsx
import {OrphanDialog, type OrphanResolutionMap} from 'flowcloudai-ui/OrphanDialog'
```

基础用法：

```tsx
<OrphanDialog
    orphans={orphans}
    onClose={() => setOrphans([])}
    onResolve={(resolutions) => resolveOrphans(resolutions)}
/>
```

`OrphanDialogProps`：

- `orphans: CategoryTreeNode[]`: 待处理孤儿节点。
- `onResolve: OrphanDialogResolveHandler`: 处理结果回调。
- `onClose: OrphanDialogCloseHandler`: 关闭回调。
- 继承 `React.HTMLAttributes<HTMLDivElement>`。

关联类型：

- `OrphanResolution`: `lift` 或 `remove`。
- `OrphanResolutionMap`: key 到处理策略的映射。
- `OrphanDialogResolveHandler`: `(resolutions: OrphanResolutionMap, meta?: OrphanDialogResolveMeta) => void`
- `OrphanDialogCloseHandler`: `(meta?: OrphanDialogCloseMeta) => void`

## RollingBox

导入：

```tsx
import {RollingBox, type RollingBoxProps} from 'flowcloudai-ui/RollingBox'
```

基础用法：

```tsx
<RollingBox axis="both" showThumb="auto" thumbSize="thin">
    <LargePanel />
</RollingBox>
```

`RollingBoxProps`：

- `showThumb?: ShowThumb`: `auto`、`hide`、`show`。
- `horizontal?: boolean`: 旧方向开关。
- `vertical?: boolean`: 旧方向开关。
- `axis?: RollingAxis`: `x`、`y`、`both`、`none`。
- `thumbSize?: ThumbSize`: `thin`、`normal`、`thick`。
- `showTrack?: boolean`: 是否显示轨道。
- `children: React.ReactNode`
- `interceptWheel?: (event: WheelEvent, container: HTMLDivElement) => boolean`: 拦截滚轮。
- `tokens?: Partial<RollingBoxTokens>`
- `thumbColor?: string`: 废弃，推荐 `tokens.thumbColor`。
- `thumbHoverColor?: string`: 废弃。
- `thumbActiveColor?: string`: 废弃。
- `trackColor?: string`: 废弃。
- 继承 `React.HTMLAttributes<HTMLDivElement>`。

`RollingBoxTokens`：

- `thumbColor?: string`
- `thumbHoverColor?: string`
- `thumbActiveColor?: string`
- `trackColor?: string`

## Select

导入：

```tsx
import {Select, type SelectOption, type SelectValue} from 'flowcloudai-ui/Select'
```

受控用法：

```tsx
const [value, setValue] = useState<SelectValue>('draft')

<Select
    options={[
        {value: 'draft', label: '草稿'},
        {value: 'published', label: '已发布'},
    ]}
    value={value}
    onValueChange={setValue}
    searchable
/>
```

多选用法：

```tsx
<Select
    multiple
    defaultValue={['tag-a']}
    options={tagOptions}
    onValueChange={setTags}
/>
```

`SelectProps`：

- `options: SelectOption[]`
- `value?: SelectValue`
- `defaultValue?: SelectValue`
- `onValueChange?: SelectValueChangeHandler`
- `onChange?: (value: SelectValue) => void`: 废弃兼容回调。
- `placeholder?: string`
- `searchable?: boolean`
- `multiple?: boolean`
- `disabled?: boolean`
- `radius?: SelectRadius`: 同 `FcRadius`。
- `className?: string`
- `style?: React.CSSProperties`
- `virtualScroll?: boolean`
- `virtualItemHeight?: number`
- `maxHeight?: number`
- `tokens?: Partial<SelectTokens>`
- `triggerBackground?: string`: 废弃，推荐 `tokens.triggerBackground`。
- `triggerBorderColor?: string`: 废弃。
- `selectedColor?: string`: 废弃。
- `selectedBackground?: string`: 废弃。
- `hoverBackground?: string`: 废弃。
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'value'>`。

`SelectOption`：

- `value: string | number`
- `label: string`
- `disabled?: boolean`
- `group?: string`

`SelectValue`：

- `string | number | (string | number)[]`

`SelectTokens`：

- `triggerBackground?: string`
- `triggerBorderColor?: string`
- `selectedColor?: string`
- `selectedBackground?: string`
- `hoverBackground?: string`

## SideBar

导入：

```tsx
import {SideBar, type SideBarItem} from 'flowcloudai-ui/SideBar'
```

基础用法：

```tsx
const [selectedKey, setSelectedKey] = useState('home')
const [collapsed, setCollapsed] = useState(false)

<SideBar
    items={[{key: 'home', label: '首页'}, {key: 'settings', label: '设置'}]}
    selectedKey={selectedKey}
    collapsed={collapsed}
    onSelectedKeyChange={setSelectedKey}
    onCollapsedChange={setCollapsed}
/>
```

`SideBarProps`：

- `items: SideBarItem[]`
- `bottomItems?: SideBarItem[]`
- `selectedKey: string`
- `collapsed: boolean`
- `anchorState?: SideBarAnchorState`: `collapse` 或 `normal`，设置后隐藏折叠按钮并固定状态。
- `width?: number`: 展开宽度，默认 240。
- `collapsedWidth?: number`: 折叠宽度，默认 64。
- `placement?: SideBarPlacement`: `left` 或 `right`。
- `onSelectedKeyChange?: SideBarSelectedKeyChangeHandler`
- `onSelect?: (key: string) => void`: 废弃兼容回调。
- `onCollapsedChange?: SideBarCollapsedChangeHandler`
- `onCollapse?: (collapsed: boolean) => void`: 废弃兼容回调。
- 继承 `Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'>`。

`SideBarItem`：

- `key: string`
- `label: string`
- `icon?: React.ReactNode`
- `disabled?: boolean`
- `href?: string`

## Slider

导入：

```tsx
import {Slider, type SliderValue} from 'flowcloudai-ui/Slider'
```

基础用法：

```tsx
const [value, setValue] = useState<SliderValue>(40)

<Slider
    value={value}
    onValueChange={setValue}
    min={0}
    max={100}
    step={5}
    tooltip
/>
```

范围用法：

```tsx
<Slider range defaultValue={[20, 80]} onValueChange={setRange} />
```

`SliderProps`：

- `value?: SliderValue`
- `defaultValue?: SliderValue`
- `onValueChange?: SliderValueChangeHandler`
- `onChange?: (value: SliderValue) => void`: 废弃兼容回调。
- `min?: number`
- `max?: number`
- `step?: number`
- `range?: boolean`
- `orientation?: SliderOrientation`: `horizontal` 或 `vertical`。
- `disabled?: boolean`
- `marks?: Record<number, string>`
- `tooltip?: boolean`
- `className?: string`
- `style?: React.CSSProperties`
- `tokens?: Partial<SliderTokens>`
- `trackBackground?: string`: 废弃，推荐 `tokens.trackBackground`。
- `fillBackground?: string`: 废弃。
- `thumbBackground?: string`: 废弃。
- `thumbBorderColor?: string`: 废弃。
- `markDotColor?: string`: 废弃。
- `markLabelColor?: string`: 废弃。
- `tooltipBackground?: string`: 废弃。
- `tooltipColor?: string`: 废弃。
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'value'>`。

`SliderValue`：

- `number | [number, number]`

`SliderTokens`：

- `trackBackground?: string`
- `fillBackground?: string`
- `thumbBackground?: string`
- `thumbBorderColor?: string`
- `markDotColor?: string`
- `markLabelColor?: string`
- `tooltipBackground?: string`
- `tooltipColor?: string`

## TabBar

导入：

```tsx
import {TabBar, type TabItem} from 'flowcloudai-ui/TabBar'
```

基础用法：

```tsx
const [selectedKey, setSelectedKey] = useState('overview')

<TabBar
    items={[
        {key: 'overview', label: '总览'},
        {key: 'logs', label: '日志', closable: true},
    ]}
    selectedKey={selectedKey}
    onSelectedKeyChange={setSelectedKey}
    closable
    addable
/>
```

`TabBarProps`：

- `items: TabItem[]`
- `selectedKey?: string`
- `activeKey?: string`: 废弃兼容，推荐 `selectedKey`。
- `variant?: TabBarVariant`: `attached` 或 `floating`。
- `radius?: TabBarRadius`: 同 `FcRadius`。
- `tabRadius?: TabBarRadius`: 单个 tab 圆角。
- `closable?: boolean`
- `addable?: boolean`
- `draggable?: boolean`
- `minTabWidth?: string`
- `maxTabWidth?: string`
- `fillWidth?: boolean`
- `onSelectedKeyChange?: TabBarSelectedKeyChangeHandler`
- `onChange?: (activeKey: string) => void`: 废弃兼容。
- `onClose?: (key: string) => void`
- `onAdd?: () => void`
- `onReorder?: (reorderedItems: TabItem[]) => void`
- `tabClassName?: string`
- `activeTabClassName?: string`
- `tabStyle?: React.CSSProperties`
- `activeTabStyle?: React.CSSProperties`
- `renderCloseIcon?: (key: string) => React.ReactNode`
- `renderAddButton?: () => React.ReactNode`
- `tokens?: Partial<TabBarTokens>`
- `background?: string`: 废弃，推荐 `tokens.background`。
- `tabColor?: string`: 废弃。
- `tabHoverColor?: string`: 废弃。
- `tabHoverBackground?: string`: 废弃。
- `tabActiveColor?: string`: 废弃。
- `tabActiveBackground?: string`: 废弃。
- `activeIndicatorColor?: string`: 废弃。
- `tauriDragRegion?: boolean`: 空白区域作为 Tauri 窗口拖拽区。
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>`。

`TabItem`：

- `key: string`
- `label: React.ReactNode`
- `disabled?: boolean`
- `closable?: boolean`

`TabBarTokens`：

- `background?: string`
- `tabColor?: string`
- `tabHoverColor?: string`
- `tabHoverBackground?: string`
- `tabActiveColor?: string`
- `tabActiveBackground?: string`
- `activeIndicatorColor?: string`

## TagItem

导入：

```tsx
import {TagItem, type TagSchema, type TagValue} from 'flowcloudai-ui/TagItem'
```

基础用法：

```tsx
const schema: TagSchema = {id: 'age', name: '年龄', type: 'number', range_min: 0, range_max: 300}
const [value, setValue] = useState<TagValue>(18)

<TagItem
    schema={schema}
    value={value}
    mode="edit"
    onValueChange={setValue}
    onDelete={() => removeTag(schema.id)}
/>
```

`TagItemProps`：

- `schema: TagSchema`
- `value?: TagValue`
- `onValueChange?: TagValueChangeHandler`
- `onChange?: (value: TagValue) => void`: 废弃兼容回调。
- `onDelete?: () => void`
- `mode?: 'show' | 'edit'`
- `editing?: boolean`
- `onEditingChange?: (editing: boolean) => void`
- `tokens?: Partial<TagItemTokens>`
- `background?: string`: 废弃，推荐 `tokens.background`。
- `color?: string`: 废弃。
- `borderColor?: string`: 废弃。
- 继承 `Omit<HTMLAttributes<HTMLSpanElement>, 'defaultValue' | 'onChange' | 'value'>`。

`TagSchema`：

- `id: string`
- `name: string`
- `type: 'number' | 'string' | 'boolean'`
- `range_min?: number | null`
- `range_max?: number | null`

`TagValue`：

- `number | string | boolean`

`TagItemTokens`：

- `background?: string`
- `color?: string`
- `borderColor?: string`

## TeraEditor

导入：

```tsx
import {TeraEditor, type TeraEditorDiagnostic, type TeraEditorRef} from 'flowcloudai-ui/TeraEditor'
```

基础用法：

```tsx
const [template, setTemplate] = useState('Hello {{ name }}')

<TeraEditor
    value={template}
    onValueChange={setTemplate}
    height={320}
    validate={validateTemplate}
    onDiagnosticsChange={setDiagnostics}
/>
```

`TeraEditorProps`：

- `value: string`: 受控内容。
- `onValueChange?: TeraEditorValueChangeHandler`: 推荐内容变更回调。
- `onChange?: (value: string) => void`: 废弃兼容回调。
- `height?: number | string`
- `minHeight?: number`
- `fontFamily?: string`
- `fontSize?: number`
- `lineHeight?: number`
- `placeholder?: string`
- `readOnly?: boolean`
- `className?: string`
- `style?: React.CSSProperties`
- `diagnostics?: TeraEditorDiagnostic[]`
- `validate?: (value: string) => TeraEditorDiagnostic[] | Promise<TeraEditorDiagnostic[]>`
- `onDiagnosticsChange?: (diagnostics: TeraEditorDiagnostic[]) => void`
- `showMinimap?: boolean`
- `wordWrap?: 'off' | 'on'`
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>`。

`TeraEditorDiagnostic`：

- `message: string`
- `severity?: TeraEditorDiagnosticSeverity`: `error`、`warning`、`info`、`hint`。
- `startLineNumber: number`
- `startColumn: number`
- `endLineNumber: number`
- `endColumn: number`
- `source?: string`
- `code?: string`

`TeraEditorRef`：

- `focus: () => void`
- `getEditorInstance: () => TeraEditorInstance | null`
- `getMonacoInstance: () => TeraEditorMonaco | null`

## ThemeProvider

导入：

```tsx
import {ThemeProvider, useTheme, useOptionalTheme, type Theme} from 'flowcloudai-ui/ThemeProvider'
```

基础用法：

```tsx
function Root() {
    return (
        <ThemeProvider defaultTheme="system">
            <App />
        </ThemeProvider>
    )
}

function ThemeToggle() {
    const {theme, resolvedTheme, setTheme} = useTheme()
    return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{resolvedTheme}</button>
}
```

`ThemeProviderProps`：

- `children: ReactNode`
- `defaultTheme?: Theme`: `light`、`dark`、`system`。
- `target?: HTMLElement`: 写入 `data-theme` 的目标元素，默认 `document.documentElement`。
- `onThemeApplied?: ThemeAppliedHandler`: 应用主题后回调。

`ThemeContextValue`：

- `theme: Theme`
- `resolvedTheme: ResolvedTheme`: `light` 或 `dark`。
- `setTheme: (theme: Theme) => void`

`useTheme()`：

- 必须在 `ThemeProvider` 内调用，返回 `ThemeContextValue`。

`useOptionalTheme()`：

- 可选获取主题上下文，未在 Provider 内时返回 `null`。

## Tree

导入：

```tsx
import {Tree, flatToTree, type FlatCategory, type TreeActionItem} from 'flowcloudai-ui/Tree'
```

基础用法：

```tsx
const {roots} = flatToTree(rows)
const [selectedKey, setSelectedKey] = useState<string>()
const [expandedKeys, setExpandedKeys] = useState<string[]>([])

<Tree
    treeData={roots}
    selectedKey={selectedKey}
    onSelectedKeyChange={setSelectedKey}
    expandedKeys={expandedKeys}
    onExpandedKeysChange={setExpandedKeys}
    searchable
    searchPlaceholder="搜索分类"
/>
```

带操作和拖拽：

```tsx
<Tree
    treeData={roots}
    selectedKey={selectedKey}
    onSelectedKeyChange={setSelectedKey}
    onRename={renameNode}
    onCreate={createNode}
    onDeleteRequest={setDeleteTarget}
    onMove={moveNode}
    canDrag={node => node.raw.parent_id !== null}
    getNodeActions={(node, state, helpers): TreeActionItem[] => [
        {key: 'rename', label: '重命名', onClick: helpers.startEdit, disabled: !state.canRename},
        {key: 'delete', label: '删除', danger: true, onClick: helpers.requestDelete},
    ]}
/>
```

`TreeProps`：

- `treeData: CategoryTreeNode[]`
- `onRename?: (key: string, newName: string) => Promise<void>`
- `onCreate?: (parentKey: string | null) => Promise<string>`
- `onDeleteRequest?: (node: CategoryTreeNode) => void`
- `onMove?: (key: string, targetKey: string, position: DropPosition) => Promise<void>`
- `onSelect?: (key: string) => void`: 废弃兼容，推荐 `onSelectedKeyChange`。
- `selectedKey?: string`
- `onSelectedKeyChange?: TreeSelectedKeyChangeHandler`
- `expandedKeys?: string[]`
- `defaultExpandedKeys?: string[]`
- `onExpandedKeysChange?: (keys: string[]) => void`
- `onVisibleRowsChange?: (rows: TreeVisibleRow[]) => void`
- `onViewportRowsChange?: (payload: TreeViewportRowsPayload) => void`
- `searchable?: boolean`
- `searchValue?: string`
- `defaultSearchValue?: string`
- `onSearchChange?: (value: string) => void`
- `searchPlaceholder?: string`
- `renderTitle?: (node: CategoryTreeNode, state: TreeNodeRenderState) => React.ReactNode`
- `getNodeActions?: (node: CategoryTreeNode, state: TreeNodeRenderState, helpers: TreeNodeActionHelpers) => TreeActionItem[]`
- `canDrag?: (node: CategoryTreeNode) => boolean`
- `canDrop?: (source: CategoryTreeNode, target: CategoryTreeNode, position: DropPosition) => boolean`
- `canRename?: (node: CategoryTreeNode) => boolean`
- `canDelete?: (node: CategoryTreeNode) => boolean`
- `canCreate?: (node: CategoryTreeNode | null) => boolean`
- `indentationLine?: boolean`
- `indentSize?: number`
- `actionDisplayMode?: TreeActionDisplayMode`: `auto`、`inline`、`overflow`。
- `actionCollapseThreshold?: number`
- `tokens?: TreeTokens`
- `colorTokens?: TreeColorTokens`: 废弃兼容，推荐 `tokens`。
- `scrollHeight?: string | number`
- `virtualRowHeight?: number`
- `virtualOverscan?: number`
- `collapseDuration?: number`
- 继承 `Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>`。

`FlatCategory`：

- `id: string`
- `parent_id: string | null`
- `name: string`
- `sort_order: number`
- `project_id?: string`
- `[key: string]: unknown`

`CategoryTreeNode`：

- `key: string`
- `title: string`
- `children: CategoryTreeNode[]`
- `raw: FlatCategory`

`FlatToTreeResult`：

- `roots: CategoryTreeNode[]`
- `orphans: CategoryTreeNode[]`

`TreeVisibleRow`：

- `key: string`
- `node: CategoryTreeNode`
- `level: number`
- `isExpanded: boolean`

`TreeViewportRowsPayload`：

- `startIndex: number`
- `endIndexExclusive: number`
- `rows: TreeVisibleRow[]`

`TreeNodeRenderState`：

- `level: number`
- `hidden: boolean`
- `isExpanded: boolean`
- `isSelected: boolean`
- `isEditing: boolean`
- `hasChildren: boolean`
- `isCompactActions: boolean`
- `canDrag: boolean`
- `canRename: boolean`
- `canDelete: boolean`
- `canCreate: boolean`

`TreeNodeActionHelpers`：

- `select: () => void`
- `toggleExpand: () => void`
- `expandSubtree: () => void`
- `collapseSubtree: () => void`
- `startEdit: () => void`
- `requestCreate: () => Promise<void>`
- `requestDelete: () => void`

`TreeActionItem`：

- Action: `{ type?: 'action'; key: string; label: string; icon?: React.ReactNode; title?: string; onClick: () => void | Promise<void>; danger?: boolean; disabled?: boolean; showInline?: boolean; showInMenu?: boolean }`
- Divider: `{ type: 'divider'; key?: string; showInMenu?: boolean }`

`TreeTokens`：

- `text?: string`
- `textMuted?: string`
- `bgHover?: string`
- `bgSelected?: string`
- `border?: string`
- `borderFocus?: string`
- `primary?: string`
- `primarySubtle?: string`
- `danger?: string`
- `actionHoverBg?: string`
- `dropIndicator?: string`

工具函数：

- `flatToTree(list: FlatCategory[]): FlatToTreeResult`
- `findNodeInfo(nodes, key, parent?, visited?)`: 查找节点及上下文，返回 `node`、`parent`、`siblings`、`index` 或 `null`。
- `isDescendantOf(roots, ancestorKey, targetKey): boolean`: 判断目标节点是否为指定祖先后代。
