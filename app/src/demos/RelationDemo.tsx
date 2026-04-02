// src/demos/RelationDemo.tsx
// @ts-nocheck
import { useTheme } from 'flowcloudai-ui';
import { Relation } from 'flowcloudai-ui';

export const RelationDemo = () => {
    const { theme } = useTheme();

    // 精心布局的节点位置 - 树形结构，美观不重叠
    const nodes = [
        {
            id: '1',
            type: 'custom',
            position: { x: 400, y: 50 },
            data: {
                iconType: 'star',
                title: '狮心统帅',
                subtitle: '最高指挥官',
                description: '战团最高领袖',
                status: 'active',
            },
        },
        {
            id: '2',
            type: 'custom',
            position: { x: 150, y: 200 },
            data: {
                iconType: 'war',
                title: '艾瑟拉·金狮战团',
                subtitle: '精英战斗部队',
                description: '成立于第三纪元',
                status: 'active',
            },
        },
        {
            id: '3',
            type: 'custom',
            position: { x: 400, y: 200 },
            data: {
                iconType: 'target',
                title: '黎明之刃',
                subtitle: '特种作战分队',
                description: '擅长渗透与突袭',
                status: 'active',
            },
        },
        {
            id: '4',
            type: 'custom',
            position: { x: 650, y: 200 },
            data: {
                iconType: 'shield',
                title: '铁壁防线',
                subtitle: '防御部队',
                description: '坚守阵地',
                status: 'active',
            },
        },
        {
            id: '5',
            type: 'custom',
            position: { x: 400, y: 380 },
            data: {
                iconType: 'award',
                title: '荣耀军团',
                subtitle: '功勋部队',
                description: '屡建战功',
                status: 'warning',
            },
        },
    ];

    // 连线数据
    const edges = [
        { id: 'e2-1', source: '2', target: '1', label: '隶属于' },
        { id: 'e3-1', source: '3', target: '1', label: '隶属于' },
        { id: 'e4-1', source: '4', target: '1', label: '隶属于' },
        { id: 'e5-2', source: '5', target: '2', label: '支援' },
        { id: 'e5-3', source: '5', target: '3', label: '协同' },
        { id: 'e5-4', source: '5', target: '4', label: '支援' },
    ];

    const handleNodeClick = (nodeId: string, nodeData: any) => {
        console.log('点击节点:', nodeId, nodeData);
    };

    const handleEdgeClick = (edgeId: string, edgeData: any) => {
        console.log('点击连线:', edgeId, edgeData);
    };

    return (
        <div className="demo-section">
            <h4>关系图谱 - 树形布局</h4>
            <div className="demo-row">
                <div style={{ width: '100%', height: '550px' }}>
                    <Relation
                        nodes={nodes}
                        edges={edges}
                        theme={theme}
                        height="100%"
                        fitView={true}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                    />
                </div>
            </div>
        </div>
    );
};