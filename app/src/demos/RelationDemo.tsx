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
        {
            id: 'e1-3',
            source: '1',
            target: '3',
            label: '统领',
        },
        {
            id: 'e2-3',
            source: '2',
            target: '3',
            label: '隶属于',
        },
        {
            id: 'e3-4',
            source: '3',
            target: '4',
            label: '指挥',
        },
        {
            id: 'e4-5',
            source: '4',
            target: '5',
            label: '支援',
        },
    ];

    const handleNodeClick = (nodeId: string, nodeData: any) => {
        console.log('节点点击:', nodeId, nodeData);
    };

    const handleEdgeClick = (edgeId: string) => {
        console.log('边点击:', edgeId);
    };

    const handleConnect = (connection: any) => {
        console.log('创建新连接:', connection);
    };

    return (
        <div className="demo-section">
            <h4>关系图谱</h4>

            {/* 使用说明 */}
            <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                background: 'var(--fc-color-bg-tertiary)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--fc-color-text-secondary)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span>📊 关系图谱演示</span>
                    <span>🖱️ 鼠标拖拽平移</span>
                    <span>🔍 鼠标滚轮缩放</span>
                    <span>✨ 点击节点/连线查看控制台</span>
                    <span>🔗 拖拽节点连接点可创建新连线</span>
                </div>
            </div>

            {/* 关系图谱容器 */}
            <div className="demo-row">
                <div style={{
                    width: '100%',
                    height: '500px',
                    background: theme === 'dark' ? '#0f172a' : '#f5f7fa',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid var(--fc-color-border)',
                }}>
                    <Relation
                        nodes={nodes}
                        edges={edges}
                        theme={theme}
                        height="500px"
                        fitView={true}
                        enableEdgeCreation={true}
                        enableNodeDrag={true}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                        onConnect={handleConnect}
                    />
                </div>
            </div>

            {/* 图例说明 */}
            <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'var(--fc-color-bg-tertiary)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--fc-color-text-tertiary)',
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>⚔️</span>
                    <span>战争部队</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🎯</span>
                    <span>特种部队</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>⭐</span>
                    <span>指挥中心</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🛡️</span>
                    <span>防御部队</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🏆</span>
                    <span>功勋部队</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }}></div>
                    <span>活跃状态</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }}></div>
                    <span>警告状态</span>
                </div>
            </div>
        </div>
    );
};