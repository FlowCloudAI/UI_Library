# MapShapeEditor PixiJS 预览层迁移说明

本文档记录 `MapShapeEditor` 从单一 Deck 预览层扩展到实验性 PixiJS 预览层的迁移工作、接口规范、新增能力和后续演进方向。

当前结论：迁移验证结果明显好于预期。PixiJS 已经可以承担 MapShapeEditor 的主要预览渲染任务，并且在风格化覆盖层、细粒度交互、图标和场景坐标扩展方面提供了比
Deck 更直接的控制能力。Deck 仍保留为兼容渲染器和高阶 deck.gl 能力入口，不会被移除。

---

## 迁移目标

本次迁移不是“用 Pixi 替换 Deck”，而是在 `MapShapeEditor` 中建立一条新的 React PixiJS 预览链路，让调用方可以按场景选择渲染器：

| 目标            | 状态  | 说明                                                                   |
|---------------|-----|----------------------------------------------------------------------|
| 保留 Deck 预览    | 已完成 | `MapDeckPreview` 和 deck.gl 依赖继续保留                                    |
| 新增 Pixi 预览    | 已完成 | `MapPixiPreview` 使用 `@pixi/react` + `pixi.js`，不手写 Pixi `Application` |
| Viewport 统一切换 | 已完成 | `MapShapeViewport` 支持 `renderer?: 'deck' \| 'pixi'`                  |
| 通用样式接口        | 已完成 | 新增 `shapeStyle`、`keyLocationStyle`、`labelStyle`                      |
| 预览交互拆分        | 已完成 | 新增 `enablePreviewPanZoom`、`enablePreviewPicking`                     |
| Pixi 扩展层      | 已完成 | 新增 `renderOverlay(context)` 和 `sceneFilters`                         |
| 双渲染器对照        | 已完成 | Demo 支持 Deck/Pixi 单栏切换和双栏对照                                          |

迁移后的推荐架构是：

```tsx
<MapShapeViewport
    mode="preview"
    renderer="pixi"
    canvas={canvas}
    scene={scene}
    shapeStyle={shapeStyle}
    keyLocationStyle={keyLocationStyle}
    labelStyle={labelStyle}
    pixiProps={pixiProps}
/>
```

`MapShapeViewport` 负责编辑/预览层编排、SVG viewBox 同步、预览交互开关和通用样式转发；`MapPixiPreview` / `MapDeckPreview`
负责各自底层渲染器的专属能力。

---

## 当前渲染能力

### Pixi 已支持能力

| 能力          | 说明                                                                                   |
|-------------|--------------------------------------------------------------------------------------|
| 场景渲染        | 支持 `MapPreviewScene` 的 `canvas`、`shapes`、`keyLocations`                              |
| 背景图         | 支持 `backgroundImage.url`、`opacity`、`fit: 'fill' \| 'cover' \| 'contain'`             |
| 多边形         | 支持填充色、描边色、屏幕像素线宽和 hover 增强                                                           |
| 关键地点圆点      | 支持半径、描边色、描边宽度、是否显示描边                                                                 |
| 关键地点图标      | 支持 `keyLocationRenderMode: 'circle' \| 'icon' \| 'auto'`、`iconSize`、`icon.anchorX/Y` |
| 标签          | 标签在屏幕像素层渲染，放大后不再随场景纹理变糊                                                              |
| tooltip     | 支持默认 tooltip、自定义 `getTooltip`、HTML tooltip、边缘避让                                      |
| picking     | 支持图形、关键地点和空白区域 picking，返回通用 `MapPreviewPickDetail`                                   |
| pan/zoom    | 预览模式支持滚轮缩放、拖拽平移，并复用 SVG viewBox clamp 逻辑                                             |
| 初始 framing  | Deck/Pixi 默认都按完整画布 `viewBox` 初始化，与 SVG 初始 viewBox 对齐                                 |
| 扩展层         | 支持 `renderOverlay(context)` 追加 React Pixi 子树                                         |
| Pixi filter | 支持 `sceneFilters?: Filter[]` 作用于场景容器                                                 |

