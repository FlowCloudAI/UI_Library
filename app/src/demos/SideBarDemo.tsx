import {useState} from 'react'
import type {CSSProperties} from 'react'
import {SideBar, type SideBarItem} from 'flowcloudai-ui'

const HomeIcon = (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" strokeWidth="1.5" strokeLinecap="round"
          strokeLinejoin="round"/>
</svg>)
const SearchIcon = (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="7" strokeWidth="1.5"/>
    <path d="M16.5 16.5L21 21" strokeWidth="1.5" strokeLinecap="round"/>
</svg>)
const UserIcon = (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" strokeWidth="1.5"/>
    <path d="M20 21a8 8 0 00-16 0" strokeWidth="1.5" strokeLinecap="round"/>
</svg>)
const SettingsIcon = (<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" strokeWidth="1.5"/>
    <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15 1.65 1.65 0 003.17 14H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68 1.65 1.65 0 0010 3.17V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
</svg>)

const menuItems: SideBarItem[] = [
    {key: 'home', label: '首页', icon: HomeIcon},
    {key: 'search', label: '搜索', icon: SearchIcon},
    {key: 'profile', label: '个人', icon: UserIcon},
    {key: 'disabled', label: '禁用项', icon: HomeIcon, disabled: true},
]

const bottomMenuItems: SideBarItem[] = [
    {key: 'settings', label: '设置', icon: SettingsIcon},
]

const demoWrap: CSSProperties = {
    display: 'flex',
    height: 300,
    border: '1px solid var(--fc-color-border)',
    borderRadius: 'var(--fc-radius-md)',
    overflow: 'hidden',
}

export function SideBarDemo() {
    const [selectedKey, setSelectedKey] = useState('home')
    const [collapsed, setCollapsed] = useState(false)

    return (
        <>
            <div className="demo-section">
                <h4>基础（可折叠）+ 底部固定项</h4>
                <div style={demoWrap}>
                    <SideBar
                        items={menuItems}
                        bottomItems={bottomMenuItems}
                        selectedKey={selectedKey}
                        collapsed={collapsed}
                        onSelect={setSelectedKey}
                        onCollapse={setCollapsed}
                    />
                    <main style={{flex: 1, padding: 20, fontSize: 14, color: 'var(--fc-color-text-secondary)'}}>
                        当前选中：{selectedKey}
                    </main>
                </div>
            </div>
            <div className="demo-section">
                <h4>自定义颜色（绿色主题）</h4>
                <div style={{...demoWrap, height: 260}}>
                    <SideBar
                        items={menuItems}
                        selectedKey={selectedKey}
                        onSelect={setSelectedKey}
                        style={{
                            '--sidebar-item-selected-bg': '#e8f5e9',
                            '--sidebar-item-selected-color': '#2e7d32',
                            '--sidebar-item-hover-bg': '#f1f8e9',
                            '--sidebar-item-hover-color': '#33691e',
                        } as CSSProperties}
                        collapsed={false}
                        onCollapse={function (): void {
                            throw new Error("Function not implemented.")
                        }}/>
                    <main style={{flex: 1, padding: 20, fontSize: 14, color: 'var(--fc-color-text-secondary)'}}>
                        当前选中：{selectedKey}
                    </main>
                </div>
            </div>
        </>
    )
}
