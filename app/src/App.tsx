import { useState, type ComponentType } from 'react'
import { useTheme, CheckButton } from 'flowcloudai-ui'
import './App.css'

import { ButtonDemo }         from './demos/ButtonDemo'
import { CheckButtonDemo }    from './demos/CheckButtonDemo'
import { AlertDemo }          from './demos/AlertDemo'
import { InputDemo }          from './demos/InputDemo'
import { SliderDemo }         from './demos/SliderDemo'
import { SelectDemo }         from './demos/SelectDemo'
import { TagItemDemo }        from './demos/TagItemDemo'
import { RollingBoxDemo }     from './demos/RollingBoxDemo'
import { AvatarDemo }         from './demos/AvatarDemo'
import { ListGroupDemo }      from './demos/ListGroupDemo'
import { VirtualListDemo }    from './demos/VirtualListDemo'
import { CardDemo }           from './demos/CardDemo'
import { MarkdownEditorDemo } from './demos/MarkdownEditorDemo'
import { TabBarDemo }         from './demos/TabBarDemo'
import { SideBarDemo }        from './demos/SideBarDemo'
import { TreeDemoWrapper }    from './demos/TreeDemoWrapper'
import { ContextMenuDemo }    from './demos/ContextMenuDemo'
import { ChatDemo }           from './demos/ChatDemo'
import { LazyLoadDemo }       from './demos/LazyLoadDemo'

/* ===== 导航注册表 ===== */

interface NavItem { key: string; label: string }
interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
    {
        label: '基础', items: [
            { key: 'button',  label: 'Button' },
            { key: 'check',   label: 'CheckButton' },
            { key: 'alert',   label: 'Alert' },
        ],
    },
    {
        label: '输入', items: [
            { key: 'input',   label: 'Input' },
            { key: 'slider',  label: 'Slider' },
            { key: 'select',  label: 'Select' },
            { key: 'tagitem', label: 'TagItem' },
        ],
    },
    {
        label: '展示', items: [
            { key: 'rollingbox',  label: 'RollingBox' },
            { key: 'avatar',      label: 'Avatar' },
            { key: 'listgroup',   label: 'ListGroup' },
            { key: 'virtuallist', label: 'VirtualList' },
            { key: 'card',        label: 'Card' },
            { key: 'markdown',    label: 'MarkdownEditor' },
        ],
    },
    {
        label: '导航', items: [
            { key: 'tabbar',  label: 'TabBar' },
            { key: 'sidebar', label: 'SideBar' },
            { key: 'tree',    label: 'Tree' },
        ],
    },
    {
        label: '覆盖层', items: [
            { key: 'contextmenu', label: 'ContextMenu' },
        ],
    },
    {
        label: 'AI', items: [
            { key: 'chat',     label: 'Chat' },
            { key: 'lazyload', label: 'LazyLoad' },
        ],
    },
]

const DEMO_COMPONENTS: Record<string, ComponentType> = {
    button:      ButtonDemo,
    check:       CheckButtonDemo,
    alert:       AlertDemo,
    input:       InputDemo,
    slider:      SliderDemo,
    select:      SelectDemo,
    tagitem:     TagItemDemo,
    rollingbox:  RollingBoxDemo,
    avatar:      AvatarDemo,
    listgroup:   ListGroupDemo,
    virtuallist: VirtualListDemo,
    card:        CardDemo,
    markdown:    MarkdownEditorDemo,
    tabbar:      TabBarDemo,
    sidebar:     SideBarDemo,
    tree:        TreeDemoWrapper,
    contextmenu: ContextMenuDemo,
    chat:        ChatDemo,
    lazyload:    LazyLoadDemo,
}

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)
const DEFAULT_KEY = NAV_GROUPS[0].items[0].key

/* ===== App ===== */

export default function App() {
    const [activeDemo, setActiveDemo] = useState(DEFAULT_KEY)
    const { theme, setTheme } = useTheme()

    const ActiveDemo = DEMO_COMPONENTS[activeDemo]
    const activeLabel = ALL_ITEMS.find(i => i.key === activeDemo)?.label ?? ''

    return (
        <div className="app-shell">
            {/* 顶栏 */}
            <header className="app-topbar">
                <span className="app-topbar__title">FlowCloud UI</span>
                <CheckButton
                    checked={theme === 'dark'}
                    onChange={v => setTheme(v ? 'dark' : 'light')}
                    labelLeft="亮" labelRight="暗"
                    size="sm"
                />
            </header>

            <div className="app-body">
                {/* 左侧导航 */}
                <nav className="app-nav">
                    {NAV_GROUPS.map(group => (
                        <div key={group.label} className="app-nav-group">
                            <div className="app-nav-group-label">{group.label}</div>
                            {group.items.map(item => (
                                <div
                                    key={item.key}
                                    className={`app-nav-item${activeDemo === item.key ? ' active' : ''}`}
                                    onClick={() => setActiveDemo(item.key)}
                                >
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* 内容区 */}
                <main className="app-content">
                    <h2 className="app-content-title">{activeLabel}</h2>
                    {ActiveDemo && <ActiveDemo/>}
                </main>
            </div>
        </div>
    )
}
