// ui/src/components/RelationGraph/RelationGraph.tsx

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
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

// ─── renderNode context ───────────────────────────────────────────────────────
// Stored at module level so NODE_TYPES never changes reference — prevents
// React Flow from unmounting/remounting all nodes when the prop updates.

type RenderNodeFn = (data: RelationNodeInput, selected: boolean) => ReactNode;

const RenderNodeCtx = createContext<RenderNodeFn | undefined>(undefined);

// ─── Node component ───────────────────────────────────────────────────────────

interface RGNodeData extends Record<string, unknown> {
    label?: string;
}

function RelationNode({ data, selected }: NodeProps<Node<RGNodeData>>) {
    const renderNode = useContext(RenderNodeCtx);
    const isCustom = renderNode !== undefined;

    return (
        <div
            className={[
                'fc-rg-node',
                isCustom          ? 'fc-rg-node--custom'   : '',
                selected && !isCustom ? 'fc-rg-node--selected' : '',
            ].filter(Boolean).join(' ')}
        >
            {/* Ghost handles: zero-size, invisible — actual edge coordinates are
                computed by the floating-edge algorithm in BidirectionalEdge. */}
            <Handle type="target" position={Position.Top}    id="t" className="fc-rg-handle--ghost" />
            <Handle type="source" position={Position.Bottom} id="s" className="fc-rg-handle--ghost" />

            {isCustom
                ? renderNode(data as RelationNodeInput, selected ?? false)
                : <div className="fc-rg-node__label">{data.label ?? ''}</div>
            }
        </div>
    );
}

const NODE_TYPES: NodeTypes = { relationNode: RelationNode as NodeTypes['relationNode'] };
const EDGE_TYPES: EdgeTypes = { relationEdge: BidirectionalEdge };

// ─── Edge / node builders ─────────────────────────────────────────────────────

function buildRFEdges(inputEdges: RelationEdgeInput[]): Edge[] {
    const edgeKeySet = new Set(inputEdges.map(e => `${e.source}|${e.target}`));

    return inputEdges.map((e, index) => ({
        id: e.id ?? `rg-edge-${e.source}-${e.target}-${index}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: 'relationEdge',
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: 'var(--fc-rg-edge-color, var(--fc-gray-400))',
        },
        data: {
            label: e.label,
            kind: e.kind ?? 'one_way',
            bidirectional: edgeKeySet.has(`${e.target}|${e.source}`),
        },
    }));
}

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
            position: existing?.position ?? { x: 0, y: 0 },
            data: { label: n.label ?? n.id, ...n } as RGNodeData,
        };
        if (existing?.measured) node.measured = existing.measured;
        return node;
    });
}

// ─── Inner component ──────────────────────────────────────────────────────────

interface RelationGraphInnerProps {
    inputNodes: RelationNodeInput[];
    inputEdges: RelationEdgeInput[];
    layoutFn: LayoutFunction;
    nodeOrigin: [number, number];
    fitPadding: number;
    fitDuration: number;
    renderNode?: RenderNodeFn;
    onLayoutStateChange?: (state: RelationLayoutState) => void;
}

function RelationGraphInner({
    inputNodes,
    inputEdges,
    layoutFn,
    nodeOrigin,
    fitPadding,
    fitDuration,
    renderNode,
    onLayoutStateChange,
}: RelationGraphInnerProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node<RGNodeData>>(
        buildRFNodes(inputNodes),
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
        buildRFEdges(inputEdges),
    );

    const prevInputRef = useRef({ nodes: inputNodes, edges: inputEdges });
    useEffect(() => {
        const prev = prevInputRef.current;
        if (inputNodes === prev.nodes && inputEdges === prev.edges) return;
        prevInputRef.current = { nodes: inputNodes, edges: inputEdges };
        setNodes(prev => buildRFNodes(inputNodes, prev));
        setEdges(buildRFEdges(inputEdges));
    }, [inputNodes, inputEdges, setNodes, setEdges]);

    const layoutState = useRelationLayout({ nodes, edges, layoutFn, nodeOrigin, fitPadding, fitDuration });

    const prevStateRef = useRef<RelationLayoutState>({ layoutReady: false, layoutLoading: false, layoutError: null });
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
        <RenderNodeCtx.Provider value={renderNode}>
            <div className="fc-rg__canvas">
                {layoutState.layoutLoading && (
                    <div className="fc-rg__overlay fc-rg__overlay--loading" role="status">
                        <span className="fc-rg__spinner" aria-hidden="true" />
                        <span>布局计算中…</span>
                    </div>
                )}
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
                    proOptions={{ hideAttribution: true }}
                >
                    <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                </ReactFlow>
            </div>
        </RenderNodeCtx.Provider>
    );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface RelationGraphProps {
    nodes: RelationNodeInput[];
    edges: RelationEdgeInput[];
    layoutFn: LayoutFunction;
    /**
     * 自定义节点内容渲染函数。
     * 接收节点原始数据和选中状态，返回 ReactNode 作为节点的完整视觉内容。
     * 传入后组件不渲染任何默认样式，由调用方全权控制外观。
     *
     * @example
     * renderNode={(data, selected) => (
     *   <div className={selected ? 'my-node selected' : 'my-node'}>
     *     <img src={data.cover} />
     *     <span>{data.title}</span>
     *   </div>
     * )}
     */
    renderNode?: (data: RelationNodeInput, selected: boolean) => ReactNode;
    nodeOrigin?: [number, number];
    /** fitBounds 视口边距（0–1），默认 0.1 */
    fitPadding?: number;
    /** fitBounds 动画时长（ms），默认 500 */
    fitDuration?: number;
    onLayoutStateChange?: (state: RelationLayoutState) => void;
    height?: string | number;
    width?: string | number;
    className?: string;
    style?: React.CSSProperties;
}

export function RelationGraph({
    nodes,
    edges,
    layoutFn,
    renderNode,
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
                    renderNode={renderNode}
                    nodeOrigin={nodeOrigin}
                    fitPadding={fitPadding}
                    fitDuration={fitDuration}
                    onLayoutStateChange={onLayoutStateChange}
                />
            </ReactFlowProvider>
        </div>
    );
}
