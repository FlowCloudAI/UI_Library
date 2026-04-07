// src/components/Relation/Relation.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    MarkerType,
    useReactFlow,
    ReactFlowProvider,
    Background,
    Position,
    Handle,
    Edge,
    Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './Relation.css';
import { useForceLayout, ForceNode, ForceEdge } from '../../hooks/useForceLayout';

// ==================== 类型定义 ====================
export interface RelationNodeData {
    id: string;
    name: string;
    type?: 'person' | 'organization' | 'event' | 'location' | 'concept';
    description?: string;
    avatar?: string;
    importance?: number;
}

export interface RelationEdgeData {
    source: string;
    target: string;
    label?: string;
    type?: 'friend' | 'enemy' | 'subordinate' | 'superior' | 'neutral';
    strength?: number;
}

export interface RelationProps {
    data?: {
        nodes: RelationNodeData[];
        edges: RelationEdgeData[];
    };
    onNodeClick?: (node: RelationNodeData) => void;
    onEdgeClick?: (edge: RelationEdgeData) => void;
    theme?: 'dark' | 'light';
    height?: string | number;
    width?: string | number;
    className?: string;
    style?: React.CSSProperties;
    enableRefresh?: boolean;
    autoFitContainer?: boolean;
}

type FlowNodeData = RelationNodeData & { theme: 'light' | 'dark' };

// ==================== 工具函数 ====================

const getNodeColor = (type: string, isDark: boolean): string => {
    const colors: Record<string, string> = {
        person: isDark ? '#60a5fa' : '#3b82f6',
        organization: isDark ? '#34d399' : '#10b981',
        event: isDark ? '#f472b6' : '#ec4899',
        location: isDark ? '#fb923c' : '#f97316',
        concept: isDark ? '#a78bfa' : '#8b5cf6',
        default: isDark ? '#94a3b8' : '#64748b',
    };
    return colors[type] || colors.default;
};

const getEdgeColor = (type: string, isDark: boolean): string => {
    const colors: Record<string, string> = {
        friend: isDark ? '#34d399' : '#10b981',
        enemy: isDark ? '#f87171' : '#ef4444',
        subordinate: isDark ? '#60a5fa' : '#3b82f6',
        superior: isDark ? '#a78bfa' : '#8b5cf6',
        neutral: isDark ? '#94a3b8' : '#64748b',
        default: isDark ? '#94a3b8' : '#64748b',
    };
    return colors[type] || colors.default;
};

const getIconForType = (type: string): string => {
    const icons: Record<string, string> = {
        person: '👤',
        organization: '🏢',
        event: '📅',
        location: '📍',
        concept: '💡',
        default: '🔗',
    };
    return icons[type] || icons.default;
};