### Deck 仍保留能力

| 能力                     | 说明                                                                                    |
|------------------------|---------------------------------------------------------------------------------------|
| deck.gl Layer 覆盖       | `polygonLayerProps`、`scatterplotLayerProps`、`iconLayerProps`、`textLayerProps`         |
| Shader inject          | `polygonShaderInject`、`scatterplotShaderInject`、`iconShaderInject`、`textShaderInject` |
| 额外 Deck Layer          | `extraLayers?: Layer[]`                                                               |
| Deck effects           | `deckEffects?: Effect[]`                                                              |
| OrthographicController | 预览态仍可使用 Deck 自带 pan/zoom                                                              |

Deck 专属接口继续存在，但推荐只在确实需要 deck.gl 底层能力时使用。常规业务样式应优先使用通用样式接口。

---

## 新接口规范

### `renderer`

`MapShapeViewport` 新增渲染器选择：

```ts
export type MapShapeViewportRenderer = 'deck' | 'pixi';
```

```tsx
<MapShapeViewport
    mode="preview"
    renderer="pixi"
    canvas={canvas}
    scene={scene}
/>
```

规则：

- 默认仍是 `deck`，用于兼容已有调用方。
- 新业务推荐显式传 `renderer="pixi"`。
- 编辑模式下，预览层仍会渲染在 SVG 编辑层下方；SVG 编辑层负责点位编辑。
- 预览模式下，当前渲染器接管只读查看、picking、tooltip、pan/zoom。

### 通用样式接口

新增三组 renderer-agnostic 样式接口：

```ts
export interface MapPreviewShapeStyle {
    lineWidth?: number;
}

export interface MapPreviewKeyLocationStyle {
    renderMode?: 'circle' | 'icon' | 'auto';
    radius?: number;
    strokeColor?: MapRgbaColor;
    strokeWidth?: number;
    showStroke?: boolean;
    iconSize?: number;
}

export interface MapPreviewLabelStyle {
    fontSize?: number;
    color?: MapRgbaColor;
    fontFamily?: string;
    fontWeight?: string;
}
```

推荐用法：

```tsx
<MapShapeViewport
    renderer="pixi"
    shapeStyle={{lineWidth: 3}}
    keyLocationStyle={{
        renderMode: 'auto',
        radius: 9,
        strokeColor: [255, 255, 255, 255],
        strokeWidth: 2,
        showStroke: true,
        iconSize: 32,
    }}
    labelStyle={{
        fontSize: 14,
        color: [30, 41, 59, 255],
        fontFamily: '"Microsoft YaHei UI", sans-serif',
        fontWeight: '600',
    }}
/>
```

优先级：

1. 数据自身字段优先，例如 `location.iconSize` 优先于 `keyLocationStyle.iconSize`。
2. 通用样式接口优先于旧散装 props。
3. Deck 专属 layer props / Pixi 专属 props 只作为高级逃生口。

旧接口兼容状态：

| 旧接口                      | 新接口                            | 状态    |
|--------------------------|--------------------------------|-------|
| `polygonLineWidth`       | `shapeStyle.lineWidth`         | 已标记废弃 |
| `keyLocationRadius`      | `keyLocationStyle.radius`      | 已标记废弃 |
| `keyLocationStrokeColor` | `keyLocationStyle.strokeColor` | 已标记废弃 |
| `keyLocationRenderMode`  | `keyLocationStyle.renderMode`  | 已标记废弃 |
| `iconSize`               | `keyLocationStyle.iconSize`    | 已标记废弃 |
| `labelFontSize`          | `labelStyle.fontSize`          | 已标记废弃 |
| `labelColor`             | `labelStyle.color`             | 已标记废弃 |
| `labelFontFamily`        | `labelStyle.fontFamily`        | 已标记废弃 |

### 关键地点图标规范

关键地点图标通过 scene 数据描述：

