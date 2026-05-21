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
import { ContextMenuDemo }    from './demos/ContextMenuDemo'
import MessageBoxDemo from './demos/MessageBoxDemo.tsx'
import { LazyLoadDemo }       from './demos/LazyLoadDemo'
import { TreeDemo }           from './demos/TreeDemo'
import TimeDemo               from './demos/TimeDemo'
import { TeraEditorDemo } from './demos/TeraEditorDemo'
import { SemanticTokensDemo } from './demos/SemanticTokensDemo'

/* ===== 导航注册表 ===== */

interface NavItem { key: string; label: string }
interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
    {
        label: '基础', items: [
            { key: 'SemanticTokens', label: '语义令牌' },
            { key: 'Button',  label: 'Button' },
            { key: 'Check',   label: 'CheckButton' },
            { key: 'Alert',   label: 'Alert' },
        ],
    },
    {
        label: '输入', items: [
            { key: 'Input',   label: 'Input' },
            { key: 'Slider',  label: 'Slider' },
            { key: 'Select',  label: 'Select' },
            { key: 'TagItem', label: 'TagItem' },
        ],
    },
    {
        label: '展示', items: [
            { key: 'RollingBox',  label: 'RollingBox' },
            { key: 'Avatar',      label: 'Avatar' },
            { key: 'ListGroup',   label: 'ListGroup' },
            { key: 'VirtualList', label: 'VirtualList' },
            { key: 'Card',        label: 'Card' },
            { key: 'Markdown',    label: 'MarkdownEditor' },
            { key: 'TeraEditor',  label: 'TeraEditor' },
            { key: 'Time',        label: 'Timeline' },
        ],
    },
    {
        label: '导航', items: [
            { key: 'TabBar',  label: 'TabBar' },
            { key: 'SideBar', label: 'SideBar' },
            { key: 'Tree',    label: 'Tree' },
        ],
    },
    {
        label: '覆盖层', items: [
            { key: 'ContextMenu', label: 'ContextMenu' },
        ],
    },
    {
        label: 'AI', items: [
            { key: 'Chat',     label: 'Chat' },
            { key: 'LazyLoad', label: 'LazyLoad' },
        ],
    },
]

const DEMO_COMPONENTS: Record<string, ComponentType> = {
    SemanticTokens: SemanticTokensDemo,
    Button:      ButtonDemo,
    Check:       CheckButtonDemo,
    Alert:       AlertDemo,
    Input:       InputDemo,
    Slider:      SliderDemo,
    Select:      SelectDemo,
    TagItem:     TagItemDemo,
    RollingBox:  RollingBoxDemo,
    Avatar:      AvatarDemo,
    ListGroup:   ListGroupDemo,
    VirtualList: VirtualListDemo,
    Card:        CardDemo,
    Markdown:    MarkdownEditorDemo,
    TeraEditor:  TeraEditorDemo,
    TabBar:      TabBarDemo,
    SideBar:     SideBarDemo,
    Tree:        TreeDemo,
    ContextMenu: ContextMenuDemo,
    Chat:        MessageBoxDemo,
    LazyLoad:    LazyLoadDemo,
    Time:        TimeDemo,
}

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)
const DEFAULT_KEY = NAV_GROUPS[0].items[0].key

/* ===== App ===== */

export default function App() {
    const [activeDemo, setActiveDemo] = useState<string>(DEFAULT_KEY)
    const { resolvedTheme, setTheme } = useTheme()

    const ActiveDemo = DEMO_COMPONENTS[activeDemo]
    const activeLabel = ALL_ITEMS.find(i => i.key === activeDemo)?.label ?? ''

    const handleThemeChange = (isDark: boolean) => {
        setTheme(isDark ? 'dark' : 'light')
    }

    return (
        <div className="app-shell">
            <header className="app-topbar">
                <span className="app-topbar__title">FlowCloud UI</span>
                <CheckButton
                    checked={resolvedTheme === 'dark'}
                    onChange={handleThemeChange}
                    labelLeft="亮"
                    labelRight="暗"
                    size="sm"
                />
            </header>

            <div className="app-body">
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

                <main className="app-content">
                    <h2 className="app-content-title">{activeLabel}</h2>
                    {ActiveDemo && <ActiveDemo />}
                </main>
            </div>
        </div>
    )
}
