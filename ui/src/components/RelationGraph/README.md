# RelationGraph

A React component that renders a relation/network graph.  
The component handles **node rendering, edge rendering, measurement, layout triggering, viewport fitting, and bidirectional-edge disambiguation**.  
It deliberately contains **no layout algorithm** — the host application injects an async layout function.

---

## Quick start

```tsx
import { RelationGraph } from 'flowcloudai-ui';
import type { LayoutFunction } from 'flowcloudai-ui';

// Your layout function — call Tauri invoke, fetch, or any async source here
const myLayoutFn: LayoutFunction = async (request) => {
  const result = await invoke('graph_layout', { request });
  return result;                       // must match LayoutResponse shape
};

<RelationGraph
  nodes={[
    { id: 'a', label: 'Alice' },
    { id: 'b', label: 'Bob' },
  ]}
  edges={[
    { source: 'a', target: 'b', label: '认识', kind: 'two_way' },
    { source: 'b', target: 'a', kind: 'two_way' },
  ]}
  layoutFn={myLayoutFn}
  height={480}
/>
```

---

## Protocol field semantics

### LayoutRequest (frontend → backend)

| Field | Type | Description |
|---|---|---|
| `nodeOrigin` | `[number, number]?` | Coordinate origin for node positions. Default `[0, 0]` = top-left corner of node. |
| `nodes` | `LayoutNode[]` | All graph nodes with their **measured** pixel dimensions. |
| `edges` | `LayoutEdge[]` | All graph edges. |

#### LayoutNode

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique node identifier, matching RelationNodeInput.id. |
| `width` | `number` | DOM-measured width in pixels. **Never guessed.** |
| `height` | `number` | DOM-measured height in pixels. **Never guessed.** |

#### LayoutEdge

| Field | Type | Description |
|---|---|---|
| `id` | `string?` | Edge id. |
| `source` | `string` | Source node id. |
| `target` | `string` | Target node id. |
| `sourceHandle` | `string?` | Handle id on the source node, if applicable. |
| `targetHandle` | `string?` | Handle id on the target node, if applicable. |
| `kind` | `'one_way' \| 'two_way'?` | Directionality hint. Default `'one_way'`. |

### LayoutResponse (backend → frontend)

| Field | Type | Description |
|---|---|---|
| `positions` | `Record<string, { x: number; y: number }>` | Keyed by node id. Nodes absent from the map retain their current position. |
| `bounds` | `{ x, y, width, height }?` | Bounding box of the laid-out graph in left-top coordinate space. Used for the initial `fitBounds` call. |
| `layoutHash` | `string?` | Optional opaque hash; unused by the frontend but can be forwarded in future requests. |

---

## Layout trigger timing

1. React Flow mounts and renders all nodes invisibly at `position: { x:0, y:0 }`.
2. React Flow measures each node's DOM size and stores it in `node.measured`.
3. `useNodesInitialized()` becomes `true` once **all** nodes are measured.
4. The hook computes a **graph signature** and compares it to the last applied signature.
5. If the signature differs, a `LayoutRequest` is constructed from the measured sizes and dispatched to `layoutFn`.
6. On success, positions are applied via `setNodes` and — on the first layout only — `fitBounds` is called.

**Empty-graph fast path**: if the node array is empty, the component marks layout as ready immediately and never calls `layoutFn`.

---

## Graph signature strategy

The signature is a deterministic string built from:

- **Nodes**: `id:widthxheight` (sorted, joined with `;`)
- **Edges**: `source->target[kind](sourceHandle,targetHandle)` (sorted, joined with `;`)

A signature change means a new layout is required. Node **positions** are intentionally excluded — moving a node does not trigger a re-layout.

Practical implications:
- Adding/removing a node triggers re-layout (id set changes).
- Resizing a node triggers re-layout (dimensions change).
- Adding/removing an edge triggers re-layout (edge set changes).
- Dragging a node does **not** trigger re-layout (only position changes).

---

## Async safety strategy

Every layout invocation is tagged with the graph signature at dispatch time.

1. Before dispatching, the hook stores the current signature in `pendingSigRef`.
2. Each concurrent/subsequent dispatch overwrites `pendingSigRef`.
3. When a response arrives, the hook checks if its signature matches `pendingSigRef.current`.
4. If it doesn't match (the request is stale), the response is **silently discarded** — no `setNodes`, no `fitBounds`.

This means only the response from the **most recently dispatched request** is ever applied.

---

## Bidirectional edge rendering

Before building the React Flow edge list, the component scans all input edges and marks any edge `E(A→B)` as `bidirectional: true` when a reverse edge `E(B→A)` also exists.

The `BidirectionalEdge` renderer shifts the Bezier curve start/end points by a fixed perpendicular offset (`18 px` screen-space).  
Because `A→B` and `B→A` have mirrored `dx/dy` vectors, their perpendicular offsets point in opposite directions — the two curves naturally separate to either side of the straight line between nodes.

This is purely a **visual** optimisation; it does not change edge semantics or the data sent to the layout backend.

---

## How to inject a real layout function

```ts
// Tauri (Rust backend)
const layoutFn: LayoutFunction = (req) =>
  invoke<LayoutResponse>('graph_layout', { request: req });

// HTTP backend
const layoutFn: LayoutFunction = async (req) => {
  const res = await fetch('/api/layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Layout failed: ${res.status}`);
  return res.json() as Promise<LayoutResponse>;
};

// Mock / test
const layoutFn: LayoutFunction = async (req) => ({
  positions: Object.fromEntries(req.nodes.map((n, i) => [n.id, { x: i * 200, y: 0 }])),
  bounds: { x: 0, y: 0, width: req.nodes.length * 200, height: 100 },
});
```

---

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `nodes` | `RelationNodeInput[]` | — | Input nodes. Memoize to avoid redundant layouts. |
| `edges` | `RelationEdgeInput[]` | — | Input edges. Memoize to avoid redundant layouts. |
| `layoutFn` | `LayoutFunction` | — | **Required.** Async layout function from the host. |
| `nodeOrigin` | `[number, number]` | `[0,0]` | React Flow node origin. |
| `fitPadding` | `number` | `0.1` | Viewport padding fraction (0–1) for `fitBounds`. |
| `fitDuration` | `number` | `500` | Animation duration for `fitBounds` in ms. |
| `onLayoutStateChange` | `(s: RelationLayoutState) => void` | — | Called when layout state changes. |
| `height` | `string \| number` | `'100%'` | Container height. Must be finite for React Flow. |
| `width` | `string \| number` | `'100%'` | Container width. |
| `className` | `string` | — | Extra CSS class on the root element. |
| `style` | `CSSProperties` | — | Inline styles on the root element. |

---

## CSS custom properties

Override on `.fc-rg` to theme the component:

| Property | Default (light) | Description |
|---|---|---|
| `--fc-rg-node-bg` | `var(--fc-color-bg-elevated)` | Node background |
| `--fc-rg-node-border` | `var(--fc-color-border)` | Node border |
| `--fc-rg-node-border-sel` | `var(--fc-color-primary)` | Selected node border |
| `--fc-rg-node-text` | `var(--fc-color-text)` | Node label colour |
| `--fc-rg-edge-color` | `var(--fc-gray-400)` | Edge stroke |
| `--fc-rg-edge-selected-color` | `var(--fc-color-primary)` | Selected edge stroke |

---

## Dependency note

`RelationGraph` imports `@xyflow/react/dist/style.css`.  
If your bundler does not automatically de-duplicate that file, you may see it included twice when you also use React Flow elsewhere — this is harmless.
