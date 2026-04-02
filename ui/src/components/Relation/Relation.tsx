// src/components/Relation/Relation.tsx
// @ts-nocheck
import React, { useEffect, useMemo } from 'react';
import type { CSSProperties, FC } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MarkerType,
    useReactFlow,
    ReactFlowProvider,
    Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export interface RelationNodeData {
    iconType?: 'war' | 'target' | 'star' | 'award' | 'flag' | 'default' | 'user' | 'shield';
    title: string;
    subtitle: string;
    description?: string;
    imageUrl?: string;
    status?: 'active' | 'inactive' | 'warning';
    metadata?: Record<string, any>;
}

export interface RelationProps {
    nodes?: any[];
    edges?: any[];
    onNodeClick?: (nodeId: string, nodeData: RelationNodeData) => void;
    onEdgeClick?: (edgeId: string, edgeData?: any) => void;
    theme?: 'dark' | 'light';
    height?: string | number;
    width?: string | number;
    fitView?: boolean;
    className?: string;
    style?: CSSProperties;
}

const getIconEmoji = (iconType?: string): string => {
    const map: Record<string, string> = {
        war: '⚔️',
        target: '🎯',
        star: '⭐',
        award: '🏆',
        flag: '🚩',
        default: '👥',
        user: '👤',
        shield: '🛡️',
    };
    return map[iconType || 'default'] || '👥';
};

const getStatusColor = (status?: string): string => {
    const map: Record<string, string> = {
        active: '#10b981',
        inactive: '#6b7280',
        warning: '#f59e0b',
    };
    return map[status || 'active'];
};

// 节点组件 - 无拖拽，纯展示
const CustomNode: FC<{ data: RelationNodeData & { theme?: 'dark' | 'light' } }> = ({ data, theme: propTheme }) => {
    const isDark = (data.theme || propTheme) === 'dark';

    const nodeStyle: CSSProperties = {
        background: isDark
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
        borderRadius: '12px',
        boxShadow: isDark
            ? '0 4px 12px rgba(0, 0, 0, 0.3)'
            : '0 4px 12px rgba(0, 0, 0, 0.08)',
        minWidth: '200px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    };

    const iconStyle: CSSProperties = {
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.04)',
    };

    const titleStyle: CSSProperties = {
        fontWeight: 600,
        fontSize: '14px',
        marginBottom: '4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: isDark ? '#ffffff' : '#1e293b',
    };

    const subtitleStyle: CSSProperties = {
        fontSize: '11px',
        fontWeight: 500,
        color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
    };

    const descriptionStyle: CSSProperties = {
        fontSize: '10px',
        marginTop: '6px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#94a3b8',
    };

    // 完全隐藏连接点
    const hiddenHandleStyle: CSSProperties = {
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none',
    };

    return (
        <div style={nodeStyle} className="relation-node">
            {/* 隐藏所有连接点 */}
            <Handle type="target" position={Position.Top} style={hiddenHandleStyle} />
            <Handle type="source" position={Position.Bottom} style={hiddenHandleStyle} />
            <Handle type="target" position={Position.Left} style={hiddenHandleStyle} />
            <Handle type="source" position={Position.Right} style={hiddenHandleStyle} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={iconStyle}>
                        {data.imageUrl ? (
                            <img
                                src={data.imageUrl}
                                alt={data.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                            />
                        ) : (
                            <span style={{ fontSize: '22px' }}>{getIconEmoji(data.iconType)}</span>
                        )}
                    </div>
                    {data.status && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            border: `2px solid ${isDark ? '#1e293b' : '#ffffff'}`,
                            backgroundColor: getStatusColor(data.status),
                        }} />
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={titleStyle}>{data.title}</div>
                    <div style={subtitleStyle}>{data.subtitle}</div>
                    {data.description && <div style={descriptionStyle}>{data.description}</div>}
                </div>
            </div>
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const RelationContent: FC<RelationProps> = ({
                                                nodes: propNodes,
                                                edges: propEdges,
                                                onNodeClick,
                                                onEdgeClick,
                                                fitView = true,
                                                className = '',
                                                style = {},
                                                height = '500px',
                                                width = '100%',
                                                theme: propTheme = 'light',
                                            }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(propNodes || []);
    const [edges, setEdges] = useEdgesState(propEdges || []);
    const { fitView: fitViewFn } = useReactFlow();

    const theme = propTheme;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f5f7fa';

    // 自动适应视图
    useEffect(() => {
        if (fitView && fitViewFn && (propNodes?.length || 0) > 0) {
            setTimeout(() => {
                fitViewFn({ duration: 300, padding: 0.1 }).catch(() => {});
            }, 100);
        }
    }, [fitView, fitViewFn, propNodes]);

    // 同步外部数据
    useEffect(() => {
        if (propNodes) setNodes(propNodes);
    }, [propNodes, setNodes]);

    useEffect(() => {
        if (propEdges) setEdges(propEdges);
    }, [propEdges, setEdges]);

    // 处理节点点击
    const handleNodeClick = (_event: React.MouseEvent, node: any) => {
        if (onNodeClick && node.data) {
            onNodeClick(node.id, node.data);
        }
    };

    // 处理连线点击
    const handleEdgeClick = (_event: React.MouseEvent, edge: any) => {
        if (onEdgeClick) {
            onEdgeClick(edge.id, edge.data);
        }
    };

    // 为节点注入主题
    const nodesWithTheme = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                theme: theme,
            },
        }));
    }, [nodes, theme]);

    // 为边添加样式 - 使用直线，确保不穿模
    const edgesWithStyle = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            type: 'straight',
            style: {
                stroke: isDark ? '#7c8ba0' : '#94a3b8',
                strokeWidth: 2,
            },
            labelStyle: {
                fill: isDark ? '#cbd5e1' : '#475569',
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: 'transparent',
            },
            labelBgStyle: {
                fill: 'transparent',
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isDark ? '#7c8ba0' : '#94a3b8',
                width: 12,
                height: 12,
            },
        }));
    }, [edges, isDark]);

    return (
        <div
            className={`relation-container ${className}`}
            style={{
                width,
                height,
                ...style,
                backgroundColor: bgColor,
                borderRadius: '12px',
                overflow: 'hidden',
            }}
        >
            <ReactFlow
                nodes={nodesWithTheme}
                edges={edgesWithStyle}
                onNodesChange={onNodesChange}
                onEdgesChange={setEdges}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                fitView={false}
                minZoom={0.3}
                maxZoom={2}
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                panOnScroll={false}
                panOnDrag={true}
                proOptions={{ hideAttribution: true }}
            >
                <Background color={isDark ? '#1e293b' : '#e2e8f0'} gap={20} />
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