```ts
export interface MapPreviewKeyLocation {
    id: string;
    name: string;
    type: string;
    position: [number, number];
    color: MapRgbaColor;
    icon?: MapPreviewKeyLocationIcon | null;
    iconSize?: number;
}

export interface MapPreviewKeyLocationIcon {
    url: string;
    width?: number;
    height?: number;
    anchorX?: number;
    anchorY?: number;
    mask?: boolean;
}
```

渲染模式：

| 模式       | 行为                          |
|----------|-----------------------------|
| `circle` | 始终渲染圆点                      |
| `icon`   | 有 `icon.url` 时渲染图标，无图标时回退圆点 |
| `auto`   | 有 `icon.url` 时渲染图标，否则渲染圆点   |

锚点规则：

- `anchorX` / `anchorY` 使用图标源尺寸坐标，不是 0–1 比例。
- 缺省值为图标中心点。
- Pixi 会把锚点转换为自身需要的 0–1 anchor。

尺寸规则：

- `location.iconSize` 优先。
- 其次使用 `keyLocationStyle.iconSize`。
- 再回退到组件默认值。
- 图标尺寸按屏幕像素计算，不随地图缩放变大。

### 预览交互拆分

`MapShapeViewport` 新增：

```ts
enablePreviewPanZoom ? : boolean;
enablePreviewPicking ? : boolean;
onPreviewViewBoxChange ? : (viewBox: MapShapeEditorViewBox) => void;
```

语义：

| Prop                     | 默认                         | 说明                               |
|--------------------------|----------------------------|----------------------------------|
| `enablePreviewPanZoom`   | 预览模式为 `true`，编辑模式为 `false` | 控制预览态滚轮缩放和拖拽平移                   |
| `enablePreviewPicking`   | 预览模式为 `true`，编辑模式为 `false` | 控制 hover、click、tooltip 和 picking |
| `onPreviewViewBoxChange` | 无                          | 内部预览视口变化时回调                      |

编辑模式下，视口由 SVG 编辑器的 `viewBox` / `onViewBoxChange` 控制；预览层只跟随，不主动改 viewBox。

预览模式下，如果没有传 `syncViewBox`，Pixi/Deck 可以内部托管视口，并通过 `onPreviewViewBoxChange` 把 viewBox 暴露给外部。

### picking 事件规范

Deck 与 Pixi 统一返回：

```ts
export type MapPreviewPickDetail =
    | MapPreviewEmptyPickDetail
    | MapPreviewShapePickDetail
    | MapPreviewKeyLocationPickDetail;
```

通用字段：

```ts
export interface MapPreviewPickBaseDetail {
    index: number;
    layerId?: string;
    x: number;
    y: number;
    coordinate?: number[];
}
```

对象类型：

| `kind`        | `object`                | 触发来源      |
|---------------|-------------------------|-----------|
| `empty`       | `null`                  | 空白画布区域    |
| `shape`       | `MapPreviewShape`       | 多边形       |
| `keyLocation` | `MapPreviewKeyLocation` | 圆点或图标关键地点 |

Pixi 专属事件：

```tsx
<MapPixiPreview
    scene={scene}
    onPixiHover={detail => {
        // detail 可能是 shape、keyLocation、empty 或 null
    }}
    onPixiClick={detail => {
        // 空白点击可用于清空选择
    }}
    onShapeClick={detail => selectShape(detail.object.id)}
    onKeyLocationClick={detail => selectLocation(detail.object.id)}
/>
```

Viewport 推荐通过 `pixiProps` 传入：

```tsx
<MapShapeViewport
    renderer="pixi"
    pixiProps={{
        onPixiClick: detail => {
            if (detail.kind === 'empty') clearSelection();
        },
    }}
/>
```

### tooltip 规范

通用 tooltip 类型：

```ts
export interface MapPreviewTooltip {
    text?: string;
    html?: string;
    className?: string;
    style?: CSSProperties;
}
```

`getTooltip` 语义已经在 Deck/Pixi 之间统一：

