# lib_ui 组件 API 基线规范

本文档定义 `flowcloudai-ui` 组件的公共 API 基线，用于后续组件新增、重构、文档编写和接入示例统一。当前阶段只定义规范，不要求一次性破坏性重构；已有 API 通过兼容别名逐步迁移。

## 1. 已确认决策

1. 迁移方式采用“新增统一 API + 旧 API 标记废弃”的兼容路线，不做一次性破坏性修改。
2. `TabBar` 接受从 `activeKey/onChange` 迁移到 `selectedKey/onSelectedKeyChange`，旧 API 保留兼容。
3. 深度样式覆盖统一命名为 `tokens`；旧的直接颜色 props 与 `colorTokens` 保留兼容。
4. `TeraEditor` 保持 controlled-only，不新增 uncontrolled 模型；可新增 `onValueChange` 作为统一命名别名。

## 2. 公共原则

1. 所有公开组件必须有稳定、可导入的 Props 类型。
2. 基础用法应保持一致：导入组件、传入状态、监听变更、覆盖样式的方式不应因组件不同而割裂。
3. 新 API 优先使用语义清晰的状态名回调，不再新增泛化的 `onChange` 作为主入口。
4. 旧 API 只做兼容保留，不作为新文档和新示例的推荐写法。
5. 样式覆盖按“全局 token、组件语义 props、组件 tokens”三层处理，避免继续增加零散颜色属性。
6. 组件内部实现可按复杂度选择是否透传 DOM 属性，但公开表面必须说明根节点能力和扩展边界。

## 3. 类型导出基线

每个公开组件至少导出：

```ts
export {Xxx} from './components/Xxx/Xxx'
export type {XxxProps} from './components/Xxx/Xxx'
```

若组件有公开数据结构、事件结构或 token 结构，也必须导出：

```ts
export type {
    XxxItem,
    XxxValue,
    XxxTokens,
    XxxChangeMeta,
} from './components/Xxx/Xxx'
```

主入口 `src/index.ts` 与子路径 `src/entries/Xxx.ts` 的导出必须保持一致。允许内部子组件、内部上下文、内部工具类型不导出，但公开 Props 依赖的类型不能是私有类型。

优先补齐的缺口：

1. `ButtonProps`、`ButtonGroupProps`、`ButtonToolbarProps`
2. `CheckButtonProps`
3. `InputProps`
4. `SelectProps`、`SelectOption`
5. `SliderProps`、`SliderValue`
6. `RollingBoxProps`
7. `TimelineProps`
8. `ThemeProviderProps`
9. `DeleteDialogProps`、`OrphanDialogProps` 如继续作为公开子路径组件，也应导出 Props

## 4. 根节点能力基线

所有有稳定根节点的公开组件都应支持：

```ts
export interface FcBaseProps {
    className?: string
    style?: React.CSSProperties
}
```

基础 DOM 包装组件应继承对应原生属性并透传剩余 props：

```ts
export interface XxxProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
        FcBaseProps {
}
```

按钮、输入框等交互组件应继承更具体的原生属性：

```ts
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
}

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'onChange'> {
}
```

复杂组件如果不适合完整 DOM 透传，也至少支持 `className` 和 `style`。需要暴露内部区域时，优先使用具名 props，例如 `rootProps`、`listProps`、`itemProps`，不要临时增加多个不成体系的 `xxxClassName/xxxStyle`。

## 5. 公共枚举基线

跨组件复用的视觉枚举统一放入公共类型文件，例如 `src/types/common.ts`：

```ts
export type FcSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type FcRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type FcStatus = 'default' | 'success' | 'warning' | 'error'
```

组件专属枚举可以保留在组件内，但应在公开 API 中导出。例如：

```ts
export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'success'
    | 'warning'
```

不要求所有组件都支持 `variant`。只有视觉模式确实稳定且对使用者有意义时才暴露 `variant`。

## 6. 状态命名基线

新 API 统一使用“状态名 + Change”的命名方式。

| 状态类型 | 受控值 | 非受控默认值 | 推荐回调 |
| --- | --- | --- | --- |
| 普通值 | `value` | `defaultValue` | `onValueChange` |
| 布尔值 | `checked` | `defaultChecked` | `onCheckedChange` |
| 单选 key | `selectedKey` | `defaultSelectedKey` | `onSelectedKeyChange` |
| 多选 key | `selectedKeys` | `defaultSelectedKeys` | `onSelectedKeysChange` |
| 展开 key | `expandedKeys` | `defaultExpandedKeys` | `onExpandedKeysChange` |
| 打开状态 | `open` | `defaultOpen` | `onOpenChange` |
| 编辑状态 | `editing` | `defaultEditing` | `onEditingChange` |
| 分屏状态 | `splitView` | `defaultSplitView` | `onSplitViewChange` |

旧 API 兼容规则：

1. 已存在的 `onChange` 保留，但标记 `@deprecated`，推荐迁移到对应的 `onXxxChange`。
2. 已存在的 `onSelect` 保留，但新文档推荐 `onSelectedKeyChange` 或领域语义更强的事件名。
3. `TabBar` 新增 `selectedKey/onSelectedKeyChange`，保留 `activeKey/onChange`。
4. `Tree` 保留 `onSelect`，新增 `onSelectedKeyChange`；`expandedKeys/onExpandedKeysChange` 已符合基线。
5. `TeraEditor` 保持 `value/onChange` 兼容，新增 `onValueChange` 作为推荐写法，不新增 `defaultValue`。

## 7. 回调签名基线

值变更回调统一使用：

```ts
type FcChangeHandler<TValue, TMeta = unknown> = (
    nextValue: TValue,
    meta?: TMeta,
) => void
```

