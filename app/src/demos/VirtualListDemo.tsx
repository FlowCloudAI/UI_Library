import { useMemo, useState } from 'react'
import { VirtualList, type VirtualListVisibleRange } from 'flowcloudai-ui/VirtualList'

export function VirtualListDemo() {
    const data = useMemo(() => Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        title: `Item ${i + 1}`,
        description: `第 ${i + 1} 个项目的描述信息`,
        avatar: `https://i.pravatar.cc/40?u=${i}`,
    })), [])
    const [visibleRange, setVisibleRange] = useState<VirtualListVisibleRange>({
        startIndex: 0,
        endIndexExclusive: 0,
    })

    return (
        <>
            <div className="demo-section">
                <h4>10000 条数据</h4>
                <div style={{
                    marginBottom: 12,
                    padding: 12,
                    border: '1px solid var(--fc-color-border, #e2e8f0)',
                    borderRadius: 8,
                    background: 'var(--fc-color-bg-secondary, #f8fafc)',
                    fontSize: 12,
                    color: 'var(--fc-color-text-secondary)',
                }}>
                    当前真实视口范围：{visibleRange.startIndex} - {visibleRange.endIndexExclusive}
                    <span style={{ marginLeft: 8 }}>
                        （共 {Math.max(0, visibleRange.endIndexExclusive - visibleRange.startIndex)} 行）
                    </span>
                </div>
                <div className="demo-row">
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <p style={{ fontSize: 12, marginBottom: 8, color: 'var(--fc-color-text-secondary)' }}>带头像</p>
                        <VirtualList
                            data={data} height={400} itemHeight={60}
                            onVisibleRangeChange={setVisibleRange}
                            renderItem={(item) => (
                                <div style={{
                                    height: 60, padding: '10px 15px',
                                    borderBottom: '1px solid var(--fc-color-border-light)',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <img
                                        src={item.avatar}
                                        alt=""
                                        style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                                    />
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
