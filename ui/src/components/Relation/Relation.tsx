// src/components/Relation/Relation.tsx
// @ts-nocheck
import { useCallback, useEffect } from 'react';
import type { MouseEvent, CSSProperties } from 'react';
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

const CustomNode: React.FC<{ data: RelationNodeData; theme?: 'dark' | 'light' }> = ({ data, theme = 'light' }) => {
    const isDark = theme === 'dark';

    const nodeStyle: CSSProperties = {
        background: isDark
            ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}`,
        borderRadius: '14px',
        boxShadow: isDark
            ? '0 8px 20px rgba(0, 0, 0, 0.25)'
            : '0 4px 12px rgba(0, 0, 0, 0.08)',
        minWidth: '240px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    const iconStyle: CSSProperties = {
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s ease',
    };

    const titleStyle: CSSProperties = {
        fontWeight: 700,
        fontSize: '15px',
        marginBottom: '4px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: isDark ? '#ffffff' : '#1e293b',
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
        <div style={nodeStyle}>
            <Handle type="target" position={Position.Top} isConnectable={true} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={iconStyle}>
                        {data.imageUrl ? (
                            <img src={data.imageUrl} alt={data.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} />
                        ) : (
                            <span style={{ fontSize: '28px' }}>{getIconEmoji(data.iconType)}</span>
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
                        }} />
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={titleStyle}>{data.title}</div>
                    <div style={subtitleStyle}>{data.subtitle}</div>
                    {data.description && <div style={descriptionStyle}>{data.description}</div>}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} isConnectable={true} />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const RelationContent: React.FC<RelationProps> = ({
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
                                                  }) => {
    const [nodes, , onNodesChange] = useNodesState(propNodes || []);
    const [edges, setEdges, onEdgesChange] = useEdgesState(propEdges || []);
    const { fitView: fitViewFn } = useReactFlow();

    const theme = propTheme;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f5f7fa';

    useEffect(() => {
        if (fitView && fitViewFn && (propNodes?.length || 0) > 0) {
            setTimeout(() => {
                fitViewFn({ duration: 300, ...fitViewOptions }).catch((error: Error) => {
                    console.warn('Fit view failed:', error);
                });
            }, 100);
        }
    }, [fitView, fitViewFn, fitViewOptions, propNodes]);

    const handleNodesChange = useCallback(
        (changes: any[]) => {
            onNodesChange(changes);
            if (onNodesChangeProp) {
                onNodesChangeProp(nodes);
            }
        },
        [onNodesChange, onNodesChangeProp, nodes]
    );

    const handleEdgesChange = useCallback(
        (changes: any[]) => {
            onEdgesChange(changes);
            if (onEdgesChangeProp) {
                onEdgesChangeProp(edges);
            }
        },
        [onEdgesChange, onEdgesChangeProp, edges]
    );

    const onConnect = useCallback(
        (params: any) => {
            const newEdge = {
                ...params,
                id: `edge-${Date.now()}-${Math.random()}`,
                type: 'smoothstep',
                style: { stroke: '#ff6b6b', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#ff6b6b' },
                label: '新连接',
            };
            setEdges((eds: any[]) => addEdge(newEdge, eds));
            if (onConnectProp) {
                onConnectProp(params);
            }
        },
        [setEdges, onConnectProp]
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

    // 为节点注入主题
    const nodesWithTheme = nodes.map(node => ({
        ...node,
        data: { ...node.data, theme }
    }));

    // 动态注入全局样式覆盖 ReactFlow 背景
    const globalStyle = `
    .react-flow__background,
    .react-flow__pane,
    .react-flow__renderer,
    .react-flow__viewport {
      background-color: ${bgColor} !important;
    }
  `;

    return (
        <div
            className={`relation-container ${className}`}
            style={{
                width,
                height,
                ...style,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: bgColor,
            }}
        >
            <style>{globalStyle}</style>
            <ReactFlow
                nodes={nodesWithTheme}
                edges={edges}
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
                connectionLineType={ConnectionLineType.SmoothStep}
                connectionLineStyle={{ stroke: '#ff6b6b', strokeWidth: 2 }}
                attributionPosition="bottom-right"
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                panOnScroll={false}
                panOnDrag={true}
                proOptions={{ hideAttribution: true }}
            />
        </div>
    );
};

const Relation: React.FC<RelationProps> = (props) => {
    return (
        <ReactFlowProvider>
            <RelationContent {...props} />
        </ReactFlowProvider>
    );
};

export { Relation };