`meta` 用于传递变更来源、原始事件或组件上下文：

```ts
export interface FcChangeMeta<TEvent = unknown> {
    source?: 'click' | 'keyboard' | 'input' | 'drag' | 'programmatic'
    event?: TEvent
}
```

约束：

1. 新回调的第一个参数必须是变更后的值。
2. 原始 DOM event 不作为第一个参数。
3. 原生事件通过 DOM 属性透传处理，例如 `onKeyDown`、`onFocus`、`onBlur`。
4. 领域事件可以保留语义名，例如 `onCopy`、`onRegenerate`、`onCheckout`，但状态变更类事件应优先遵守统一命名。

## 8. 样式覆盖基线

样式覆盖分三层。

### 8.1 全局 token

跨组件基础视觉变量继续使用 `--fc-*`，例如：

```css
--fc-color-bg
--fc-color-text
--fc-color-primary
--fc-radius-md
--fc-space-md
```

新增组件应优先消费全局 token，而不是硬编码颜色、间距、阴影。

### 8.2 组件语义 props

稳定、常用、语义明确的视觉差异使用组件 props：

```ts
size?: FcSize
radius?: FcRadius
status?: FcStatus
variant?: XxxVariant
disabled?: boolean
```

不应为了单个颜色继续增加 `hoverBackground`、`activeColor` 这类零散新 props。

### 8.3 组件 tokens

深度覆盖统一使用 `tokens`：

```ts
export interface XxxTokens {
    background?: string
    border?: string
    text?: string
    textMuted?: string
    primary?: string
}

export interface XxxProps {
    tokens?: Partial<XxxTokens>
}
```

兼容规则：

1. `Tree` 现有 `colorTokens` 迁移为 `tokens`，保留 `colorTokens` 作为兼容别名。
2. 已存在的直接颜色 props 保留，但标记 `@deprecated`，内部映射到 `tokens` 或 CSS variables。
3. 新组件不再新增直接颜色 props，除非该属性是组件核心语义而不是样式细节。

## 9. 组件族迁移基线

### 9.1 基础控件

范围：`Button`、`CheckButton`、`Input`、`Select`、`Slider`。

目标：

1. 补齐 Props 和相关类型导出。
2. 统一 `size/radius/status/disabled`。
3. 统一值变更回调。
4. 尽量继承并透传合适的原生 DOM 属性。

### 9.2 展示组件

范围：`Avatar`、`Card`、`ListGroup`、`VirtualList`、`RollingBox`、`TagItem`。

目标：

1. 保证 `className/style` 稳定。
2. 可点击或可交互组件明确 `disabled`、键盘行为和事件透传边界。
3. `TagItem` 新增 `onValueChange`，保留 `onChange`。

### 9.3 导航与结构组件

范围：`SideBar`、`TabBar`、`Tree`、`ConversationTreeView`、`Timeline`。

目标：

1. 选择状态统一到 `selectedKey/onSelectedKeyChange`。
2. 多 key 状态统一到 `selectedKeys/onSelectedKeysChange`。
3. `TabBar` 保留 `activeKey/onChange` 兼容。
4. `Timeline` 补齐 `TimelineProps` 导出，并支持 `className/style`。

### 9.4 编辑器与 AI 展示组件

范围：`TeraEditor`、`MessageBox`。

目标：

1. 编辑器保持 controlled-only。
2. 新增 `onValueChange` 推荐写法，保留 `onChange`。
3. `MessageBox` 补齐 `style`，必要时再设计 `tokens`，不把内容块渲染 API 和样式 API 混在一起。

### 9.5 Provider 与弹层

范围：`ThemeProvider`、`AlertProvider`、`ContextMenuProvider`、`DeleteDialog`、`OrphanDialog`。

目标：

1. Provider 必须导出 Props。
2. 弹层如作为公开组件导出，也必须导出 Props。
3. Provider 不强制支持 `className/style`，除非它本身渲染稳定可定制根节点。

## 10. 废弃标记规范

旧 API 保留时必须在类型注释中标记：

```ts
/** @deprecated 推荐改用 onValueChange。 */
onChange?: (value: string) => void
```

如果旧 API 与新 API 同时传入，优先使用新 API，并在开发环境输出一次警告。警告格式统一：

```ts
[flowcloudai-ui][Xxx] oldProp 已废弃，推荐改用 newProp。
```

废弃 API 至少保留一个小版本周期。真正移除前必须在版本文档中明确列出影响范围和迁移方式。

## 11. 文档与示例基线

每个公开组件文档应包含：

1. 基础用法
2. 受控用法
3. 非受控用法，如组件支持
4. 样式覆盖示例
5. 关键 Props 表
6. 兼容旧 API 说明，如存在

示例代码优先使用新 API。旧 API 只在迁移说明中出现。

## 12. 非目标

1. 不在一次改动中重写所有组件实现。
2. 不为了统一而移除已有能力。
3. 不把所有组件都强行设计成完全相同的 Props。
4. 不把组件专属领域事件改成过度通用的事件名。
5. 不在没有明确收益的情况下新增抽象层。

## 13. 阶段落地建议

第一阶段：不改行为，只补类型导出、公共类型和文档。

第二阶段：给基础控件新增统一回调别名，并保留旧 API。

第三阶段：统一 `tokens`，将旧颜色 props 映射为兼容入口。

第四阶段：迁移导航、树、时间线等结构组件的选择状态命名。

第五阶段：更新 demo 与组件文档，让示例全部使用新 API。

每个阶段完成后至少执行：

```bash
npm run lint
cd ui
npm run build
```

仅文档变更可以不执行构建，但必须检查 diff，确保没有编码异常或无关文件变更。
