// src/components/Relation/Relation.tsx
// @ts-nocheck
import React, { useEffect, useState, useCallback, useRef } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// 类型定义
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
}

// 节点颜色
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

// 连线颜色
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

// 节点图标
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

// 自定义节点组件
const CustomNode: FC<{ data: any }> = ({ data }) => {
    const isDark = data.theme === 'dark';
    const nodeColor = getNodeColor(data.type || 'default', isDark);

    return (
        <div
            style={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: `2px solid ${nodeColor}`,
                borderRadius: '12px',
                padding: '8px 12px',
                minWidth: '140px',
                cursor: 'pointer',
                boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = isDark ? '0 6px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)';
            }}
        >
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

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

// 自定义连线组件（带箭头和标签）
const SmartEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {}, markerEnd, data }: any) => {
    // 贝塞尔曲线路径
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const offsetX = dx * 0.2;
    const offsetY = dy * 0.2;
    const path = `M ${sourceX} ${sourceY} C ${sourceX + offsetX} ${sourceY + offsetY}, ${targetX - offsetX} ${targetY - offsetY}, ${targetX} ${targetY}`;

    // 标签位置（中点）
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    // 根据线条颜色设置标签背景
    const getLabelStyle = () => {
        if (style.stroke === '#ef4444') return { bg: '#fee2e2', color: '#dc2626' };
        if (style.stroke === '#10b981') return { bg: '#d1fae5', color: '#065f46' };
        return { bg: '#e2e8f0', color: '#475569' };
    };
    const labelStyle = getLabelStyle();

    return (
        <g>
            <path id={id} style={style} className="react-flow__edge-path" d={path} markerEnd={markerEnd} fill="none" />
            {data?.label && (
                <foreignObject x={midX - 30} y={midY - 10} width={60} height={20} style={{ overflow: 'visible' }}>
                    <div
                        style={{
                            background: labelStyle.bg,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '10px',
                            fontWeight: 500,
                            color: labelStyle.color,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                        }}
                    >
                        {data.label}
                    </div>
                </foreignObject>
            )}
        </g>
    );
};

const edgeTypes = { smart: SmartEdge };

// 计算树形布局（自动排列，避免重叠）
const calculateTreeLayout = (nodes: RelationNodeData[], edges: RelationEdgeData[]) => {
    if (nodes.length === 0) return [];

    // 构建父子关系
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    edges.forEach((edge) => {
        if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
        childrenMap.get(edge.source)!.push(edge.target);
        parentMap.set(edge.target, edge.source);
    });

    // 找根节点
    const roots = nodes.filter((n) => !parentMap.has(n.id));
    const actualRoots = roots.length > 0 ? roots : [nodes[0]];

    const positioned: any[] = [];
    const levelNodes = new Map<number, string[]>();

    // BFS 计算层级
    const queue: Array<{ id: string; level: number }> = actualRoots.map((r) => ({ id: r.id, level: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0) {
        const item = queue.shift()!;
        if (visited.has(item.id)) continue;
        visited.add(item.id);

        if (!levelNodes.has(item.level)) levelNodes.set(item.level, []);
        levelNodes.get(item.level)!.push(item.id);

        const children = childrenMap.get(item.id) || [];
        children.forEach((childId) => {
            if (!visited.has(childId)) {
                queue.push({ id: childId, level: item.level + 1 });
            }
        });
    }

    // 布局参数
    const startX = 50;
    const startY = 50;
    const levelHeight = 120;
    const nodeWidth = 180;
    const nodeGap = 30;

    // 为每层分配位置
    for (const [level, nodeIds] of levelNodes.entries()) {
        const totalWidth = nodeIds.length * nodeWidth + (nodeIds.length - 1) * nodeGap;
        let currentX = startX + (800 - totalWidth) / 2;

        nodeIds.forEach((nodeId, index) => {
            const node = nodes.find((n) => n.id === nodeId);
            if (node) {
                positioned.push({
                    ...node,
                    position: {
                        x: currentX + index * (nodeWidth + nodeGap),
                        y: startY + level * levelHeight,
                    },
                });
            }
        });
    }

    // 处理未被访问的节点（孤岛）
    const positionedIds = new Set(positioned.map((p) => p.id));
    const remaining = nodes.filter((n) => !positionedIds.has(n.id));
    remaining.forEach((node, idx) => {
        positioned.push({
            ...node,
            position: { x: 50 + (idx % 3) * 200, y: 500 + Math.floor(idx / 3) * 100 },
        });
    });

    return positioned;
};

// 主组件内容
const RelationContent: FC<RelationProps> = ({
                                                data,
                                                onNodeClick,
                                                onEdgeClick,
                                                theme = 'light',
                                                height = '600px',
                                                width = '100%',
                                                className = '',
                                                style = {},
                                            }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();
    const [isReady, setIsReady] = useState(false);
    const isInitialized = useRef(false);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f8fafc';

    // 初始化节点和边
    useEffect(() => {
        if (!data?.nodes?.length) {
            setNodes([]);
            setEdges([]);
            setIsReady(false);
            return;
        }

        const positionedNodes = calculateTreeLayout(data.nodes, data.edges);

        setNodes(
            positionedNodes.map((node) => ({
                id: node.id,
                type: 'custom',
                position: node.position,
                data: {
                    ...node,
                    theme,
                },
            }))
        );

        setEdges(
            data.edges.map((edge) => {
                const edgeColor = getEdgeColor(edge.type || 'neutral', isDark);
                return {
                    id: `${edge.source}-${edge.target}`,
                    source: edge.source,
                    target: edge.target,
                    type: 'smart',
                    label: edge.label,
                    data: { label: edge.label },
                    style: { stroke: edgeColor, strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: edgeColor },
                };
            })
        );

        setIsReady(true);
        isInitialized.current = false;
    }, [data, theme, setNodes, setEdges]);

    // 自动适配视图
    useEffect(() => {
        if (isReady && fitView && !isInitialized.current) {
            isInitialized.current = true;
            setTimeout(() => {
                fitView({ duration: 300, padding: 0.15 }).catch(() => {});
            }, 100);
        }
    }, [isReady, fitView]);

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: any) => {
            if (onNodeClick && node.data) {
                const { id, name, type, description, avatar, importance } = node.data;
                onNodeClick({ id, name, type, description, avatar, importance });
            }
        },
        [onNodeClick]
    );

    const handleEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: any) => {
            if (onEdgeClick && data?.edges) {
                const edgeData = data.edges.find((e) => `${e.source}-${e.target}` === edge.id);
                if (edgeData) onEdgeClick(edgeData);
            }
        },
        [onEdgeClick, data]
    );

    if (!data?.nodes?.length) {
        return (
            <div
                style={{
                    width,
                    height,
                    backgroundColor: bgColor,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#94a3b8' : '#64748b',
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
            className={`relation-container ${className}`}
            style={{ width, height, ...style, backgroundColor: bgColor, borderRadius: '12px', overflow: 'hidden' }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={false}
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

// 导出组件
const Relation: FC<RelationProps> = (props) => {
    return (
        <ReactFlowProvider>
            <RelationContent {...props} />
        </ReactFlowProvider>
    );
};

export { Relation };
export default Relation;