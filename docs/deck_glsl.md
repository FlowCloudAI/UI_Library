# MapDeckPreview GLSL 着色器注入接口详解

本文档聚焦 `MapDeckPreview` 的 **GLSL Shader Inject** 机制，说明如何通过注入片段修改 deck.gl 各层的着色器行为，实现自定义渲染风格（如水墨画描边、边缘发光、透明度渐变等）。

---

## 核心类型与 API

### `MapDeckShaderInject`

```ts
export type MapDeckShaderInject = Record<string, string>;
```

- **Key**：deck.gl 的 shader hook 名称（如 `'fs:DECKGL_FILTER_COLOR'`）。
- **Value**：要注入该 hook 位置的 GLSL 代码片段（**不需要**写函数包裹，直接写语句即可）。

### `makeInjectExtension`

```ts
export function makeInjectExtension(inject: MapDeckShaderInject): LayerExtension;
```

将 `MapDeckShaderInject` 包装成匿名 `LayerExtension` 实例。组件内部会自动调用，宿主也可以手动使用。

**源码实现：**

```ts
return new class extends LayerExtension {
    override getShaders() {
        return { inject };
    }
}();
```

---

## Props 接口

`MapDeckPreviewProps` 为四个内置层分别暴露了 shader inject 入口：

| Prop | 目标层 | 说明 |
|------|--------|------|
| `polygonShaderInject` | `PolygonLayer` (`fc-map-preview-polygons`) | 多边形区域（fill + stroke） |
| `scatterplotShaderInject` | `ScatterplotLayer` (`fc-map-preview-key-locations`) | 圆点关键地点 |
| `iconShaderInject` | `IconLayer` (`fc-map-preview-key-location-icons`) | 图标关键地点 |
| `textShaderInject` | `TextLayer` (`fc-map-preview-key-location-labels`) | 地点标签 |

注入逻辑在组件内部通过 `mergeExtensions()` 完成：

```ts
function mergeExtensions(
    userProps: { extensions?: LayerExtension[] } | undefined,
    inject: MapDeckShaderInject | undefined,
): LayerExtension[] {
    return [
        ...(userProps?.extensions ?? []),
        ...(inject ? [makeInjectExtension(inject)] : []),
    ];
}
```

**合并优先级**：`polygonLayerProps.extensions`（用户显式传入）→ `polygonShaderInject`（自动包装）。两者共存时，inject extension 追加在后，均会生效。

---

## Shader Hook 详解

deck.gl 的 LayerExtension / inject 机制基于 **shader hook**，在编译期将代码片段插入到 vertex / fragment shader 的指定位置。

### 通用 Hook（所有层适用）

| Hook | 类型 | 插入位置 | 可用变量 | 典型用途 |
|------|------|----------|----------|----------|
| `'vs:#decl'` | Vertex | 全局声明段 | — | 声明 `varying`、辅助函数、uniform |
| `'fs:#decl'` | Fragment | 全局声明段 | — | 声明 `uniform`、辅助函数、常量 |
| `'vs:DECKGL_FILTER_GL_POSITION'` | Vertex | `gl_Position` 赋值后 | `vec4 gl_Position` | 顶点位移、抖动、形变 |
| `'fs:DECKGL_FILTER_COLOR'` | Fragment | 最终颜色输出前 | `vec4 color`（RGBA，0–1） | 颜色变换、纹理叠加、边缘效果 |

### PolygonLayer 特有可用变量

在 `fs:DECKGL_FILTER_COLOR` 中，除了 `color`，PolygonLayer 的 fragment shader 还隐式携带了 deck.gl 标准光照与填充/描边逻辑。由于 PolygonLayer 将 fill 和 stroke 放在同一个 draw call 中，**无法通过单一 hook 区分当前像素属于填充面还是描边线**——如果需要单独处理描边，通常要结合 `lineWidthMinPixels` + 基于 `gl_FragCoord` 或 UV 的 distance-based 边缘检测。

### ScatterplotLayer 特有可用变量

ScatterplotLayer 的 fragment shader 在圆形裁剪后输出颜色，因此 `fs:DECKGL_FILTER_COLOR` 中的 `color` 已经经过了圆形 mask。可以安全地在此处做径向渐变或边缘虚化。

### 关于 `color` 的取值范围

在 `fs:DECKGL_FILTER_COLOR` 中，`color` 是 **vec4，范围 0–1**，不是 0–255。例如：

```glsl
color.r = min(color.r * 1.2, 1.0);   // 提亮红色通道
color.a *= 0.6;                      // 降低整体透明度
```

