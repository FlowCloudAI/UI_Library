import { useState, useCallback, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import { Slider } from 'flowcloudai-ui/Slider'
import { TabBar, type TabBarSizing, type TabItem } from 'flowcloudai-ui/TabBar'

const BASE_TABS: TabItem[] = [
    { key: 'home', label: '首页' },
    { key: 'profile', label: '个人中心' },
    { key: 'settings', label: '设置' },
    { key: 'disabled', label: '已禁用', disabled: true },
]

/* ===== 宽度策略对照探针 ===== */

const PROBE_MIN_TAB_WIDTH = 96
const PROBE_MAX_TAB_WIDTH = 200

const PROBE_MODES: { mode: TabBarSizing; note: string }[] = [
    { mode: 'fill', note: '均分撑满导航区，宽度钳在 [min,max]；留白被 nav-wrap 占掉' },
    { mode: 'fit', note: '按内容宽度，不伸不缩；顶到 min 后就是固定宽' },
    { mode: 'adaptive', note: '维持 max → 平滑收缩 → 触底 min 后滚动；留白仍归 nav-outer' },
]

interface ProbeRowProps {
    mode: TabBarSizing
    note: string
    tabs: TabItem[]
    boxWidth: number
    gutter: number
    activeKey: string
    onSelectedKeyChange: (key: string) => void
    onAdd: () => void
}

function ProbeRow({ mode, note, tabs, boxWidth, gutter, activeKey, onSelectedKeyChange, onAdd }: ProbeRowProps) {
    const hostRef = useRef<HTMLDivElement>(null)
    const [tabWidth, setTabWidth] = useState(0)
    const [hostWidth, setHostWidth] = useState(0)
    const [scrollable, setScrollable] = useState(false)
    const [dragHit, setDragHit] = useState<boolean | null>(null)

    // Tab 宽度是 flex 求解出的 used value，读不到 computed style，只能量实际盒子。
    // 同时观察容器和首个 Tab：容器变宽触发前者，标签增减触发后者。
    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        const measure = () => {
            const tab = host.querySelector<HTMLElement>('.fc-tab-bar__tab')
            const nav = host.querySelector<HTMLElement>('.fc-tab-bar__nav-wrap')
            setTabWidth(tab ? Math.round(tab.getBoundingClientRect().width * 10) / 10 : 0)
            setHostWidth(Math.round(host.getBoundingClientRect().width))
            setScrollable(nav ? nav.scrollWidth - nav.clientWidth > 1 : false)
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(host)
        const firstTab = host.querySelector<HTMLElement>('.fc-tab-bar__tab')
        if (firstTab) observer.observe(firstTab)
        return () => observer.disconnect()
    }, [tabs.length, boxWidth, gutter])

    // 复刻 tauri 2.x drag.js 的判定：只读鼠标直接命中元素自身的属性，不走 closest()
    const handleProbeMove = (e: ReactMouseEvent) => {
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        const attr = hit?.getAttribute('data-tauri-drag-region') ?? null
        setDragHit(attr !== null && attr !== 'false')
    }

    // fit 没有收缩阶段，宽度恒为内容宽（钳在 min/max），单独标注避免读数误导
    const phase = scrollable
        ? '滚动'
        : mode === 'fit' ? '固定宽'
            : tabWidth >= PROBE_MAX_TAB_WIDTH - 0.5 ? '维持最大宽' : '收缩中'

    return (
        <div>
            <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>
                <code style={{ color: 'var(--fc-color-primary)' }}>tabSizing=&quot;{mode}&quot;</code> — {note}
            </p>
            <div
                ref={hostRef}
                className="tabbar-probe"
                style={{ width: boxWidth, maxWidth: '100%' }}
                onMouseMove={handleProbeMove}
                onMouseLeave={() => setDragHit(null)}
            >
                <TabBar
                    items={tabs}
                    selectedKey={activeKey}
                    onSelectedKeyChange={onSelectedKeyChange}
                    onAdd={onAdd}
                    variant="floating"
                    tabRadius="md"
                    tabSizing={mode}
                    dragGutter={`${gutter}px`}
                    minTabWidth={`${PROBE_MIN_TAB_WIDTH}px`}
                    maxTabWidth={`${PROBE_MAX_TAB_WIDTH}px`}
                    addable
                    tauriDragRegion
                />
            </div>
            <div className="tabbar-probe-meta">
                <span>容器 <b>{hostWidth}px</b></span>
                <span>单个 Tab <b>{tabWidth}px</b></span>
                <span>阶段 <b>{phase}</b></span>
                <span>指针处拖拽区 <b>{dragHit === null ? '—' : dragHit ? '命中' : '未命中'}</b></span>
            </div>
        </div>
    )
}

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

    const [probeCount, setProbeCount] = useState(4)
    const [probeWidth, setProbeWidth] = useState(720)
    const [probeGutter, setProbeGutter] = useState(0)
    const [probeKey, setProbeKey] = useState('probe-1')

    const probeTabs = useMemo<TabItem[]>(
        () => Array.from({ length: probeCount }, (_, i) => ({ key: `probe-${i + 1}`, label: `标签 ${i + 1}` })),
        [probeCount],
    )
    const activeProbeKey = probeTabs.some(t => t.key === probeKey) ? probeKey : probeTabs[0]?.key ?? ''
    const handleProbeAdd = useCallback(() => setProbeCount(c => Math.min(c + 1, 12)), [])

    return (
        <>
            <div className="demo-section">
                <h4>宽度策略对照（fill / fit / adaptive）</h4>
                <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', margin: '0 0 var(--fc-space-md)' }}>
                    三条 TabBar 同 items、同 min/max（{PROBE_MIN_TAB_WIDTH}px / {PROBE_MAX_TAB_WIDTH}px）。
                    拖动滑块观察宽度读数是否连续，以及右侧留白落在哪一层。
                </p>
                <div className="demo-col" style={{ gap: 'var(--fc-space-md)', marginBottom: 'var(--fc-space-lg)' }}>
                    <div style={{ maxWidth: 420 }}>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 4 }}>
                            容器宽度：{probeWidth}px
                        </p>
                        <Slider
                            min={320} max={1100} step={10} value={probeWidth} tooltip
                            onValueChange={v => setProbeWidth(typeof v === 'number' ? v : v[0])}
                        />
                    </div>
                    <div style={{ maxWidth: 420 }}>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 4 }}>
                            标签数量：{probeCount}
                        </p>
                        <Slider
                            min={1} max={12} step={1} value={probeCount} tooltip
                            onValueChange={v => setProbeCount(typeof v === 'number' ? v : v[0])}
                        />
                    </div>
                    <div style={{ maxWidth: 420 }}>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 4 }}>
                            dragGutter（右侧预留拖拽留白）：{probeGutter}px
                        </p>
                        <Slider
                            min={0} max={240} step={8} value={probeGutter} tooltip
                            onValueChange={v => setProbeGutter(typeof v === 'number' ? v : v[0])}
                        />
                    </div>
                    <div className="tabbar-probe-legend">
                        <span><i style={{ background: 'rgba(16,185,129,0.55)' }}/>nav-outer（带 data-tauri-drag-region，可拖窗口）</span>
                        <span><i style={{ background: 'rgba(129,99,241,0.55)' }}/>nav-wrap（滚动容器，拖不动窗口）</span>
                    </div>
                </div>
                <div className="demo-col">
                    {PROBE_MODES.map(({ mode, note }) => (
                        <ProbeRow
                            key={mode}
                            mode={mode}
                            note={note}
                            tabs={probeTabs}
                            boxWidth={probeWidth}
                            gutter={probeGutter}
                            activeKey={activeProbeKey}
                            onSelectedKeyChange={setProbeKey}
                            onAdd={handleProbeAdd}
                        />
                    ))}
                </div>
            </div>
            <div className="demo-section">
                <h4>attached（贴合）</h4>
                <TabBar items={BASE_TABS} activeKey={activeKey} variant="attached" onChange={setActiveKey}/>
                <div style={{ padding: 'var(--fc-space-sm) var(--fc-space-md)', fontSize: 13, color: 'var(--fc-color-text-secondary)' }}>当前：{activeKey}</div>
            </div>
            <div className="demo-section">
                <h4>floating（悬浮）</h4>
                <TabBar items={BASE_TABS} activeKey={activeKey} variant="floating" onChange={setActiveKey}/>
            </div>
            <div className="demo-section">
                <h4>可关闭 + 可添加 + 拖拽排序</h4>
                <TabBar
                    minTabWidth={"12rem"}
                    maxTabWidth={"15rem"}
                    items={tabs}
                    activeKey={activeKey}
                    variant="floating"
                    closable
                    addable
                    draggable
                    radius="md"
                    tabRadius="md"
                    fillWidth={false}
                    tauriDragRegion
                    onChange={setActiveKey} onClose={handleClose} onAdd={handleAdd} onReorder={setTabs}
                />
                <div style={{ padding: 'var(--fc-space-sm) var(--fc-space-md)', fontSize: 13, color: 'var(--fc-color-text-secondary)' }}>当前：{activeKey}</div>
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
            <div className="demo-section">
                <h4>fillWidth（控制 Tab 是否填充宽度）</h4>
                <div className="demo-col">
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>fillWidth=true（默认，Tab 自动拉伸填满）</p>
                        <TabBar
                            items={BASE_TABS.slice(0, 2)}
                            activeKey={activeKey}
                            variant="attached"
                            fillWidth
                            onChange={setActiveKey}
                        />
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>fillWidth=false（Tab 只占内容宽度，剩余空间留白）</p>
                        <TabBar
                            items={BASE_TABS.slice(0, 2)}
                            activeKey={activeKey}
                            variant="attached"
                            fillWidth={false}
                            onChange={setActiveKey}
                        />
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6 }}>fillWidth=false + tauriDragRegion=true（空白区域可拖拽窗口）</p>
                        <TabBar
                            items={BASE_TABS.slice(0, 2)}
                            activeKey={activeKey}
                            variant="attached"
                            fillWidth={false}
                            tauriDragRegion
                            onChange={setActiveKey}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}
