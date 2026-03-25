import { useMemo } from 'react'
import { VirtualList, Avatar } from 'flowcloudai-ui'

export function VirtualListDemo() {
    const data = useMemo(() => Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Item ${i + 1}`,
        description: `第 ${i + 1} 个项目的描述信息`,
        avatar: `https://i.pravatar.cc/40?u=${i}`,
    })), [])

    return (
        <>
            <div className="demo-section">
                <h4>10000 条数据</h4>
                <div className="demo-row">
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <p style={{ fontSize: 12, marginBottom: 8, color: 'var(--fc-color-text-secondary)' }}>带头像</p>
                        <VirtualList
                            data={data} height={400} itemHeight={60}
                            renderItem={(item) => (
                                <div style={{
                                    height: 60, padding: '10px 15px',
                                    borderBottom: '1px solid var(--fc-color-border-light)',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <Avatar src={item.avatar} size="sm"/>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--fc-color-text)' }}>{item.title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)' }}>{item.description}</div>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <p style={{ fontSize: 12, marginBottom: 8, color: 'var(--fc-color-text-secondary)' }}>简洁文本</p>
                        <VirtualList
                            data={data} height={400} itemHeight={40}
                            renderItem={(item, index) => (
                                <div style={{
                                    height: 40, lineHeight: '40px',
                                    padding: '0 15px',
                                    borderBottom: '1px solid var(--fc-color-border-light)',
                                    fontSize: 14, color: 'var(--fc-color-text)',
                                }}>
                                    {index}: {item.title}
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}