| 返回值         | 行为                   |
|-------------|----------------------|
| `undefined` | 使用默认 tooltip         |
| `null`      | 禁用当前对象 tooltip       |
| `string`    | 等价于 `{text: string}` |
| `{text}`    | 显示纯文本，支持换行           |
| `{html}`    | 显示 HTML，由调用方保证内容可信   |

示例：

```tsx
const getTooltip = (detail: MapPreviewPickDetail) => {
    if (detail.kind === 'empty') return null;
    if (detail.kind === 'shape') {
        return `图形：${detail.object.name}`;
    }
    return {
        html: `<strong>${detail.object.name}</strong><br/>类型：${detail.object.type}`,
        className: 'custom-map-tooltip',
    };
};

<MapShapeViewport
    renderer="pixi"
    pixiProps={{getTooltip}}
/>
```

Pixi tooltip 额外能力：

- DOM 浮层由组件自管。
- 支持容器边缘避让。
- pan/zoom 开始时自动隐藏当前 tooltip。
- 放大视口不影响 tooltip 清晰度。

### Pixi 扩展层：`renderOverlay`

`MapPixiPreview` 新增 Pixi 专属扩展点：

```ts
export interface MapPixiPreviewOverlayContext {
    scene: MapPreviewScene;
    viewportTransform: {
        x: number;
        y: number;
        scale: number;
    };
    viewportSize: {
        width: number;
        height: number;
    };
}

renderOverlay ? : (context: MapPixiPreviewOverlayContext) => ReactNode;
```

特点：

- 覆盖层位于内置背景、图形、关键地点之后。
- 覆盖层使用场景坐标系，可直接使用 `scene.canvas` 坐标。
- 标签当前绘制在覆盖层之后，以保证可读性。
- 不暴露 Deck Layer，避免把 Deck 和 Pixi 的扩展模型混在一起。

示例：

```tsx
<MapPixiPreview
    scene={scene}
    renderOverlay={({scene}) => (
        <pixiGraphics
            draw={graphics => {
                graphics.clear();
                graphics
                    .rect(0, 0, scene.canvas.width, scene.canvas.height)
                    .stroke({width: 1, color: 0x38bdf8, alpha: 0.18});
            }}
        />
    )}
/>
```

在 app demo 中，由于演示应用没有直接声明 `pixi.js` / `@pixi/react` 依赖，示例使用
`createElement('pixiGraphics' as any, ...)`。如果业务应用直接依赖 Pixi，可以正常使用 JSX 标签和类型。

### Pixi filter：`sceneFilters`

`MapPixiPreview` 新增：

```ts
sceneFilters ? : Filter[];
```

规则：

- filter 作用于内置图层和 `renderOverlay` 所在的场景容器。
- filter 生命周期由调用方管理。
- 推荐用 `useMemo` 创建 filter，避免每次 render 生成新实例。
- 不尝试映射 Deck 的 `deckEffects`，两者属于不同渲染模型。

---

## ViewBox 与坐标规范

MapShapeEditor 的核心坐标系仍是画布坐标：

```ts
export interface MapEditorCanvas {
    width: number;
    height: number;
}

export interface MapShapeEditorViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
```

当前统一规则：

- SVG 编辑器初始 viewBox 为完整画布：`{x: 0, y: 0, width: canvas.width, height: canvas.height}`。
- Pixi 默认初始 framing 使用完整画布 viewBox。
- Deck 默认初始 framing 也改为完整画布 viewBox。
- 编辑模式下，预览层通过 `syncViewBox` 跟随 SVG。
- 双栏对照模式下，可以让一个预览层通过 `onPreviewViewBoxChange` 主控，另一个通过 `syncViewBox` 跟随。

注意：

`MapShapeViewport` 会按 `canvas.width / canvas.height` 设置容器 `aspect-ratio`，因此完整画布 viewBox 能自然铺满。若单独使用
`MapPixiPreview` 或 `MapDeckPreview`，且容器宽高比不同于画布，当前策略会以宽度为准；未来可考虑新增 `fitMode` 或显式
`previewViewBox`。