---

## 使用方式

### 方式 A：直接传 `*ShaderInject` Prop（推荐）

```tsx
import { MapDeckPreview, type MapDeckShaderInject } from 'flowcloudai-ui';

const inkInject: MapDeckShaderInject = {
    'fs:DECKGL_FILTER_COLOR': `
        // 示例：将边缘颜色加深模拟水墨感
        float edgeDarken = 1.0 - color.a;
        color.rgb *= (1.0 - edgeDarken * 0.3);
    `,
};

<MapDeckPreview
    scene={scene}
    polygonShaderInject={inkInject}
/>;
```

### 方式 B：手动包装后传入 `extensions`

当需要把 GLSL inject 与其他自定义 `LayerExtension` 组合时：

```tsx
import { makeInjectExtension } from 'flowcloudai-ui';
import { LayerExtension } from '@deck.gl/core';

class CustomExtension extends LayerExtension {
    // ...
}

<MapDeckPreview
    scene={scene}
    polygonLayerProps={{
        extensions: [
            new CustomExtension(),
            makeInjectExtension(inkInject),
        ],
    }}
/>;
```

**注意**：即使采用方式 B，仍然可以**同时**传 `polygonShaderInject`，两者会自动合并，不会互斥。

---

## 内置层默认渲染参数（Shader 修改的基准）

了解默认值有助于判断 shader 中需要覆盖或放大的量：

### PolygonLayer 默认

```ts
{
    pickable: true,
    filled: true,
    stroked: true,
    wireframe: false,
    lineWidthMinPixels: 2,
    getFillColor: item => item.fillColor,   // DeckColor [R,G,B,A] 0-255
    getLineColor: item => item.lineColor,   // DeckColor [R,G,B,A] 0-255
}
```

### ScatterplotLayer 默认

```ts
{
    pickable: true,
    radiusMinPixels: 6,
    radiusMaxPixels: 14,
    stroked: true,
    lineWidthMinPixels: 2,
    getRadius: 8,
    getFillColor: item => item.color,
    getLineColor: () => [255, 255, 255, 255],
}
```

---

## 示例

### 1. 基础颜色变换（全局暖化）

```ts
const warmInject: MapDeckShaderInject = {
    'fs:DECKGL_FILTER_COLOR': `
        color.r = min(color.r * 1.25, 1.0);
        color.g *= 0.92;
        color.b *= 0.78;
    `,
};
```

### 2. 多边形填充透明度统一下调

```ts
const transparentFill: MapDeckShaderInject = {
    'fs:DECKGL_FILTER_COLOR': `
        color.a *= 0.45;
    `,
};

<MapDeckPreview
    scene={scene}
    polygonShaderInject={transparentFill}
/>;
```

### 3.  ScatterplotLayer 边缘发光

利用 ScatterplotLayer 的圆形 mask 特性，在边缘增加亮度：

```ts
const glowInject: MapDeckShaderInject = {
    'fs:#decl': `
        // deck.gl Scatterplot 的 fragment shader 中通常有 dist 变量表示到圆心距离
        // 但 inject 无法直接访问局部变量，这里改用基于 gl_PointCoord 的方式
    `,
    'fs:DECKGL_FILTER_COLOR': `
        // 如果该层是 point-sprite 渲染，可尝试通过 color 做径向提亮
        // 更稳定的方式是在 polygon/line 层做后处理
        color.rgb += (1.0 - color.a) * 0.15;
    `,
};
```

### 4. 水墨画风格描边（PolygonLayer）

**思路**：水墨晕开的核心是“描边边缘向外扩散 + 不透明度衰减 + 轻微噪声”。由于 PolygonLayer 的 fill 和 stroke 在同一个 fragment shader 中，且 deck.gl 默认的 PolygonLayer stroke 是硬边，**纯 GLSL inject 无法直接改变几何线宽**，但可以：

1. 加粗 `lineWidthMinPixels`（通过 `polygonLayerProps`）。
2. 在 `fs:DECKGL_FILTER_COLOR` 中降低 stroke 像素的 alpha，让粗线变得半透明、朦胧。
3. 利用 `deckEffects` + `PostProcessEffect` 做全屏模糊/扩散，模拟宣纸晕染。

#### 步骤一：加粗描边并提高透明度对比

