// src/demos/RelationDemo.tsx
// @ts-nocheck
import { useTheme } from 'flowcloudai-ui';
import { Relation } from 'flowcloudai-ui';

export const RelationDemo = () => {
    const { theme } = useTheme();

    // 示例节点数据
    const nodes = [
        {
            id: '1',
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
                iconType: 'war',
                title: '艾瑟拉·金狮战团',
                subtitle: '精英战斗部队',
                description: '成立于第三纪元，守护王国',
                status: 'active',
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
                status: 'active',
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
                status: 'active',
            },
        },
        {
            id: '4',
            type: 'custom',
            position: { x: 620, y: 280 },
            data: {
                iconType: 'shield',
                title: '铁壁防线',
                subtitle: '防御部队',
                description: '坚守阵地，固若金汤',
                status: 'active',
            },
        },
        {
            id: '5',
            type: 'custom',
            position: { x: 800, y: 450 },
            data: {
                iconType: 'award',
                title: '荣耀军团',
                subtitle: '功勋部队',
                description: '屡建战功，荣耀加身',
                status: 'warning',
            },
        },
    ];

    // 示例连线数据
    const edges = [
        { id: 'e1-3', source: '1', target: '3', label: '统领' },
        { id: 'e2-3', source: '2', target: '3', label: '隶属于' },
        { id: 'e3-4', source: '3', target: '4', label: '指挥' },
        { id: 'e4-5', source: '4', target: '5', label: '支援' },
    ];

    // 交互处理函数
    const handleNodeClick = (nodeId: string, nodeData: any) => {
        console.log('节点点击:', nodeId, nodeData);
    };

    const handleNodeDoubleClick = (nodeId: string, nodeData: any) => {
        console.log('节点双击:', nodeId, nodeData);
    };

    const handleEdgeClick = (edgeId: string, edgeData: any) => {
        console.log('连线点击:', edgeId, edgeData);
    };

    const handleConnect = (connection: any) => {
        console.log('创建新连接:', connection);
    };

    return (
        <div className="demo-section">
            <h4>关系图谱</h4>

            <div className="demo-row">
                <div style={{ width: '100%', height: '500px', background: theme === 'dark' ? '#0f172a' : '#f5f7fa', borderRadius: '12px', overflow: 'hidden' }}>
                    <Relation
                        nodes={nodes}
                        edges={edges}
                        theme={theme}
                        height="500px"
                        fitView={true}
                        enableEdgeCreation={true}
                        enableNodeDrag={true}
                        onNodeClick={handleNodeClick}
                        onNodeDoubleClick={handleNodeDoubleClick}
                        onEdgeClick={handleEdgeClick}
                        onConnect={handleConnect}
                    />
                </div>
            </div>
        </div>
    );
};