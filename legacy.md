# MapShapeEditor Pixi 预览层遗留事项

每执行完一步都要分析这一步做的是否有遗漏，改用 Pixi 后是否可以增加适当接口，减少、修正不当接口。

如果问题不影响下一步的进行，就把问题加到这个文档。

如果问题影响下一步，就直接修复。

## 当前不阻塞事项

- `DeckColor` 目前保留为兼容类型，并新增了 `MapRgbaColor` 作为通用 RGBA 命名。后续如有破坏性版本窗口，可把公共场景类型逐步迁移到
  `MapRgbaColor`，再把 `DeckColor` 降级为兼容别名。
- `MapShapeViewport` 已新增 `shapeStyle`、`keyLocationStyle`、`labelStyle` 三组通用样式接口，Deck/Pixi 专属 props
  仍保留为高级逃生口。后续需要补文档说明优先级：通用样式用于常规业务，`deckProps` / `pixiProps` 用于底层渲染器细节。
- Pixi 已支持 `keyLocationRenderMode`、`iconSize` 和 `icon.anchorX/Y`，且渲染模式已抽成通用 `MapKeyLocationRenderMode`。旧的
  `MapPixiKeyLocationRenderMode` 目前保留为兼容别名，后续可在文档中标注优先使用通用类型。
- Pixi 图标尺寸当前遵循“地点自身 `iconSize` 优先，组件 `iconSize` 兜底”的规则。后续如果需要全局强制覆盖每个地点图标，应另设明确语义的
  override 接口，避免 `iconSize` 同时承担默认值和强制值。
- Pixi 图标目前只使用 `icon.url`、`icon.width/height`、`icon.anchorX/Y`，暂未处理 `icon.mask`。如果后续需要单色图标着色，应设计
  Pixi 独立的 tint/mask 语义，不直接照搬 Deck 的 `IconLayer` 行为。
- Pixi 图标和背景已改为 DOM `Image` 加载后创建纹理，尚未做跨实例纹理缓存、加载失败占位或跨域错误反馈。场景规模变大或外部图片源复杂时再统一补。
- Pixi 已支持图形和关键地点 picking、hover、click、默认 tooltip 与 `getTooltip`，但 pick detail 类型仍是 Pixi/Deck 各一套。后续应抽出
  renderer-agnostic 的 `MapPreviewPickDetail` / `MapPreviewTooltip`，Deck 与 Pixi 只保留底层专属字段。
- Pixi 当前没有空白区域 picking，因此没有 `kind: 'empty'`，与 Deck 的 `onDeckClick` 空白点击能力不完全一致。若业务需要背景点击、清空选择或右键菜单，应在
  Pixi 侧补容器级 hitArea。
- Pixi tooltip 当前是组件内 DOM 浮层，位置按 Pixi 全局坐标加偏移计算，尚未做视口边缘避让。后续如果 tooltip
  内容较宽或移动端使用，应补自动翻转/裁剪。
- Pixi `getTooltip` 的空返回值语义与当前 Deck 实现保持一致：回退默认 tooltip，关闭整体 tooltip 使用 `disableTooltip`
  。后续统一通用 tooltip API 时，应明确“回退默认”和“禁止显示”两个不同返回语义。
- Pixi tooltip 支持 `html` 并使用 `dangerouslySetInnerHTML`，与 Deck 的 HTML tooltip 能力对齐，但需要调用方保证内容可信。后续通用
  API 可考虑提供结构化 React/文本优先的扩展点，降低 HTML 注入风险。
- 已将 Pixi 图标和背景纹理从 `Texture.from(url)` 改为 DOM `Image` 加载后创建纹理，用于规避 data URL 未进 Assets Cache
  的告警。如果浏览器中仍出现 `WebGL context was lost`，再继续检查 Pixi/Deck 切换时的上下文生命周期、热更新重复挂载和显卡资源上限。
- Pixi 非编辑预览模式已支持滚轮缩放和拖拽平移，并复用 `clampMapShapeEditorViewBox` 限制视口范围；当前内部交互视口没有暴露给宿主。后续如需
  Deck/Pixi 双栏对照或外部保存预览视口，应新增 renderer-agnostic 的 `previewViewBox` / `onPreviewViewBoxChange`。
- Pixi 预览模式的初始视口当前按完整画布初始化，Deck 预览仍保留自身 auto-fit/padding 行为。两者默认首屏 framing
  可能存在轻微差异，后续做双栏对照 Demo 时应统一初始适配策略或显式传入同一份 `syncViewBox`。
- Pixi 拖拽平移从预览容器级别触发，移动超过阈值后会压制本次 click。后续如果给预览层增加对象拖拽、框选或右键菜单，需要把 pan
  手势与 picking/编辑手势拆成更明确的交互模式。
