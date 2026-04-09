// ui/src/components/RelationGraph/RelationGraph.tsx
// Public component.  Does NOT contain any layout algorithm or network call.
// Responsibilities:
//   - convert host-supplied node/edge data to React Flow's internal format
//   - detect bidirectional edge pairs for visual offset
//   - sync structural prop changes to React Flow state (preserving positions)
//   - delegate the entire layout lifecycle to useRelationLayout
//   - render loading / error overlays

import { useEffect, useRef } from 'react';
import {
    Background,
    BackgroundVariant,
    MarkerType,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    type Edge,
    type EdgeTypes,
    type Node,
    type NodeProps,
    type NodeTypes,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './RelationGraph.css';

import { useRelationLayout } from './useRelationLayout';
import { BidirectionalEdge } from './BidirectionalEdge';
import type {
    LayoutFunction,
    RelationEdgeInput,
    RelationLayoutState,
    RelationNodeInput,
} from './types';

// ─── Custom node ──────────────────────────────────────────────────────────────

interface RGNodeData extends Record<string, unknown> {
    label?: string;
}

function RelationNode({ data, selected }: NodeProps<Node<RGNodeData>>) {
    return (
        <div className={`fc-rg-node${selected ? ' fc-rg-node--selected' : ''}`}>
            {/* Handles on all four sides let React Flow pick the best routing */}
            <Handle type="target" position={Position.Top}    id="top"    />
            <Handle type="target" position={Position.Left}   id="left"   />
            <Handle type="source" position={Position.Bottom} id="bottom" />
            <Handle type="source" position={Position.Right}  id="right"  />
            <div className="fc-rg-node__label">{data.label ?? ''}</div>
        </div>
    );
}

const NODE_TYPES: NodeTypes = { relationNode: RelationNode as NodeTypes['relationNode'] };
const EDGE_TYPES: EdgeTypes = { relationEdge: BidirectionalEdge };

// ─── Edge builder ─────────────────────────────────────────────────────────────

function buildRFEdges(inputEdges: RelationEdgeInput[]): Edge[] {
    // Pre-build a lookup of all edge keys to detect bidirectional pairs in O(n)
    const edgeKeySet = new Set(inputEdges.map(e => `${e.source}|${e.target}`));

    return inputEdges.map((e, index) => {
        const reverseKey = `${e.target}|${e.source}`;
        const isBidirectional = edgeKeySet.has(reverseKey);

        return {
            id: e.id ?? `rg-edge-${e.source}-${e.target}-${index}`,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: 'relationEdge',
            // Arrow at the target end for directed edges
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 14,
                height: 14,
                color: 'var(--fc-rg-edge-color, var(--fc-gray-400))',
            },
            data: {
                label: e.label,
                kind: e.kind ?? 'one_way',
                bidirectional: isBidirectional,
            },
        };
    });
}

// ─── Node builder ─────────────────────────────────────────────────────────────

function buildRFNodes(
    inputNodes: RelationNodeInput[],
    prevNodes?: Node<RGNodeData>[],
): Node<RGNodeData>[] {
    const prevMap = new Map(prevNodes?.map(n => [n.id, n]) ?? []);

    return inputNodes.map(n => {
        const existing = prevMap.get(n.id);
        const node: Node<RGNodeData> = {
            id: n.id,
            type: 'relationNode',
            // Preserve the last known position; new nodes start at the origin
            position: existing?.position ?? { x: 0, y: 0 },
            data: { label: n.label ?? n.id, ...n } as RGNodeData,
        };
        // Preserve measured dimensions so existing nodes are not re-measured
        if (existing?.measured) {
            node.measured = existing.measured;
        }
        return node;
    });
}

// ─── Inner component (must live inside ReactFlowProvider) ─────────────────────

interface RelationGraphInnerProps {
    inputNodes: RelationNodeInput[];
    inputEdges: RelationEdgeInput[];
    layoutFn: LayoutFunction;
    nodeOrigin: [number, number];
    fitPadding: number;
    fitDuration: number;
    onLayoutStateChange?: (state: RelationLayoutState) => void;
}

