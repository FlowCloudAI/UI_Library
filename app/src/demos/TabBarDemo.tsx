import { useState, useCallback } from 'react'
import { TabBar, type TabItem } from 'flowcloudai-ui'

const BASE_TABS: TabItem[] = [
    { key: 'home', label: '首页' },
    { key: 'profile', label: '个人中心' },
    { key: 'settings', label: '设置' },
    { key: 'disabled', label: '已禁用', disabled: true },
]

export function TabBarDemo() {
    const [tabs, setTabs] = useState<TabItem[]>(BASE_TABS)
    const [activeKey, setActiveKey] = useState('home')

    const handleClose = useCallback((key: string) => {
        setTabs(prev => {
            const next = prev.filter(t => t.key !== key)
            setActiveKey(cur => {
                if (cur !== key) return cur
                const idx = prev.findIndex(t => t.key === key)
                return prev[idx + 1]?.key || prev[idx - 1]?.key || ''
            })
            return next
        })
    }, [])

    const handleAdd = useCallback(() => {
        const k = `tab-${Date.now()}`
        setTabs(prev => [...prev, { key: k, label: '新标签' }])
        setActiveKey(k)
    }, [])

    return (
        <>
            <div className="demo-section">
                <h4>attached（贴合）</h4>
                <TabBar items={BASE_TABS} activeKey={activeKey} variant="attached" onChange={setActiveKey}/>
                <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--fc-color-text-secondary)' }}>当前：{activeKey}</div>
            </div>
            <div className="demo-section">
                <h4>floating（悬浮）</h4>
                <TabBar items={BASE_TABS} activeKey={activeKey} variant="floating" onChange={setActiveKey}/>
            </div>
            <div className="demo-section">
                <h4>可关闭 + 可添加 + 拖拽排序</h4>
                <TabBar
                    minTabWidth={8}
                    maxTabWidth={15}
                    items={tabs}
                    activeKey={activeKey}
                    variant="floating"
                    closable
                    addable
                    draggable
                    radius="md"
                    tabRadius="md"
                    onChange={setActiveKey} onClose={handleClose} onAdd={handleAdd} onReorder={setTabs}
                />
                <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--fc-color-text-secondary)' }}>当前：{activeKey}</div>
            </div>
            <div className="demo-section">
                <h4>自定义颜色</h4>
                <div className="demo-col">
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>floating 橙色主题</p>
                        <TabBar items={BASE_TABS} activeKey={activeKey} variant="floating"
                            tabHoverColor="#e65100" tabHoverBackground="#fff3e0"
                            tabActiveColor="#e65100" tabActiveBackground="#ffe0b2"
                            onChange={setActiveKey}
                        />
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>attached 暗色主题</p>
                        <TabBar items={BASE_TABS} activeKey={activeKey} variant="attached"
                            background={"#1e1e2e"} tabColor="#a0a0b0" tabHoverColor="#ffffff"
                            tabHoverBackground="#2a2a3e" tabActiveColor="#c084fc"
                            tabActiveBackground="#2a2a3e" activeIndicatorColor="#c084fc"
                            onChange={setActiveKey}
                        />
                    </div>
                </div>
            </div>
            <div className="demo-section">
                <h4>tabRadius</h4>
                <div className="demo-col">
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>attached + tabRadius="md"</p>
                        <TabBar items={BASE_TABS} activeKey={activeKey} variant="attached" tabRadius="md" onChange={setActiveKey}/>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>floating + tabRadius="lg"</p>
                        <TabBar items={BASE_TABS} activeKey={activeKey} variant="floating" tabRadius="lg" onChange={setActiveKey}/>
                    </div>
                </div>
            </div>
        </>
    )
}