- `MapShapeViewport` 目前把 Pixi 的 `interactive` 作为内部托管参数，仅按 `mode` 自动切换。后续如果预览态需要只读但禁用
  pan/zoom/picking，应补通用的 `previewInteraction` 或拆分 `enablePreviewPanZoom`、`enablePreviewPicking` 语义。
- Pixi pan/zoom 期间 tooltip 没有独立的“平移中禁用/隐藏”接口；当前不影响功能，但移动端或高频滚轮场景可能需要统一的 hover
  暂停策略。
- 第 5 步已把 Demo 控件文案从 Deck layer 术语改为通用样式术语，但 `deckProps` / `pixiProps`
  的类型层面仍允许部分渲染器专属样式入口存在于单独组件上。后续如果要减少不当接口，应先补迁移说明，再考虑给散装 Pixi 样式
  props 和 Deck layer 样式 props 加废弃标记。
- `MapPreviewLabelStyle.fontWeight` 为了保持 renderer-agnostic 目前使用 `string`，传入 Pixi 时会收敛到 Pixi 的 TextStyle
  字重类型。后续如果需要更强类型，可抽出跨 Deck/Pixi 都接受的字重联合类型。
- `keyLocationStyle.showStroke` 目前主要影响圆点关键地点；图标模式没有额外图标描边语义。后续如需图标外圈、阴影或选中描边，应单独设计
  `iconStyle`，避免把圆点描边语义扩展得过宽。
- Pixi 已新增 `renderOverlay(context)` 扩展点，返回内容挂在内置图层之后，并使用场景坐标系。该接口刻意不暴露 Deck
  Layer；后续如果需要屏幕坐标 HUD，应另设 `renderScreenOverlay` 或 DOM overlay，不要把两种坐标语义混在一个回调里。
- `renderOverlay` 目前只在 `MapPixiPreview` / `pixiProps` 中开放，`MapShapeViewport` 没有提供 renderer-agnostic 的
  overlay prop。后续若要跨 Deck/Pixi 统一扩展层，需要先定义抽象层能力边界，否则容易把 Deck Layer 和 Pixi ReactNode 混成不稳定接口。
- `renderOverlay` 需要调用方自己保证已注册所需 Pixi 组件。当前内置只 `extend` 了 `Container`、`Graphics`、`Sprite`、`Text`
  ；如果调用方要用更多 Pixi DisplayObject，后续可考虑导出注册辅助函数或文档示例。
- Pixi 已新增 `sceneFilters?: Filter[]`，只应用到内置图层和 `renderOverlay` 所在的场景容器。该接口是 Pixi 专属能力，不尝试对齐
  Deck 的 `deckEffects` 或 shader inject，避免把两个渲染器的后处理模型混成一个不稳定抽象。
- 第 7 步暂未提供 Pixi shader 字符串注入 API。后续如确有需求，应优先让调用方通过 `renderOverlay` 封装自定义 Pixi Mesh /
  Geometry / Filter，再评估是否需要更高层的 `filterFactory` 或 `effectStyle`。
- `sceneFilters` 的生命周期由调用方管理；组件不会创建、销毁或复用 Filter 实例。后续如果 Demo 加滤镜控制项，应使用 `useMemo`
  创建滤镜，避免每次渲染生成新实例造成 GPU 资源抖动。
- Demo 已通过 `renderOverlay` 展示 Pixi 风格化潜力，包括网格、图形光晕、关键地点扫描圈和关联线；由于 app 包没有直接依赖
  `pixi.js` / `@pixi/react`，示例里使用 `createElement('pixiGraphics' as any, ...)`。后续若要把 overlay
  示例做成长期文档，应考虑从组件库导出轻量 Pixi overlay helper，或在 app 明确添加 Pixi 依赖并补类型。
- Demo 当前的 Pixi 风格化覆盖层只使用 `Graphics` 绘制，没有使用 `sceneFilters`。后续如果需要演示 filter 能力，应先决定 app
  是否直接依赖 Pixi，再用 `useMemo` 管理 Filter 实例生命周期。
- Pixi 标签已改为屏幕像素层渲染，避免随场景容器放大旧 Text 纹理导致文字发糊。当前标签在 `renderOverlay`
  之后绘制，优先保证文字可读性；如果后续需要 overlay 压在标签上方，应新增明确的 overlay z-order 选项。
- Tier 2 已实现：`MapShapeViewport` 新增 `enablePreviewPanZoom` / `enablePreviewPicking`，Deck/Pixi 内部分别拆出
  `enablePanZoom` / `enablePicking`；Pixi 已补空白区域 picking；tooltip 已统一为 `undefined` 回退默认、`null`
  禁用当前对象 tooltip。后续如果业务需要“允许点击但禁用 hover tooltip”这类更细粒度能力，可再把 picking 拆成
  hover/click/tooltip
  三个开关。