function RelationGraphInner({
    inputNodes,
    inputEdges,
    layoutFn,
    nodeOrigin,
    fitPadding,
    fitDuration,
    onLayoutStateChange,
}: RelationGraphInnerProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<RGNodeData>>(
        buildRFNodes(inputNodes),
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
        buildRFEdges(inputEdges),
    );

    // Track the last-seen prop references so we only sync on actual changes
    const prevInputRef = useRef({ nodes: inputNodes, edges: inputEdges });

    useEffect(() => {
        const prev = prevInputRef.current;
        if (inputNodes === prev.nodes && inputEdges === prev.edges) return;
        prevInputRef.current = { nodes: inputNodes, edges: inputEdges };

        // Update node structure, preserving existing positions and measured dimensions
        setNodes(prev => buildRFNodes(inputNodes, prev));
        setEdges(buildRFEdges(inputEdges));
    }, [inputNodes, inputEdges, setNodes, setEdges]);

    const layoutState = useRelationLayout({
        nodes,
        edges,
        layoutFn,
        nodeOrigin,
        fitPadding,
        fitDuration,
    });

    // Forward layout state to the host when it changes
    const prevStateRef = useRef<RelationLayoutState>({
        layoutReady: false,
        layoutLoading: false,
        layoutError: null,
    });
    useEffect(() => {
        const p = prevStateRef.current;
        if (
            p.layoutReady   !== layoutState.layoutReady   ||
            p.layoutLoading !== layoutState.layoutLoading ||
            p.layoutError   !== layoutState.layoutError
        ) {
            prevStateRef.current = layoutState;
            onLayoutStateChange?.(layoutState);
        }
    }, [layoutState, onLayoutStateChange]);

    return (
        <div className="fc-rg__canvas">
            {/* Loading overlay — shown while a layout request is in-flight */}
            {layoutState.layoutLoading && (
                <div className="fc-rg__overlay fc-rg__overlay--loading" role="status">
                    <span className="fc-rg__spinner" aria-hidden="true" />
                    <span>布局计算中…</span>
                </div>
            )}

            {/* Error overlay — shown only when not loading */}
            {layoutState.layoutError && !layoutState.layoutLoading && (
                <div className="fc-rg__overlay fc-rg__overlay--error" role="alert">
                    <span>布局失败：{layoutState.layoutError.message}</span>
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={NODE_TYPES}
                edgeTypes={EDGE_TYPES}
                nodeOrigin={nodeOrigin}
                fitView={false}
                minZoom={0.05}
                maxZoom={4}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            </ReactFlow>
        </div>
    );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface RelationGraphProps {
    /** Nodes to render. Memoize or keep stable to avoid redundant layout calls. */
    nodes: RelationNodeInput[];
    /** Edges to render. Memoize or keep stable to avoid redundant layout calls. */
    edges: RelationEdgeInput[];
    /**
     * Async layout function provided by the host.
     * Receives a LayoutRequest; must resolve with a LayoutResponse.
     * The component never calls `invoke`, `fetch`, or any backend API directly.
     */
    layoutFn: LayoutFunction;
    /** React Flow nodeOrigin — [0,0] means positions refer to the node's top-left corner. */
    nodeOrigin?: [number, number];
    /**
     * Padding passed to fitBounds as a fraction of the viewport (0–1).
     * Default 0.1 (10 %).
     */
    fitPadding?: number;
    /** Duration in ms for the fitBounds animation. Default 500. */
    fitDuration?: number;
    /** Called each time layoutReady / layoutLoading / layoutError changes. */
    onLayoutStateChange?: (state: RelationLayoutState) => void;
    /** Container height. Must be a finite value for React Flow to render. Default '100%'. */
    height?: string | number;
    /** Container width. Default '100%'. */
    width?: string | number;
    className?: string;
    style?: React.CSSProperties;
}

export function RelationGraph({
    nodes,
    edges,
    layoutFn,
    nodeOrigin = [0, 0],
    fitPadding = 0.1,
    fitDuration = 500,
    onLayoutStateChange,
    height = '100%',
    width = '100%',
    className,
    style,
}: RelationGraphProps) {
    return (
        <div
            className={`fc-rg${className ? ` ${className}` : ''}`}
            style={{ width, height, ...style }}
        >
            <ReactFlowProvider>
                <RelationGraphInner
                    inputNodes={nodes}
                    inputEdges={edges}
                    layoutFn={layoutFn}
                    nodeOrigin={nodeOrigin}
                    fitPadding={fitPadding}
                    fitDuration={fitDuration}
                    onLayoutStateChange={onLayoutStateChange}
                />
            </ReactFlowProvider>
        </div>
    );
}
