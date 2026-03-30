// @ts-nocheck
import React, { useCallback } from 'react';
// 修改这里：使用命名导出
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './Relation.css';

export interface RelationNodeData {
    iconType?: 'war' | 'target' | 'star' | 'award' | 'flag' | 'default' | 'user' | 'shield';
    title: string;
    subtitle: string;
    description?: string;
    imageUrl?: string;
}

export interface RelationProps {
    nodes?: any[];
    edges?: any[];
    onNodeClick?: (nodeId: string, nodeData: RelationNodeData) => void;
    onEdgeClick?: (edgeId: string) => void;
    onConnect?: (connection: any) => void;
    fitView?: boolean;
    className?: string;
    style?: React.CSSProperties;
    height?: string | number;
    width?: string | number;
}

const defaultNodes: any[] = [
    {
        id: '1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
            iconType: 'war',
            title: '艾瑟拉·金狮战团',
            subtitle: '精英战斗部队',
            description: '成立于第三纪元，守护王国',
        },
    },
    {
        id: '2',
        type: 'custom',
        position: { x: 450, y: 100 },
        data: {
            iconType: 'target',
            title: '黎明之刃',
            subtitle: '特种作战分队',
            description: '擅长渗透与突袭',
        },
    },
    {
        id: '3',
        type: 'custom',
        position: { x: 275, y: 320 },
        data: {
            iconType: 'star',
            title: '狮心统帅',
            subtitle: '指挥官',
            description: '战团最高领袖',
        },
    },
];

const defaultEdges: any[] = [
    { id: 'e1-3', source: '1', target: '3', label: '统领' },
    { id: 'e2-3', source: '2', target: '3', label: '隶属于' },
];

const CustomNode: React.FC<{ data: RelationNodeData }> = ({ data }) => {
    const getIconEmoji = () => {
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
        return map[data.iconType || 'default'] || '👥';
    };

    return (
        <div className="relation-node">
            <Handle type="target" position={Position.Top} className="relation-node-handle" />
            <div className="relation-node-content">
                <div className="relation-node-icon">
                    {data.imageUrl ? (
                        <img src={data.imageUrl} alt={data.title} />
                    ) : (
                        <span className="relation-node-icon-emoji">{getIconEmoji()}</span>
                    )}
                </div>
                <div className="relation-node-text">
                    <div className="relation-node-title">{data.title}</div>
                    <div className="relation-node-subtitle">{data.subtitle}</div>
                    {data.description && (
                        <div className="relation-node-description">{data.description}</div>
                    )}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="relation-node-handle" />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const Relation: React.FC<RelationProps> = ({
                                               nodes: propNodes,
                                               edges: propEdges,
                                               onNodeClick,
                                               onEdgeClick,
                                               onConnect: onConnectProp,
                                               fitView = true,
                                               className = '',
                                               style = {},
                                               height = '500px',
                                               width = '100%',
                                           }) => {
    const [nodes, , onNodesChange] = useNodesState(
        propNodes || defaultNodes
    );
    const [edges, setEdges, onEdgesChange] = useEdgesState(
        propEdges || defaultEdges
    );

    const onConnect = useCallback(
        (params: any) => {
            setEdges((eds: any[]) => addEdge(params, eds));
            if (onConnectProp) {
                onConnectProp(params);
            }
        },
        [setEdges, onConnectProp]
    );

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: any) => {
            if (onNodeClick && node.data) {
                onNodeClick(node.id, node.data);
            }
        },
        [onNodeClick]
    );

    const handleEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: any) => {
            if (onEdgeClick) {
                onEdgeClick(edge.id);
            }
        },
        [onEdgeClick]
    );

    return (
        <div
            className={`relation-container ${className}`}
            style={{ width, height, ...style }}
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                fitView={fitView}
                attributionPosition="bottom-right"
            >
                <Background color="#e2e8f0" gap={16} />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export { Relation };
export default Relation;