```tsx
<MapDeckPreview
    scene={scene}
    polygonLayerProps={{
        lineWidthMinPixels: 6,  // 加粗描边，为晕开留出像素空间
    }}
    polygonShaderInject={{
        'fs:DECKGL_FILTER_COLOR': `
            // 简单的半透明处理：让颜色整体变淡
            // 由于 PolygonLayer 的 fill 和 stroke 共享同一个 color 输出，
            // 此 inject 会影响两者。若只想影响 stroke，需要更高级的 extension。
            color.a *= 0.75;
            color.rgb = mix(color.rgb, vec3(0.08, 0.08, 0.09), 0.15); // 向墨色偏移
        `,
    }}
/>;
```

#### 步骤二：配合 PostProcessEffect 做全屏晕染

```tsx
import { PostProcessEffect } from '@deck.gl/core';
import { tiltShift, vignette } from '@luma.gl/shadertools'; // 以 luma.gl 为例

// 注意：tiltShift 并非直接模拟水墨，这里仅作示例说明 PostProcessEffect 的用法
// 实际项目中可能需要自定义 post-process shader
const inkBleedEffect = new PostProcessEffect(vignette, {
    radius: 0.85,
    amount: 0.3,
});

<MapDeckPreview
    scene={scene}
    polygonLayerProps={{
        lineWidthMinPixels: 6,
    }}
    polygonShaderInject={{
        'fs:DECKGL_FILTER_COLOR': `
            color.a *= 0.7;
            color.rgb = mix(color.rgb, vec3(0.06, 0.07, 0.08), 0.12);
        `,
    }}
    deckEffects={[inkBleedEffect]}
/>;
```

#### 步骤三：高级方案——自定义 LayerExtension 区分 fill/stroke

如果必须让 fill 保持清晰、仅让 stroke 晕开，需要**自定义 LayerExtension** 覆盖 PolygonLayer 的默认绘制逻辑。此时 `makeInjectExtension` 的通用 hook 已不够用，需要深入 deck.gl / luma.gl 的 `draw()`、`initializeState()` 生命周期。这是一个宿主侧的高级用法，不在 `MapDeckPreview` 的默认接口范围内，但可以通过 `polygonLayerProps.extensions` 注入。

参考骨架：

```ts
import { LayerExtension } from '@deck.gl/core';

class InkStrokeExtension extends LayerExtension {
    getShaders() {
        return {
            inject: {
                'fs:#decl': `
                    // 声明 uniform 或辅助函数
                `,
                'fs:DECKGL_FILTER_COLOR': `
                    // 基于 deck.gl 内部 varying（如 vPosition 等）区分 fill/stroke
                    // 注意：不同 deck.gl 版本的内置 varying 名称可能不同
                `,
            },
        };
    }
}
```

> **版本提示**：deck.gl / luma.gl 9.x 的 shader 变量名与 8.x 有较大差异，直接依赖内置 `varying` 存在版本锁定风险。若需要长期维护，建议锁定 `@deck.gl/core` 和 `@deck.gl/layers` 版本。

---

## 注意事项

1. **GLSL 语法严格**：deck.gl 的 shader 编译不会自动注入高版本特性，请使用 GLSL ES 1.0 / 3.0 兼容语法。
2. **color 范围**：在 `fs:DECKGL_FILTER_COLOR` 中，`color` 是 0–1 的 `vec4`；而宿主传入的 `fillColor` / `lineColor` 是 0–255 的 `DeckColor`，由 deck.gl 自动归一化。
3. **PolygonLayer 的 fill/stroke 合一**：默认情况下无法通过单一 hook 只改描边不改填充。如果需要精确控制，考虑自定义 `LayerExtension` 或改用 `PathLayer` + `SolidPolygonLayer` 组合（通过 `extraLayers` 自行叠加）。
4. **性能**：复杂的 fragment shader（如噪声函数、多次 texture lookup）在移动端或高像素密度屏幕上可能影响帧率。建议配合 `deckEffects` 的全屏后处理来分摊像素级计算。
5. **Hook 名称拼写**：deck.gl 对 hook 名称大小写敏感，常见错误包括写成 `fs:deckgl_filter_color`（应为大写 `DECKGL_FILTER_COLOR`）。

---

## 快速参考：从 `MapDeckPreview` 导出的类型

```ts
// 来自 ui/src/components/MapShapeEditor/MapDeckPreview.tsx

export type MapDeckShaderInject = Record<string, string>;

export function makeInjectExtension(inject: MapDeckShaderInject): LayerExtension;

export interface MapDeckPreviewProps {
    // ... 其他 props ...
    polygonShaderInject?: MapDeckShaderInject;
    scatterplotShaderInject?: MapDeckShaderInject;
    iconShaderInject?: MapDeckShaderInject;
    textShaderInject?: MapDeckShaderInject;
    // ...
}
```