---

## 推荐迁移路径

### 1. 只切换渲染器

已有调用方如果使用 `MapShapeViewport`，最小迁移只需要加：

```tsx
renderer = "pixi"
```

完整示例：

```tsx
<MapShapeViewport
    mode={mode}
    renderer="pixi"
    canvas={canvas}
    scene={scene}
    viewBox={viewBox}
    onViewBoxChange={setViewBox}
/>
```

### 2. 把散装样式迁移到通用样式

旧写法：

```tsx
<MapPixiPreview
    scene={scene}
    polygonLineWidth={3}
    keyLocationRadius={10}
    labelFontSize={14}
/>
```

新写法：

```tsx
<MapShapeViewport
    renderer="pixi"
    shapeStyle={{lineWidth: 3}}
    keyLocationStyle={{radius: 10}}
    labelStyle={{fontSize: 14}}
/>
```

### 3. 图标数据放进 scene

```ts
const scene: MapPreviewScene = {
    canvas,
    shapes,
    keyLocations: [
        {
            id: 'gate-a',
            name: 'A 出入口',
            type: 'gate',
            position: [320, 240],
            color: [226, 75, 74, 255],
            icon: {
                url: gateIconUrl,
                width: 44,
                height: 44,
                anchorX: 22,
                anchorY: 22,
            },
            iconSize: 34,
        },
    ],
};
```

```tsx
<MapShapeViewport
    renderer="pixi"
    keyLocationStyle={{renderMode: 'auto', iconSize: 30}}
/>
```

### 4. 用 Pixi overlay 承接风格化渲染

业务态势、扫描线、选中光晕、异常边框、关联线等建议优先走 `renderOverlay`：

```tsx
<MapShapeViewport
    renderer="pixi"
    pixiProps={{
        renderOverlay: context => (
            <pixiGraphics
                draw={graphics => drawBusinessOverlay(graphics, context)}
            />
        ),
    }}
/>
```

这样能保持内置图层稳定，同时让业务层自由演进。

---

## Pixi 相比 Deck 的新增价值

### 更适合业务风格化覆盖

Deck 的强项是大规模地理/数据可视化层；Pixi 的强项是 2D 场景图、即时绘制和更灵活的图形组合。MapShapeEditor
当前是固定画布坐标，不是真实地图投影，因此 Pixi 的模型更贴近需求。

Pixi 迁移后可以更自然地实现：

- 场景网格。
- 区域光晕。
- 选中态描边。
- 异常态闪烁或强调。
- 关键地点扫描圈。
- 关键地点与图形之间的业务关联线。
- 自定义 Pixi 子树覆盖层。
- Pixi filter 后处理。

### 更清晰的坐标模型

Pixi 直接使用 `scene.canvas` 坐标作为场景坐标，不需要绕过 deck.gl Layer 抽象。对于 MapShapeEditor
这种画布型编辑器，数据、编辑层和预览层的坐标关系更直观。

### 更容易做细粒度交互

Pixi 当前已经为图形、关键地点和空白区域分别设置 hitArea / eventMode，可继续扩展：

- 背景点击清空选择。
- 区域 hover 高亮。
- 关键地点 hover 高亮。
- 右键菜单。
- 框选起点。
- 自定义业务对象 picking。

### 标签清晰度可控

Pixi 标签已改为屏幕像素层渲染，不再随场景容器放大旧纹理，因此放大后文字清晰度明显改善。

---

## Deck 与 Pixi 的接口边界

为了避免迁移后接口失控，当前遵循以下边界：

