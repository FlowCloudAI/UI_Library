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

} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useForceLayout, ForceNode, ForceEdge } from '../../hooks/useForceLayout';

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
    enableRefresh?: boolean; // 是否显示刷新按钮
    autoFitContainer?: boolean; // 是否自动适应容器大小
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
            {/* 移除固定 Handle，让 React Flow 自动计算最优连接点 */}
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

// 主组件内容
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
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { fitView } = useReactFlow();
    const { calculateLayout, stopSimulation } = useForceLayout();
    const [isReady, setIsReady] = useState(false);
    const isInitialized = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f8fafc';

    // 解析高度和宽度为数值（用于布局计算）
    const parseDimension = (dim: string | number, defaultVal: number): number => {
        if (typeof dim === 'number') return dim;
        const parsed = parseInt(dim, 10);
        return isNaN(parsed) ? defaultVal : parsed;
    };

    /**
     * 执行布局计算
     */
    const performLayout = useCallback(() => {
        if (!data?.nodes?.length || !containerRef.current) return;

        const containerWidth = parseDimension(width, 1000);
        const containerHeight = parseDimension(height, 800);

        // 准备力导向布局的节点和边数据
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

        // 计算力导向布局
        const positions = calculateLayout(forceNodes, forceEdges, {
            width: containerWidth,
            height: containerHeight,
        });

        // 创建位置映射
        const positionMap = new Map(positions.map((p) => [p.id, p]));

        // 更新 React Flow 节点
        setNodes(
            data.nodes.map((node) => {
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
            })
        );

        // 检测双向边
        const edgeMap = new Map<string, RelationEdgeData>();
        data.edges.forEach((edge) => {
            const key = `${edge.source}-${edge.target}`;
            edgeMap.set(key, edge);
        });
        
        // 更新边，使用智能连接点
        setEdges(
            data.edges.map((edge) => {
                const edgeColor = getEdgeColor(edge.type || 'neutral', isDark);
                const reverseKey = `${edge.target}-${edge.source}`;
                        
                // 检测是否为双向边（用于后续可能的样式区分）
                edgeMap.has(reverseKey);
                return {
                    id: `${edge.source}-${edge.target}`,
                    source: edge.source,
                    target: edge.target,
                    // 不指定 type，直接使用 React Flow 默认的 'default' 类型
                    label: edge.label,
                    style: { stroke: edgeColor, strokeWidth: 2 },
                    // 确保 markerEnd 是最简化的标准对象
                    markerEnd: {
                        type: MarkerType.Arrow,
                        color: edgeColor,
                    },
                };
            })
        );

        setIsReady(true);
        isInitialized.current = false;
    }, [data, theme, isDark, width, height, calculateLayout, setNodes, setEdges]);

    // 初始化时执行布局
    useEffect(() => {
        if (!data?.nodes?.length) {
            setNodes([]);
            setEdges([]);
            setIsReady(false);
            return;
        }

        performLayout();

        return () => {
            stopSimulation();
        };
    }, [data, performLayout, stopSimulation, setNodes, setEdges]);

    // 自动适配视图
    useEffect(() => {
        if (isReady && fitView && !isInitialized.current) {
            isInitialized.current = true;
            setTimeout(() => {
                fitView({ duration: 300, padding: 0.2 }).catch(() => {});
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