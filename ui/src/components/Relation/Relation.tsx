// src/components/Relation/Relation.tsx
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
    Edge,
    Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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

/**
 * P0修复：布局结果归一化与缩放
 * - 平移到正坐标
 * - 缩放到画布80%
 * - 限制最大缩放1.5倍，避免过度放大
 */
const normalizeLayoutPositions = (
    positions: Array<{ id: string; x: number; y: number }>,
    containerWidth: number,
    containerHeight: number
): Array<{ id: string; x: number; y: number }> => {
    if (positions.length === 0) return [];

    // 计算边界
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    positions.forEach((pos) => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x);
        maxY = Math.max(maxY, pos.y);
    });

    const layoutWidth = maxX - minX || 1;
    const layoutHeight = maxY - minY || 1;

    // P0修复：计算缩放因子，限制最大值1.5
    let scale = Math.min(
        (containerWidth * 0.8) / layoutWidth,
        (containerHeight * 0.8) / layoutHeight
    );
    scale = Math.min(scale, 1.5); // 限制最大缩放

    // 计算偏移量使布局居中
    const offsetX = (containerWidth - layoutWidth * scale) / 2 - minX * scale;
    const offsetY = (containerHeight - layoutHeight * scale) / 2 - minY * scale;

    return positions.map((pos) => ({
        id: pos.id,
        x: pos.x * scale + offsetX,
        y: pos.y * scale + offsetY,
    }));
};

// ==================== 自定义节点组件 ====================
const CustomNode: FC<{ data: any; id: string }> = ({ data }) => {
    const isDark = data.theme === 'dark';
    const nodeColor = getNodeColor(data.type || 'default', isDark);

    return (
        <div
            className="react-flow__node-custom"
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
            {/* P1修复：为每个 Handle 分配唯一 id */}
            <Handle type="source" position={Position.Top} id="source-top" style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Right} id="source-right" style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Bottom} id="source-bottom" style={{ opacity: 0 }} />
            <Handle type="source" position={Position.Left} id="source-left" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Top} id="target-top" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Right} id="target-right" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Bottom} id="target-bottom" style={{ opacity: 0 }} />
            <Handle type="target" position={Position.Left} id="target-left" style={{ opacity: 0 }} />
            
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
    height = '100vh',
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
    const [isReady, setIsReady] = useState(false);
    const isInitialized = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f8fafc';

    /**
     * P0修复：获取容器实际尺寸
     * 使用 getBoundingClientRect() 而非 parseInt 解析 CSS 字符串
     */
    const getContainerSize = useCallback(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        return {
            width: rect?.width || 1200,
            height: rect?.height || 800,
        };
    }, []);

    /**
     * P0修复：执行布局计算
     * 1. 使用真实容器尺寸
     * 2. 力导向参数已优化（斥力-700，距离180，碰撞75）
     * 3. 归一化时限制缩放≤1.5
     */
    const performLayout = useCallback(() => {
        if (!data?.nodes?.length || !containerRef.current) return;

        // P0修复：获取真实容器尺寸
        const { width: containerWidth, height: containerHeight } = getContainerSize();

        // 准备力导向布局数据
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

        // P0修复：传递真实容器尺寸给力导向布局
        const rawPositions = calculateLayout(forceNodes, forceEdges, {
            width: containerWidth,
            height: containerHeight,
        });

        // P0修复：归一化并限制缩放
        const normalizedPositions = normalizeLayoutPositions(rawPositions, containerWidth, containerHeight);

        // 创建位置映射
        const positionMap = new Map(normalizedPositions.map((p) => [p.id, p]));

        // 构建节点
        const newNodes = data.nodes.map((node) => {
            const pos = positionMap.get(node.id);
            return {
                id: node.id,
                type: 'custom',
                position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
                data: {
                    ...node,
                    theme,
                },
            };
        });
        
        setNodes(newNodes);

        // P1修复：使用 smoothstep 边类型，删除 offset（smoothstep不支持）
        const newEdges = data.edges.map((edge) => {
            const edgeId = `${edge.source}-${edge.target}`;
            const edgeColor = getEdgeColor(edge.type || 'neutral', isDark);
            
            return {
                id: edgeId,
                source: edge.source,
                target: edge.target,
                type: 'smoothstep', // P1修复：使用内置类型
                label: edge.label,
                data: { label: edge.label },
                style: { 
                    stroke: edgeColor, 
                    strokeWidth: 2,
                },
                markerEnd: { 
                    type: MarkerType.ArrowClosed, 
                    width: 12, 
                    height: 12, 
                    color: edgeColor 
                },
            };
        });
        
        setEdges(newEdges);

        setIsReady(true);
        isInitialized.current = false;
    }, [data, theme, isDark, getContainerSize, calculateLayout, setNodes, setEdges]);

    // 初始化时执行布局
    useEffect(() => {
        if (!data?.nodes?.length) {
            setNodes([]);
            setEdges([]);
            setIsReady(false);
            return;
        }

        // 延迟执行，确保容器已渲染
        const timer = setTimeout(() => {
            performLayout();
        }, 50);

        return () => {
            clearTimeout(timer);
            stopSimulation();
        };
    }, [data, performLayout, stopSimulation, setNodes, setEdges]);

    // P0修复：调整 fitView 参数，增大 padding 避免压缩
    useEffect(() => {
        if (isReady && fitView && !isInitialized.current) {
            isInitialized.current = true;
            setTimeout(() => {
                fitView({ duration: 300, padding: 0.3 }).catch(() => {});
            }, 150);
        }
    }, [isReady, fitView]);

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (onNodeClick && node.data) {
                const nodeData = node.data as any as RelationNodeData;
                onNodeClick({ 
                    id: nodeData.id, 
                    name: nodeData.name, 
                    type: nodeData.type, 
                    description: nodeData.description, 
                    avatar: nodeData.avatar, 
                    importance: nodeData.importance 
                });
            }
        },
        [onNodeClick]
    );

    const handleEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: Edge) => {
            if (onEdgeClick && data?.edges) {
                const edgeData = data.edges.find((e) => `${e.source}-${e.target}` === edge.id);
                if (edgeData) onEdgeClick(edgeData);
            }
        },
        [onEdgeClick, data]
    );

    // 空数据状态
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
                    boxSizing: 'border-box'
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
                boxSizing: 'border-box'
            }}
        >
            {/* 刷新按钮 */}
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
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? '#475569' : '#f1f5f9';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDark ? '#334155' : '#ffffff';
                        e.currentTarget.style.transform = 'scale(1)';
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
