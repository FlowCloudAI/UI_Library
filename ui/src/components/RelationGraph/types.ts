// ui/src/components/RelationGraph/types.ts
// Fixed protocol types shared between the frontend component and the host-supplied layout function.
// Field names must not be changed — they form the public contract.

// ─── Layout protocol ──────────────────────────────────────────────────────────

/** A node descriptor sent to the layout backend.  Width/height MUST come from real DOM measurements. */
export interface LayoutNode {
    id: string;
    width: number;
    height: number;
}

/** An edge descriptor sent to the layout backend. */
export interface LayoutEdge {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    /** Directionality hint: 'one_way' (default) or 'two_way'. */
    kind?: 'one_way' | 'two_way';
}

/** Layout request payload — frontend → backend. */
export interface LayoutRequest {
    /** React Flow nodeOrigin. Default [0, 0] means node position is the top-left corner. */
    nodeOrigin?: [number, number];
    nodes: LayoutNode[];
    edges: LayoutEdge[];
}

/** Position of a single node as returned by the layout backend. */
export interface LayoutPosition {
    x: number;
    y: number;
}

/**
 * Bounding box of the laid-out graph.
 * Coordinates use the left-top corner of the bounding rect.
 */
export interface LayoutBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** Layout response payload — backend → frontend. */
export interface LayoutResponse {
    /** Keyed by node id. Nodes missing from the map keep their current position. */
    positions: Record<string, LayoutPosition>;
    /** If present the component will fitBounds to this rect after the first successful layout. */
    bounds?: LayoutBounds;
    /** Optional opaque hash; unused by the frontend but may be forwarded in future requests. */
    layoutHash?: string;
}

/**
 * The async layout function the host injects into RelationGraph.
 * The component never writes network calls or `invoke()` directly — it only calls this.
 */
export type LayoutFunction = (request: LayoutRequest) => Promise<LayoutResponse>;

// ─── Component input types ────────────────────────────────────────────────────

/** Node data provided by the host application. */
export interface RelationNodeInput {
    id: string;
    /** Displayed as the node label. Falls back to id when absent. */
    label?: string;
    [key: string]: unknown;
}

/** Edge data provided by the host application. */
export interface RelationEdgeInput {
    /** If omitted, an id is generated from source + target + index. */
    id?: string;
    source: string;
    target: string;
    /** Displayed as the edge label when present. */
    label?: string;
    /** 'one_way' (default) or 'two_way'. */
    kind?: 'one_way' | 'two_way';
    sourceHandle?: string;
    targetHandle?: string;
}

// ─── Layout state ─────────────────────────────────────────────────────────────

/** Current state of the layout lifecycle, exposed via onLayoutStateChange. */
export interface RelationLayoutState {
    /** True after the first successful layout has been applied. */
    layoutReady: boolean;
    /** True while a layout request is in-flight. */
    layoutLoading: boolean;
    /** Set when the most recent layout call threw or rejected. */
    layoutError: Error | null;
}
