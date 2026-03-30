import { Relation } from 'flowcloudai-ui';

export const RelationDemo = () => {
    return (
        <div className="demo-section">
            <h4>关系图谱</h4>
            <div className="demo-row">
                <div style={{
                    width: '100%',
                    height: '500px',
                    background: 'var(--fc-color-bg-secondary)',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}>
                    <Relation
                        height="500px"
                        onNodeClick={(id: string, data: any) => {
                            console.log('点击节点:', id, data);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};