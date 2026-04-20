# LayoutProvider

## Responsibilities

`Relation` no longer owns a layout algorithm.

The UI library is responsible for:

- rendering React Flow nodes and edges
- waiting until nodes have measured sizes
- building `LayoutRequest`
- deciding when layout should run
- applying `LayoutResponse.positions`
- fitting the viewport with `fitBounds()` or `fitView()`
- protecting against stale async responses
- exposing layout loading and error state
- preserving visual edge behavior such as reverse-edge offsets

The UI library is not responsible for:

- layout algorithm implementation
- Tauri `invoke`
- Rust commands
- HTTP transport
- Web Worker plumbing
- caching

## Protocol

```ts
export interface LayoutRequest {
  nodeOrigin?: [number, number];
  nodes: {
    id: string;
    width: number;
    height: number;
  }[];
  edges: {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    kind?: 'one_way' | 'two_way';
  }[];
}

export interface LayoutResponse {
  positions: Record<string, { x: number; y: number }>;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  layoutHash?: string;
}

export interface LayoutProvider {
  computeLayout(request: LayoutRequest): Promise<LayoutResponse>;
}
```

### Field semantics

- `nodeOrigin` matches the React Flow node origin used by the graph.
- `nodes[].width` and `nodes[].height` come from measured node size, not hard-coded guesses.
- `edges[].kind` is the semantic direction used for layout input only.
- `positions` must be returned in the same coordinate system as React Flow node positions.
- `bounds` should describe the scene bounds to fit. When omitted, the UI falls back to `fitView()`.
- `layoutHash` is optional metadata from the provider and is not interpreted by the UI library.

## Trigger timing

`Relation` waits for `useNodesInitialized()` before sending the first layout request.

Automatic layout runs only when the memoized `graphSignature` changes. The signature is built from:

- node `id`
- measured `width`
- measured `height`
- edge `source`
- edge `target`
- edge `kind`
- edge `sourceHandle`
- edge `targetHandle`

This prevents re-layout on every render while still reacting to real graph or measurement changes.

## Async safety

Each request gets a monotonic request id.

When a response resolves, the graph applies it only if:

- the request id is still the latest request id
- the response still matches the latest graph signature

Older responses are dropped and never call `setNodes()`.

## Layout state exposure

The library exposes layout state in two ways:

- `useBackendLayout` returns `layoutReady`, `layoutLoading`, and `layoutError`
- `Relation` accepts `renderLayoutStatus`, which receives the same state plus `relayout()`

## Using the mock provider

The package exports `mockLayoutProvider` for Storybook, local demos, and visual regression work.

```ts
import { Relation, mockLayoutProvider } from 'flowcloudai-ui';

<Relation
  data={data}
  layoutProvider={mockLayoutProvider}
/>
```

The mock provider:

- does not depend on Tauri
- does not depend on Rust
- returns deterministic grid positions
- returns `bounds` so the viewport can fit consistently

## Using a real provider

Any host can inject its own implementation.

```ts
import type { LayoutProvider } from 'flowcloudai-ui';

const layoutProvider: LayoutProvider = {
  async computeLayout(request) {
    const response = await fetch('/api/layout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Layout request failed: ${response.status}`);
    }

    return response.json();
  },
};
```

The same contract can be backed by:

- Tauri
- HTTP
- Web Worker
- Electron IPC
- local mock data
