// src/components/Relation/Relation.tsx
// @ts-nocheck
import React, { useCallback, useEffect, memo } from 'react';
import type { MouseEvent, CSSProperties, FC } from 'react';
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
    onNodeClick?: (nodeId: string, nodeData: RelationNodeData, event?: MouseEvent) => void;
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

// 创建多个连接点的组件
const ConnectionHandles = ({ isDark, showHandles }: { isDark: boolean; showHandles: boolean }) => {
    const handleStyle: CSSProperties = {
        background: isDark ? '#ff8e8e' : '#ff6b6b',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        border: `1px solid ${isDark ? '#1e293b' : '#ffffff'}`,
        transition: 'all 0.2s ease',
    };

    const hiddenHandleStyle: CSSProperties = {
        opacity: 0,
        width: '0px',
        height: '0px',
        pointerEvents: 'none',
    };

    const actualStyle = showHandles ? handleStyle : hiddenHandleStyle;

    return (
        <>
            {/* 顶部连接点 - 3个位置 */}
            <Handle type="target" position={Position.Top} id="top-left" style={{ ...actualStyle, left: '25%' }} />
            <Handle type="source" position={Position.Top} id="top-left-source" style={{ ...actualStyle, left: '25%' }} />
            <Handle type="target" position={Position.Top} id="top-center" style={{ ...actualStyle, left: '50%' }} />
            <Handle type="source" position={Position.Top} id="top-center-source" style={{ ...actualStyle, left: '50%' }} />
            <Handle type="target" position={Position.Top} id="top-right" style={{ ...actualStyle, left: '75%' }} />
            <Handle type="source" position={Position.Top} id="top-right-source" style={{ ...actualStyle, left: '75%' }} />

            {/* 右侧连接点 - 3个位置 */}
            <Handle type="target" position={Position.Right} id="right-top" style={{ ...actualStyle, top: '25%' }} />
            <Handle type="source" position={Position.Right} id="right-top-source" style={{ ...actualStyle, top: '25%' }} />
            <Handle type="target" position={Position.Right} id="right-center" style={{ ...actualStyle, top: '50%' }} />
            <Handle type="source" position={Position.Right} id="right-center-source" style={{ ...actualStyle, top: '50%' }} />
            <Handle type="target" position={Position.Right} id="right-bottom" style={{ ...actualStyle, top: '75%' }} />
            <Handle type="source" position={Position.Right} id="right-bottom-source" style={{ ...actualStyle, top: '75%' }} />

            {/* 底部连接点 - 3个位置 */}
            <Handle type="target" position={Position.Bottom} id="bottom-left" style={{ ...actualStyle, left: '25%' }} />
            <Handle type="source" position={Position.Bottom} id="bottom-left-source" style={{ ...actualStyle, left: '25%' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-center" style={{ ...actualStyle, left: '50%' }} />
            <Handle type="source" position={Position.Bottom} id="bottom-center-source" style={{ ...actualStyle, left: '50%' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-right" style={{ ...actualStyle, left: '75%' }} />
            <Handle type="source" position={Position.Bottom} id="bottom-right-source" style={{ ...actualStyle, left: '75%' }} />

            {/* 左侧连接点 - 3个位置 */}
            <Handle type="target" position={Position.Left} id="left-top" style={{ ...actualStyle, top: '25%' }} />
            <Handle type="source" position={Position.Left} id="left-top-source" style={{ ...actualStyle, top: '25%' }} />
            <Handle type="target" position={Position.Left} id="left-center" style={{ ...actualStyle, top: '50%' }} />
            <Handle type="source" position={Position.Left} id="left-center-source" style={{ ...actualStyle, top: '50%' }} />
            <Handle type="target" position={Position.Left} id="left-bottom" style={{ ...actualStyle, top: '75%' }} />
            <Handle type="source" position={Position.Left} id="left-bottom-source" style={{ ...actualStyle, top: '75%' }} />

            {/* 四个角落的连接点 - 增加更多灵活性 */}
            <Handle type="target" position={Position.Top} id="corner-top-left" style={{ ...actualStyle, left: '10%' }} />
            <Handle type="source" position={Position.Top} id="corner-top-left-source" style={{ ...actualStyle, left: '10%' }} />
            <Handle type="target" position={Position.Top} id="corner-top-right" style={{ ...actualStyle, left: '90%' }} />
            <Handle type="source" position={Position.Top} id="corner-top-right-source" style={{ ...actualStyle, left: '90%' }} />
            <Handle type="target" position={Position.Bottom} id="corner-bottom-left" style={{ ...actualStyle, left: '10%' }} />
            <Handle type="source" position={Position.Bottom} id="corner-bottom-left-source" style={{ ...actualStyle, left: '10%' }} />
            <Handle type="target" position={Position.Bottom} id="corner-bottom-right" style={{ ...actualStyle, left: '90%' }} />
            <Handle type="source" position={Position.Bottom} id="corner-bottom-right-source" style={{ ...actualStyle, left: '90%' }} />
            <Handle type="target" position={Position.Left} id="corner-left-top" style={{ ...actualStyle, top: '10%' }} />
            <Handle type="source" position={Position.Left} id="corner-left-top-source" style={{ ...actualStyle, top: '10%' }} />
            <Handle type="target" position={Position.Left} id="corner-left-bottom" style={{ ...actualStyle, top: '90%' }} />
            <Handle type="source" position={Position.Left} id="corner-left-bottom-source" style={{ ...actualStyle, top: '90%' }} />
            <Handle type="target" position={Position.Right} id="corner-right-top" style={{ ...actualStyle, top: '10%' }} />
            <Handle type="source" position={Position.Right} id="corner-right-top-source" style={{ ...actualStyle, top: '10%' }} />
            <Handle type="target" position={Position.Right} id="corner-right-bottom" style={{ ...actualStyle, top: '90%' }} />
            <Handle type="source" position={Position.Right} id="corner-right-bottom-source" style={{ ...actualStyle, top: '90%' }} />
        </>
    );
};

// 使用 memo 优化节点渲染
const CustomNode: FC<{ data: RelationNodeData & { theme?: 'dark' | 'light'; showHandles?: boolean }; theme?: 'dark' | 'light' }> = memo(({ data, theme: propTheme }) => {
    const isDark = (data.theme || propTheme) === 'dark';
    const showHandles = data.showHandles !== undefined ? data.showHandles : false;

    const nodeStyle: CSSProperties = {
        background: isDark
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'}`,
        borderRadius: '14px',
        boxShadow: isDark
            ? '0 8px 20px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)'
            : '0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05)',
        minWidth: '240px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
    };

    const iconStyle: CSSProperties = {
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.02) 100%)',
        transition: 'all 0.3s ease',
        boxShadow: isDark ? 'inset 0 1px 1px rgba(255, 255, 255, 0.1)' : 'inset 0 1px 1px rgba(0, 0, 0, 0.02)',
    };

    const titleStyle: CSSProperties = {
        fontWeight: 700,
        fontSize: '15px',
        marginBottom: '4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: isDark ? '#ffffff' : '#1e293b',
        letterSpacing: isDark ? '0.3px' : 'normal',
    };

    const subtitleStyle: CSSProperties = {
        fontSize: '11px',
        fontWeight: 500,
        marginBottom: '2px',
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

    return (
        <div style={nodeStyle} className="relation-node">
            <ConnectionHandles isDark={isDark} showHandles={showHandles} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={iconStyle}>
                        {data.imageUrl ? (
                            <img
                                src={data.imageUrl}
                                alt={data.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                            />
                        ) : (
                            <span style={{ fontSize: '28px', filter: isDark ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none' }}>
                                {getIconEmoji(data.iconType)}
                            </span>
                        )}
                    </div>
                    {data.status && (
                        <div style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            border: `2px solid ${isDark ? '#1e293b' : '#ffffff'}`,
                            backgroundColor: getStatusColor(data.status),
                            animation: data.status === 'warning' ? 'pulse 2s infinite' : 'none',
                            boxShadow: isDark ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none',
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
});

CustomNode.displayName = 'CustomNode';

const nodeTypes = {
    custom: CustomNode,
};

// 简约的边样式配置 - 细线箭头
const getEdgeStyle = (theme: 'dark' | 'light', isHovered?: boolean, isSelected?: boolean) => {
    const baseColor = theme === 'dark' ? '#7c8ba0' : '#a0aec0';
    const hoverColor = '#ff8e8e';
    const selectedColor = '#ff6b6b';

    if (isSelected) return { stroke: selectedColor, strokeWidth: 2.5 };
    if (isHovered) return { stroke: hoverColor, strokeWidth: 2.5 };
    return { stroke: baseColor, strokeWidth: 1.8 };
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
                fitViewFn({ duration: 300, padding: 0.2, ...fitViewOptions }).catch((error: Error) => {
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

    const handleNodesChange = useCallback(
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

    const handleEdgesChange = useCallback(
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
            const newEdge = {
                ...params,
                id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                type: 'straight',
                style: { stroke: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'), strokeWidth: 1.8 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'),
                    width: 12,
                    height: 12,
                },
                label: '',
                labelStyle: { fill: isDark ? '#fff' : '#333', fontSize: 11, fontWeight: 400 },
                labelBgStyle: { fill: 'transparent', fillOpacity: 0 },
            };
            setEdges((eds: any[]) => addEdge(newEdge, eds));
            if (onConnectProp) {
                onConnectProp(params);
            }
        },
        [setEdges, onConnectProp, edgeStyles.defaultColor, isDark]
    );

    const handleNodeClick = useCallback(
        (_event: MouseEvent, node: any) => {
            if (onNodeClick && node.data) {
                onNodeClick(node.id, node.data, _event);
            }
        },
        [onNodeClick]
    );

    const handleNodeDoubleClick = useCallback(
        (_event: MouseEvent, node: any) => {
            if (onNodeDoubleClick && node.data) {
                onNodeDoubleClick(node.id, node.data);
            }
        },
        [onNodeDoubleClick]
    );

    const handleNodeContextMenu = useCallback(
        (event: MouseEvent, node: any) => {
            event.preventDefault();
            if (onNodeContextMenu && node.data) {
                onNodeContextMenu(node.id, node.data);
            }
        },
        [onNodeContextMenu]
    );

    const handleEdgeClick = useCallback(
        (_event: MouseEvent, edge: any) => {
            if (onEdgeClick) {
                onEdgeClick(edge.id, edge.data);
            }
        },
        [onEdgeClick]
    );

    // 为节点注入主题和 showHandles 属性
    const nodesWithTheme = React.useMemo(() => {
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

    // 为边添加简约样式
    const edgesWithStyle = React.useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            type: edge.type || 'straight',
            style: {
                ...edge.style,
                ...getEdgeStyle(theme),
            },
            labelStyle: {
                fill: isDark ? '#fff' : '#333',
                fontSize: 11,
                fontWeight: 400,
                ...edge.labelStyle,
            },
            labelBgStyle: {
                fill: 'transparent',
                fillOpacity: 0,
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

    // 动态注入全局样式
    const globalStyle = `
        .relation-container {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        .react-flow__background,
        .react-flow__pane,
        .react-flow__renderer,
        .react-flow__viewport {
            background-color: ${bgColor} !important;
        }
        .relation-node {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
        }
        .relation-node:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: ${isDark
        ? '0 12px 28px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)'
        : '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.05)'};
        }
        .react-flow__edge-path {
            transition: stroke-width 0.2s ease, stroke 0.2s ease;
        }
        .react-flow__edge:hover .react-flow__edge-path {
            stroke-width: 2.5px;
            stroke: ${edgeStyles.hoverColor || (isDark ? '#ffa5a5' : '#ff8e8e')};
        }
        /* 连接点悬停效果 */
        .react-flow__handle {
            transition: all 0.2s ease;
        }
        .react-flow__handle:hover {
            transform: scale(1.3);
            background-color: ${isDark ? '#ffa5a5' : '#ff8e8e'} !important;
        }
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.7;
                transform: scale(1.2);
            }
        }
        /* 简约滚动条 */
        .relation-container ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        .relation-container ::-webkit-scrollbar-track {
            background: ${isDark ? '#1e293b' : '#e2e8f0'};
            border-radius: 3px;
        }
        .relation-container ::-webkit-scrollbar-thumb {
            background: ${isDark ? '#475569' : '#cbd5e1'};
            border-radius: 3px;
        }
        .relation-container ::-webkit-scrollbar-thumb:hover {
            background: ${isDark ? '#ff8e8e' : '#ff6b6b'};
        }
    `;

    return (
        <div
            className={`relation-container ${className}`}
            style={{
                width,
                height,
                ...style,
                backgroundColor: bgColor,
                borderRadius: nodeStyles.borderRadius || '12px',
            }}
        >
            <style>{globalStyle}</style>
            <ReactFlow
                nodes={nodesWithTheme}
                edges={edgesWithStyle}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={enableEdgeCreation ? onConnect : undefined}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onNodeContextMenu={handleNodeContextMenu}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                fitView={false}
                fitViewOptions={fitViewOptions}
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
                    strokeWidth: 1.8,
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
                    style: { stroke: edgeStyles.defaultColor || (isDark ? '#7c8ba0' : '#a0aec0'), strokeWidth: 1.8 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
                }}
            />
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