| 类型      | 推荐接口                                                         | 不推荐做法                             |
|---------|--------------------------------------------------------------|-----------------------------------|
| 常规样式    | `shapeStyle`、`keyLocationStyle`、`labelStyle`                 | 继续扩散 `polygonLineWidth` 等散装 props |
| 通用交互    | `enablePreviewPanZoom`、`enablePreviewPicking`、通用 pick detail | 按 renderer 分别设计完全不同事件结构           |
| Pixi 扩展 | `renderOverlay`、`sceneFilters`                               | 暴露 Deck Layer 或 GLSL 概念到 Pixi API |
| Deck 扩展 | `extraLayers`、`deckEffects`、shader inject                    | 把 Deck 专属接口提升成通用接口                |
| 图标      | scene 数据中的 `icon`、`iconSize`                                 | 只在某个 renderer prop 里描述图标          |

原则：

- 业务语义放通用接口。
- 渲染器底层能力留在 `deckProps` / `pixiProps`。
- 不为了表面统一而把 Deck 和 Pixi 的能力强行抽象成一个不稳定接口。

---

## 已知限制

| 限制                        | 当前处理                  | 后续方向                               |
|---------------------------|-----------------------|------------------------------------|
| Pixi 图标未处理 `icon.mask` 着色 | 仅使用 `url`、尺寸和锚点       | 如需单色图标，再设计 Pixi 独立 tint/mask 语义    |
| Pixi 纹理未做全局缓存             | DOM `Image` 加载后创建纹理   | 场景规模变大后补纹理缓存和加载失败占位                |
| `sceneFilters` 生命周期由调用方管理 | 组件不创建/销毁 Filter       | 文档和 demo 中用 `useMemo` 固定实例         |
| `renderOverlay` 默认在标签下方   | 保证标签可读性               | 如需 overlay 压过标签，可新增 z-order 选项     |
| 独立预览组件容器比例不匹配             | 以完整画布 viewBox 和容器宽度为准 | 可新增 `fitMode` 或受控 `previewViewBox` |
| Deck tooltip 仍由 DeckGL 管理 | Pixi tooltip 已自管并支持避让 | 如需完全一致，可把 Deck tooltip 也改为 DOM 自管  |

---

## 后续路线

### 短期

- 给 Pixi overlay 增加正式示例，避免 demo 中长期依赖 `createElement('pixiGraphics' as any, ...)`。
- 补充 `previewViewBox` / `onPreviewViewBoxChange` 的受控模式设计，让 Deck/Pixi 双栏对照更稳定。
- 视需要给独立预览组件增加 `fitMode`，明确 `width`、`contain`、`cover` 等适配策略。

### 中期

- 抽象更完整的 `shapeStyle`、`keyLocationStyle`、`labelStyle`：
    - hover 样式。
    - selected 样式。
    - invalid 样式。
    - label offset。
    - icon halo / shadow。
- 为 Pixi 增加纹理缓存、图标加载失败占位和资源释放策略。
- 设计可选的 DOM screen overlay，例如 `renderScreenOverlay`，用于 HUD、角标、浮动控件。

### 长期

- 在大场景后评估性能优化：
    - `GraphicsContext` 复用。
    - 纹理缓存。
    - 标签裁剪。
    - 分层 memo。
    - 脏区更新。
- 如确实需要，再设计 Pixi shader / custom geometry 高阶 API。优先通过 `renderOverlay` 封装自定义 Mesh / Geometry /
  Filter，不急于暴露 shader 字符串注入。
- 根据业务稳定程度，逐步降低 Deck 专属样式接口在常规场景中的推荐级别，但保留 Deck 高阶能力入口。

---

## Demo 验证范围

`app/src/demos/MapShapeEditorDemo.tsx` 当前覆盖：

- 默认 Pixi 渲染器。
- Deck/Pixi 单栏切换。
- Deck/Pixi 双栏对照。
- 同一份 `scene`、同一份通用样式参数。
- 关键地点圆点 / 图标 / auto 模式。
- tooltip rich / compact / default / off。
- Pixi `renderOverlay` 风格化覆盖层：
    - neon：态势光晕 + 全域网格。
    - operations：强调选中和异常。
    - clean：关闭覆盖层。
- 外部强制异常高亮。
- 预览 hover/click 状态回传。

迁移后，建议业务方优先在 Demo 中验证新样式和 overlay，再固化为项目内的封装组件。