// ==================== 自定义节点组件 ====================
const CustomNode: FC<{ data: FlowNodeData; id: string }> = ({ data }) => {
    const isDark = data.theme === 'dark';
    const nodeColor = getNodeColor(data.type || 'default', isDark);

    return (
        <div
            className="relation-node"
            style={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: `2px solid ${nodeColor}`,
                borderRadius: '12px',
                padding: '8px 12px',
                minWidth: '140px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
            }}
        >
            <Handle type="source" position={Position.Right} id="s" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Left} id="t" style={{ opacity: 0 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${nodeColor}20, ${nodeColor}40)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                    }}
                >
                    {getIconForType(data.type || 'default')}
                </div>
                <div>
                    <div
                        style={{
                            fontWeight: 600,
                            fontSize: '12px',
                            color: isDark ? '#ffffff' : '#1e293b',
                        }}
                    >
                        {data.name}
                    </div>
                    {data.description && (
                        <div
                            style={{
                                fontSize: '10px',
                                color: isDark ? '#94a3b8' : '#64748b',
                                marginTop: '2px',
                            }}
                        >
                            {data.description}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const nodeTypes = { custom: CustomNode };

// ==================== 主组件内容 ====================
const RelationContent: FC<RelationProps> = ({
    data,
    onNodeClick,
    onEdgeClick,
    theme = 'light',
    height = '100%',
    width = '100%',
    className = '',
    style = {},
    enableRefresh = true,
    autoFitContainer = true,
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const { fitView } = useReactFlow();
    const { calculateLayout, stopSimulation } = useForceLayout();
    const containerRef = useRef<HTMLDivElement>(null);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f8fafc';

    // Refs so performLayout doesn't close over theme — avoids re-running layout on theme change
    const themeRef = useRef(theme);
    const isDarkRef = useRef(isDark);
    useEffect(() => {
        themeRef.current = theme;
        isDarkRef.current = isDark;
    }, [theme, isDark]);

    // fitViewDone guards against calling fitView on every node update (e.g. theme changes)
    const fitViewDone = useRef(false);

    const getContainerSize = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        return {
            width: rect?.width || 1200,
            height: rect?.height || 800,
        };
    }, []);

    const performLayout = useCallback(() => {
        if (!data?.nodes?.length || !containerRef.current) return;

        const { width: containerWidth, height: containerHeight } = getContainerSize();

        const forceNodes: ForceNode[] = data.nodes.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
            description: node.description,
            importance: node.importance,
        }));

        const forceEdges: ForceEdge[] = data.edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: edge.type,
            strength: edge.strength,
        }));

        const rawPositions = calculateLayout(forceNodes, forceEdges, {
            width: containerWidth,
            height: containerHeight,
        });

        // 直接使用 D3 原始坐标，保留 forceCollide 建立的间距
        // 视口居中/缩放由 fitView 处理，不再对节点坐标做压缩
        const positionMap = new Map(rawPositions.map((p) => [p.id, p]));

        const newNodes: Node[] = data.nodes.map((node) => {
            const pos = positionMap.get(node.id);
            return {
                id: node.id,
                type: 'custom',
                position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
                data: { ...node, theme: themeRef.current } as unknown as Record<string, unknown>,
            };
        });

        const newEdges: Edge[] = data.edges.map((edge, index) => {
            const edgeId = `${edge.source}-${edge.target}-${index}`;
            const edgeColor = getEdgeColor(edge.type || 'neutral', isDarkRef.current);
            return {
                id: edgeId,
                source: edge.source,
                target: edge.target,
                type: 'smoothstep',
                label: edge.label,
                data: { relEdge: edge },
                style: { stroke: edgeColor, strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 12,
                    height: 12,
                    color: edgeColor,
                },
            };
        });

        // Reset guard so fitView fires after this layout
        fitViewDone.current = false;
        setNodes(newNodes);
        setEdges(newEdges);
    }, [data, getContainerSize, calculateLayout, setNodes, setEdges]);

    // Layout effect: re-runs only when data changes
    useEffect(() => {
        if (!data?.nodes?.length) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const timer = setTimeout(() => {
            performLayout();
        }, 50);

        return () => {
            clearTimeout(timer);
            stopSimulation();
        };
    }, [data, performLayout, stopSimulation, setNodes, setEdges]);

    // Theme-only effect: update colors in existing nodes/edges without recalculating positions
    useEffect(() => {
        const isDarkNow = theme === 'dark';
        setNodes((prev) =>
            prev.map((n) => ({
                ...n,
                data: { ...n.data, theme },
            }))
        );
        setEdges((prev) =>
            prev.map((e) => {
                const relEdge = e.data?.relEdge as RelationEdgeData | undefined;
                const edgeColor = getEdgeColor(relEdge?.type || 'neutral', isDarkNow);
                return {
                    ...e,
                    style: { stroke: edgeColor, strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 12,
                        height: 12,
                        color: edgeColor,
                    },
                };
            })
        );
    }, [theme, setNodes, setEdges]);

    // fitView once after layout; theme updates set fitViewDone=true so this is skipped
    useEffect(() => {
        if (nodes.length > 0 && !fitViewDone.current && fitView) {
            fitViewDone.current = true;
            setTimeout(() => {
                fitView({ duration: 300, padding: 0.3 }).catch(() => {});
            }, 150);
        }
    }, [nodes, fitView]);

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (onNodeClick && node.data) {
                const { theme: _t, ...nodeData } = node.data as unknown as FlowNodeData;
                onNodeClick(nodeData);
            }
        },
        [onNodeClick]
    );

    const handleEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: Edge) => {
            if (onEdgeClick && edge.data?.relEdge) {
                onEdgeClick(edge.data.relEdge as RelationEdgeData);
            }
        },
        [onEdgeClick]
    );

    if (!data?.nodes?.length) {
        return (
            <div
                style={{
                    width: autoFitContainer ? '100%' : width,
                    height: autoFitContainer ? '100%' : height,
                    backgroundColor: bgColor,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#94a3b8' : '#64748b',
                    border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <div>暂无关系数据</div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relation-container ${className}`}
            style={{
                width: autoFitContainer ? '100%' : width,
                height: autoFitContainer ? '100%' : height,
                ...style,
                backgroundColor: bgColor,
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                boxSizing: 'border-box',
            }}
        >
            {enableRefresh && (
                <button
                    onClick={performLayout}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        background: isDark ? '#334155' : '#ffffff',
                        border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <span>🔄</span>
                    <span>重新布局</span>
                </button>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                nodesDraggable={true}
                nodesConnectable={false}
                fitView={false}
                minZoom={0.3}
                maxZoom={2}
                zoomOnScroll={true}
                panOnDrag={true}
                proOptions={{ hideAttribution: true }}
            >
                <Background color={isDark ? '#1e293b' : '#e2e8f0'} gap={20} size={1} />
            </ReactFlow>
        </div>
    );
};

const Relation: FC<RelationProps> = (props) => {
    return (
        <ReactFlowProvider>
            <RelationContent {...props} />
        </ReactFlowProvider>
    );
};

export { Relation };
export default Relation;
