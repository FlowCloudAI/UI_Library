# MapDeckPreview 样式与着色器接口

本文档说明如何通过 `MapDeckPreview` 的开放参数实现自定义渲染风格，从简单样式调整到 GLSL 着色器注入。

---

## 概览

`MapDeckPreview` 内置三层 deck.gl：

| 层                | ID                                   | 数据来源                    | 说明                              |
|------------------|--------------------------------------|-------------------------|---------------------------------|
| BitmapLayer      | `fc-map-preview-background`          | `scene.backgroundImage` | 背景图，可选                          |
| PolygonLayer     | `fc-map-preview-polygons`            | `scene.shapes`          | 区域多边形                           |
| ScatterplotLayer | `fc-map-preview-key-locations`       | `scene.keyLocations`    | 圆点关键地点标记                        |
| IconLayer        | `fc-map-preview-key-location-icons`  | `scene.keyLocations`    | 图标关键地点标记（当 `location.icon` 生效时） |
| TextLayer        | `fc-map-preview-key-location-labels` | `scene.keyLocations`    | 地点标签                            |

每层开放完整的 prop 覆盖入口，加上 GLSL inject 和全局逃生舱（`extraLayers`、`deckEffects`）。

---

## per-layer props

通过 `polygonLayerProps`、`scatterplotLayerProps`、`iconLayerProps`、`textLayerProps` 可以覆盖任意 deck.gl layer prop，
但以下**结构性 accessor 被锁定**，不能覆盖：

| 层                | 锁定字段                                |
|------------------|-------------------------------------|
| PolygonLayer     | `id`、`data`、`getPolygon`            |
| ScatterplotLayer | `id`、`data`、`getPosition`           |
| IconLayer        | `id`、`data`、`getPosition`、`getIcon` |
| TextLayer        | `id`、`data`、`getText`               |

其余 prop（包括 `getFillColor`、`getLineColor`、`extensions` 等）均可覆盖，用户传入的值会被合并到默认值之后、锁定字段之前。

### 示例：修改多边形线宽和关键地点半径

```tsx
<MapDeckPreview
    scene={scene}
    polygonLayerProps={{lineWidthMinPixels: 4}}
    scatterplotLayerProps={{getRadius: 12, radiusMaxPixels: 20}}
/>
```

### 示例：关键地点切换为图标模式

```tsx
<MapDeckPreview
    scene={scene}
    keyLocationRenderMode="auto"
    iconLayerProps={{
        getSize: (location) => location.iconSize ?? 32,
    }}
/>
```

当 `keyLocationRenderMode="auto"` 时：

- `scene.keyLocations[i].icon?.url` 存在，则该点走 `IconLayer`
- 否则继续走 `ScatterplotLayer`

图标尺寸默认使用屏幕像素，不随地图缩放。

### 示例：关闭描边和标签

```tsx
<MapDeckPreview
    scene={scene}
    scatterplotLayerProps={{stroked: false}}
    showLabels={false}
/>
```

### 示例：差异化颜色（按数据字段）

```tsx
<MapDeckPreview
    scene={scene}
    polygonLayerProps={{
        getFillColor: (shape) =>
            shape.kind === 'coastline' ? [180, 220, 255, 160] : shape.fillColor,
    }}
/>
```

---

## GLSL Shader Inject

### 类型

```ts
/** GLSL inject map：key 为 deck.gl shader hook，value 为注入的 GLSL 代码片段 */
export type MapDeckShaderInject = Record<string, string>
```

### 常用 Hook 名称

| Hook                             | 阶段           | 典型用途                 |
|----------------------------------|--------------|----------------------|
| `'vs:#decl'`                     | vertex 声明段   | 声明 varying / uniform |
| `'fs:#decl'`                     | fragment 声明段 | 声明 uniform / 辅助函数    |
| `'vs:DECKGL_FILTER_GL_POSITION'` | vertex 位置    | 顶点位移、抖动              |
| `'fs:DECKGL_FILTER_COLOR'`       | fragment 颜色  | 颜色变换、纹理叠加            |

`DECKGL_FILTER_COLOR` 钩子中可直接修改 `color`（`vec4`，RGBA，0–1 范围）。

### `makeInjectExtension`

将一个 `MapDeckShaderInject` map 包装成匿名 `LayerExtension` 对象，可以手动传入 `extensions` 数组：

```ts
import {makeInjectExtension, type MapDeckShaderInject} from 'flowcloudai-ui'

const myInject: MapDeckShaderInject = {
        'fs:DECKGL_FILTER_COLOR': 'color.a *= 0.6;',
    }

    // 方式 A：直接传 shaderInject prop（推荐）
    < MapDeckPreview
scene = {scene}
polygonShaderInject = {myInject}
/>

// 方式 B：手动包装后传入 extensions（与其他 extension 合并时使用）
< MapDeckPreview
scene = {scene}
polygonLayerProps = {
{
    extensions: [makeInjectExtension(myInject), myOtherExtension],
}
}
/>
```