---

## 按性价比排序的实施建议

> 以下按 **"改动量最小、收益最实在"** 分级。每做完一批记得更新本清单，把已完成项标记为 ✅。

### Tier 1：几乎零成本，纯类型/注释层清理（建议优先）

| # | 事项                                               | 对应遗留条目 | 改动说明                                                                                        | 预估时间 |
|---|--------------------------------------------------|--------|---------------------------------------------------------------------------------------------|------|
| 1 | ✅ `MapPixiKeyLocationRenderMode` 标 `@deprecated` | 第 3 条  | `MapPixiPreview.tsx` 已加 JSDoc，引导使用 `MapKeyLocationRenderMode`                               | 已完成  |
| 2 | ✅ `DeckColor` 内部类型切到 `MapRgbaColor`              | 第 1 条  | `MapRgbaColor` 已提升为主定义，`DeckColor` 已标 `@deprecated`；`api.ts` / `MapPixiPreview.tsx` 内部类型已替换 | 已完成  |
| 3 | ✅ 散装样式 props 标 `@deprecated`                     | 第 19 条 | `MapPixiPreviewProps` / `MapDeckPreviewProps` 中已被通用样式覆盖的样式入口已加废弃说明                          | 已完成  |

**结论**：Tier 1 已完成。此次为纯类型/注释层清理，构建通过，未发现影响后续 Tier 2 的阻塞项。

### Tier 2：低成本，有明显功能/对齐收益

| # | 事项                              | 对应遗留条目 | 改动说明                                                                                                                                            | 预估时间 |
|---|---------------------------------|--------|-------------------------------------------------------------------------------------------------------------------------------------------------|------|
| 4 | ✅ 拆分 `previewInteraction`       | 第 16 条 | `MapShapeViewportProps` 已新增 `enablePreviewPanZoom?: boolean`、`enablePreviewPicking?: boolean`；Pixi/Deck 内部已拆成 `enablePanZoom` 和 `enablePicking` | 已完成  |
| 5 | ✅ 空白区域 picking（`kind: 'empty'`） | 第 8 条  | `MapPixiScene` 已增加全画布 hitArea，空白点击/hover 会生成 `MapPreviewEmptyPickDetail`；子对象事件会阻止冒泡，避免重复触发 empty                                                | 已完成  |
| 6 | ✅ tooltip 空返回值语义统一              | 第 10 条 | 已统一约定：`getTooltip` 返回 `null` = **禁用该对象 tooltip**；返回 `undefined` = **回退默认 tooltip**                                                              | 已完成  |

**结论**：Tier 2 已完成。构建通过，未发现影响后续 Tier 3 的阻塞项。

### Tier 3：中等成本，体验优化（按需做）

| # | 事项                    | 对应遗留条目 | 改动说明                                                            | 预估时间      |
|---|-----------------------|--------|-----------------------------------------------------------------|-----------|
| 7 | pan/zoom 期间隐藏 tooltip | 第 17 条 | `handlePointerDown` / `handleWheel` 开始时 `setTooltipState(null)` | 10 min    |
| 8 | 统一初始视口 framing        | 第 14 条 | Pixi 预览初始 `viewBox` 与 Deck 统一，或双栏模式下显式传入同一份 `syncViewBox`       | 30 min    |
| 9 | tooltip 视口边缘避让        | 第 9 条  | tooltip DOM 加 `ref`，`useLayoutEffect` 测量尺寸，调整 `left/top` 防溢出容器  | 30-60 min |

**结论**：属于锦上添花，等有实际交互体验反馈（如移动端适配、tooltip 截断投诉）时再补。

### Tier 4：高成本或当前收益不明确（暂不建议）

| #  | 事项                                      | 对应遗留条目    | 暂不做的原因                                           |
|----|-----------------------------------------|-----------|--------------------------------------------------|
| 10 | `fontWeight` 联合类型                       | 第 20 条    | Deck 与 Pixi 接受的值域差异大，联合类型只是 `string` 子集，收益有限     |
| 11 | `icon.mask` 单色图标着色                      | 第 5 条     | 需要独立设计 Pixi tint/mask 语义，不能直接照搬 Deck `IconLayer` |
| 12 | 纹理缓存 / 加载失败占位                           | 第 6 条     | 当前场景规模小，DOM Image 加载已够用                          |
| 13 | `renderScreenOverlay` / 统一 overlay prop | 第 22、23 条 | 架构改动大，需先明确 Deck Layer 与 Pixi ReactNode 的能力边界     |
| 14 | Pixi shader 字符串注入 API                   | 第 25 条    | 优先级低，`renderOverlay` + `sceneFilters` 已提供逃生口     |

---

*最后更新：2026-04-22*
