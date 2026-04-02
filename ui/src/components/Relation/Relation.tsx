// src/components/Relation/Relation.tsx
// @ts-nocheck
import React, { useCallback, useEffect, useMemo } from 'react';
import type { CSSProperties, FC } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    addEdge,
    Handle,
    Position,
    MarkerType,
    ConnectionLineType,
    useReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
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

export interface RelationEdgeData {
    label?: string;
    type?: 'solid' | 'dashed' | 'dotted';
    color?: string;
    animated?: boolean;
    metadata?: Record<string, any>;
}

export interface RelationProps {
    nodes?: any[];
    edges?: any[];
    onNodeClick?: (nodeId: string, nodeData: RelationNodeData, event?: React.MouseEvent) => void;
    onNodeDoubleClick?: (nodeId: string, nodeData: RelationNodeData) => void;
    onEdgeClick?: (edgeId: string, edgeData?: RelationEdgeData) => void;
    onConnect?: (connection: any) => void;
    onNodesChange?: (nodes: any[]) => void;
    onEdgesChange?: (edges: any[]) => void;
    fitView?: boolean;
    fitViewOptions?: any;
    className?: string;
    style?: CSSProperties;
    height?: string | number;
    width?: string | number;
    defaultViewport?: { x: number; y: number; zoom: number };
    minZoom?: number;
    maxZoom?: number;
    snapToGrid?: boolean;
    snapGrid?: [number, number];
    enableEdgeCreation?: boolean;
    enableNodeDrag?: boolean;
    onNodeContextMenu?: (nodeId: string, nodeData: RelationNodeData) => void;
    theme?: 'dark' | 'light';
    edgeStyles?: {
        defaultColor?: string;
        hoverColor?: string;
        selectedColor?: string;
    };
    nodeStyles?: {
        borderRadius?: string;
        minWidth?: string;
    };
    showHandles?: boolean;
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

// 简单节点组件
const CustomNode: FC<{ data: RelationNodeData & { theme?: 'dark' | 'light'; showHandles?: boolean }; theme?: 'dark' | 'light' }> = ({ data, theme: propTheme }) => {
    const isDark = (data.theme || propTheme) === 'dark';
    const showHandles = data.showHandles === true;

    const nodeStyle: CSSProperties = {
        background: isDark
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
        borderRadius: '12px',
        boxShadow: isDark
            ? '0 2px 8px rgba(0, 0, 0, 0.2)'
            : '0 2px 8px rgba(0, 0, 0, 0.05)',
        minWidth: '220px',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease',
    };

    const iconStyle: CSSProperties = {
        width: '48px',
        height: '48px',
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

    // 连接点样式 - 默认隐藏
    const handleStyle: CSSProperties = showHandles ? {
        background: isDark ? '#ff8e8e' : '#ff6b6b',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
    } : {
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none',
    };

    return (
        <div style={nodeStyle} className="relation-node">
            {/* 四个方向的连接点 */}
            <Handle type="target" position={Position.Top} style={handleStyle} />
            <Handle type="source" position={Position.Bottom} style={handleStyle} />
            <Handle type="target" position={Position.Left} style={handleStyle} />
            <Handle type="source" position={Position.Right} style={handleStyle} />

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
                            <span style={{ fontSize: '24px' }}>{getIconEmoji(data.iconType)}</span>
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
                                                onNodeDoubleClick,
                                                onEdgeClick,
                                                onConnect: onConnectProp,
                                                onNodesChange: onNodesChangeProp,
                                                onEdgesChange: onEdgesChangeProp,
                                                fitView = true,
                                                fitViewOptions,
                                                className = '',
                                                style = {},
                                                height = '70vh',
                                                width = '100%',
                                                defaultViewport = { x: 0, y: 0, zoom: 1 },
                                                minZoom = 0.5,
                                                maxZoom = 2,
                                                snapToGrid = false,
                                                snapGrid = [15, 15],
                                                enableEdgeCreation = true,
                                                enableNodeDrag = true,
                                                onNodeContextMenu,
                                                theme: propTheme = 'light',
                                                edgeStyles = {},
                                                nodeStyles = {},
                                                showHandles = false,
                                            }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(propNodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(propEdges || []);
    const { fitView: fitViewFn } = useReactFlow();

    const theme = propTheme;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f5f7fa';

    // 自动适应视图
    useEffect(() => {
        if (fitView && fitViewFn && (propNodes?.length || 0) > 0) {
            const timer = setTimeout(() => {
                fitViewFn({ duration: 200, padding: 0.2, ...fitViewOptions }).catch((error: Error) => {
                    console.warn('Fit view failed:', error);
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [fitView, fitViewFn, fitViewOptions, propNodes]);

    // 同步外部节点变化
    useEffect(() => {
        if (propNodes) {
            setNodes(propNodes);
        }
    }, [propNodes, setNodes]);

    // 同步外部边变化
    useEffect(() => {
        if (propEdges) {
            setEdges(propEdges);
        }
    }, [propEdges, setEdges]);

    const handleNodesChangeCallback = useCallback(
        (changes: any[]) => {
            onNodesChange(changes);
            if (onNodesChangeProp) {
                setTimeout(() => {
                    onNodesChangeProp(nodes);
                }, 0);
            }
        },
        [onNodesChange, onNodesChangeProp, nodes]
    );

    const handleEdgesChangeCallback = useCallback(
        (changes: any[]) => {
            onEdgesChange(changes);
            if (onEdgesChangeProp) {
                setTimeout(() => {
                    onEdgesChangeProp(edges);
                }, 0);
            }
        },
        [onEdgesChange, onEdgesChangeProp, edges]
    );

    const onConnect = useCallback(
        (params: any) => {
            // 防止重复连接
            const isDuplicate = edges.some(
                edge => edge.source === params.source && edge.target === params.target
            );

            if (isDuplicate) {
                console.warn('Connection already exists');
                return;
            }

            const newEdge = {
                ...params,
                id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type: 'straight',
                style: {
                    stroke: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'),
                    strokeWidth: 2
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'),
                    width: 12,
                    height: 12,
                },
                label: '',
                labelStyle: { fill: isDark ? '#fff' : '#333', fontSize: 10 },
                labelBgStyle: { fill: 'transparent' },
            };
            setEdges((eds: any[]) => addEdge(newEdge, eds));
            if (onConnectProp) {
                onConnectProp(params);
            }
        },
        [setEdges, onConnectProp, edgeStyles.defaultColor, isDark, edges]
    );

    const handleNodeClick = useCallback(
        (event: React.MouseEvent, node: any) => {
            if (onNodeClick && node.data) {
                onNodeClick(node.id, node.data, event);
            }
        },
        [onNodeClick]
    );

    const handleNodeDoubleClick = useCallback(
        (event: React.MouseEvent, node: any) => {
            if (onNodeDoubleClick && node.data) {
                onNodeDoubleClick(node.id, node.data);
            }
        },
        [onNodeDoubleClick]
    );

    const handleNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: any) => {
            event.preventDefault();
            if (onNodeContextMenu && node.data) {
                onNodeContextMenu(node.id, node.data);
            }
        },
        [onNodeContextMenu]
    );

    const handleEdgeClick = useCallback(
        (event: React.MouseEvent, edge: any) => {
            if (onEdgeClick) {
                onEdgeClick(edge.id, edge.data);
            }
        },
        [onEdgeClick]
    );

    // 为节点注入主题
    const nodesWithTheme = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                theme: theme,
                showHandles: showHandles,
            },
            className: `relation-node ${node.className || ''}`,
        }));
    }, [nodes, theme, showHandles]);

    // 为边添加样式
    const edgesWithStyle = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            type: 'straight',
            style: {
                ...edge.style,
                stroke: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'),
                strokeWidth: 2,
            },
            labelStyle: {
                fill: isDark ? '#fff' : '#333',
                fontSize: 10,
                ...edge.labelStyle,
            },
            labelBgStyle: {
                fill: 'transparent',
                ...edge.labelBgStyle,
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'),
                width: 12,
                height: 12,
                ...edge.markerEnd,
            },
        }));
    }, [edges, theme, isDark, edgeStyles.defaultColor]);

    return (
        <div
            className={`relation-container ${className}`}
            style={{
                width,
                height,
                ...style,
                backgroundColor: bgColor,
                borderRadius: nodeStyles.borderRadius || '12px',
                overflow: 'hidden',
            }}
        >
            <ReactFlow
                nodes={nodesWithTheme}
                edges={edgesWithStyle}
                onNodesChange={handleNodesChangeCallback}
                onEdgesChange={handleEdgesChangeCallback}
                onConnect={enableEdgeCreation ? onConnect : undefined}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeContextMenu={handleNodeContextMenu}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                fitView={false}
                defaultViewport={defaultViewport}
                minZoom={minZoom}
                maxZoom={maxZoom}
                snapToGrid={snapToGrid}
                snapGrid={snapGrid}
                nodesDraggable={enableNodeDrag}
                nodesConnectable={enableEdgeCreation}
                connectionLineType={ConnectionLineType.Straight}
                connectionLineStyle={{
                    stroke: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'),
                    strokeWidth: 2,
                }}
                attributionPosition="bottom-right"
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                panOnScroll={false}
                panOnDrag={true}
                proOptions={{ hideAttribution: true }}
                elevateEdgesOnSelect={true}
                defaultEdgeOptions={{
                    type: 'straight',
                    style: { stroke: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'), strokeWidth: 2 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
                }}
            >
                <Background color={isDark ? '#1e293b' : '#e2e8f0'} gap={20} />
                <Controls showZoom={true} showFitView={true} showInteractive={false} />
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