两种方式会自动合并（shaderInject 的 extension 附加在 `polygonLayerProps.extensions` 之后）。

---

## 风格示例

### 扁平风格（默认）

保持默认参数即可，使用 `scene` 中的 `fillColor`/`lineColor` 直接渲染。

### 暖色叠加

```ts
const warmInject: MapDeckShaderInject = {
        'fs:DECKGL_FILTER_COLOR': `
    color.r = min(color.r * 1.3 + 0.05, 1.0);
    color.g = color.g * 0.9;
    color.b = color.b * 0.65;
  `,
    }

    < MapDeckPreview
scene = {scene}
polygonShaderInject = {warmInject}
/>
```

### 半透明水墨感

```ts
// 降低多边形填充透明度 + 加粗边框
<MapDeckPreview
    scene = {scene}
polygonLayerProps = {
{
    getFillColor: (s) => [s.fillColor[0], s.fillColor[1], s.fillColor[2], 80],
        lineWidthMinPixels
:
    3,
}
}
/>
```

### 全局后处理效果（PostProcessEffect）

```ts
import {PostProcessEffect} from '@deck.gl/core'
import {vignette} from '@luma.gl/shadertools'

const vignetteEffect = new PostProcessEffect(vignette, {
        radius: 0.8,
        amount: 0.6,
    })

    < MapDeckPreview
scene = {scene}
deckEffects = {[vignetteEffect]}
/>
```

---

## Tooltip 可控性

`MapDeckPreview` 现在支持通过 `getTooltip` 接管悬浮内容：

```tsx
<MapDeckPreview
    scene={scene}
    getTooltip={(detail) => {
        if (detail.kind === 'shape') {
            return {
                html: `<div><strong>${detail.object.name}</strong><br/>顶点数：${detail.object.polygon.length}</div>`,
                style: {
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '10px 12px',
                },
            }
        }

        if (detail.kind === 'keyLocation') {
            return `关键地点：${detail.object.name}\n类型：${detail.object.type}`
        }

        return null
    }}
/>
```

返回值规则：

- 返回 `null`：本次不显示 tooltip
- 返回 `string`：等价于 `{ text: string }`
- 返回 `{ text }`：deck 默认文本 tooltip
- 返回 `{ html, className, style }`：自定义 HTML tooltip

如果完全不需要悬浮提示，可直接传 `disableTooltip`。

---

## extraLayers

需要在内置层之外叠加自定义 deck.gl 层时，使用 `extraLayers`：

```ts
import {GeoJsonLayer} from '@deck.gl/layers'

<MapDeckPreview
    scene = {scene}
extraLayers = {
    [
        new GeoJsonLayer({
            id: 'my-geojson',
            data: geoJsonData,
            filled: true,
            getFillColor: [255, 0, 0, 100],
        }),
]
}
/>
```

自定义层会追加在 TextLayer 之后渲染。

---

## syncViewBox 与叠层模式

当 `MapDeckPreview` 作为 `MapShapeViewport` 的 deck 子层使用时，viewport 会自动传入 `syncViewBox` 和 `disableTooltip`，应用方
**不需要**手动设置这两个 prop。

当前 `MapShapeViewport` 在叠层模式下已经把 deck 层和 SVG 层约束到同一块像素区域：

- deck 预览层铺满整个 viewport
- SVG 编辑层在 viewport 专用样式下会去掉内部 shell padding
- deck 与 SVG 共用同一块可绘制区域，因此 `syncViewBox` 推导出的视图状态可以与 SVG `viewBox` 对齐

手动使用时：

```ts
// deck viewState 与 SVG viewBox 完全同步
<MapDeckPreview
    scene = {scene}
syncViewBox = {svgViewBox}       // 传入 SVG 编辑器当前的 viewBox
disableTooltip                 // 叠层时避免 tooltip 遮挡 SVG 交互
/ >
```

viewState 推导公式：

- `target = [vb.x + vb.width/2, vb.y + vb.height/2, 0]`
- `zoom = log2(containerWidth / vb.width)`

---

## 高级：自定义 LayerExtension

如果 inject 不够用（例如需要添加 uniform、attribute、新的 draw pass），可以在应用层继承 `LayerExtension`：

```ts
import {LayerExtension} from '@deck.gl/core'

class PulseExtension extends LayerExtension {
    getShaders() {
        return {
            inject: {
                'vs:#decl': 'uniform float uTime;',
                'fs:DECKGL_FILTER_COLOR': `
          float pulse = 0.7 + 0.3 * sin(uTime * 3.0);
          color.a *= pulse;
        `,
            },
        }
    }

    draw({uniforms}: { uniforms: Record<string, unknown> }) {
        uniforms['uTime'] = performance.now() / 1000;
    }
}

<MapDeckPreview
    scene = {scene}
polygonLayerProps = {
{
    extensions: [new PulseExtension()],
}
}
/>
```

注意：`uniforms` 的写法在 deck.gl / luma.gl 9.x 中需要配合 `getShaders()` 的 uniform 声明，具体参见 deck.gl Extension API
文档。
