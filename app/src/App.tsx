import {Button, ButtonGroup, ButtonToolbar} from "flowcloudai-ui";
import {
    CheckButton, RollingBox, Input, Select, Slider, SideBar,
    Avatar, ListGroup, ListGroupItem, VirtualList, useAlert,
    lazyLoad, Card, TabBar, TabItem , Chat
} from "flowcloudai-ui";
import { useTheme } from 'flowcloudai-ui';
import {useEffect, useState, useCallback} from "react";
import { TreeDemo } from './TreeDemo'

// 懒加载组件示例
const LazyContent = lazyLoad(
    () => import('./LazyContent'),
    {fallback: <div style={{padding: 20, textAlign: 'center'}}>加载中...</div>}
);

// 定义消息类型
interface Message {
    id: string;
    content: string;
    type: 'user' | 'assistant' | 'system';
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
}

export default function App() {
    const [enabled, setEnabled] = useState(true);
    const [selectedItem, setSelectedItem] = useState('1');
    const {showAlert} = useAlert();
    const [showLazy, setShowLazy] = useState(false);
    const { setTheme } = useTheme()

    useEffect(() => {
        if (enabled) {
            setTheme('light')
        }
        else {
            setTheme('dark');
        }
    }, [enabled]);

    // Chat 组件相关状态
    const [chatMessages, setChatMessages] = useState<Message[]>([
        {
            id: '1',
            content: '你好！我是 AI 助手，有什么可以帮助你的吗？',
            type: 'assistant',
            timestamp: new Date(),
        },
    ]);
    const [chatLoading, setChatLoading] = useState(false);

    // 处理发送消息
    const handleSendMessage = async (content: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            content,
            type: 'user',
            timestamp: new Date(),
            status: 'sending',
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatLoading(true);

        await new Promise(resolve => setTimeout(resolve, 1500));

        setChatMessages(prev =>
            prev.map(msg =>
                msg.id === userMessage.id
                    ? { ...msg, status: 'sent' }
                    : msg
            )
        );

        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `收到你的消息："${content}"。这是一个智能回复示例。`,
            type: 'assistant',
            timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, assistantMessage]);
        setChatLoading(false);

        await showAlert("消息已发送", "success");
    };

    // 清空聊天记录
    const clearChat = async () => {
        const result = await showAlert("确定要清空所有聊天记录吗？", "warning", true);
        if (result === "yes") {
            setChatMessages([
                {
                    id: Date.now().toString(),
                    content: '聊天记录已清空。有什么我可以帮助你的吗？',
                    type: 'assistant',
                    timestamp: new Date(),
                },
            ]);
            await showAlert("聊天记录已清空", "success");
        }
    };

    // 生成测试数据
    const generateData = (count: number) => {
        return Array.from({length: count}, (_, i) => ({
            id: i,
            title: `Item ${i + 1}`,
            description: `这是第 ${i + 1} 个项目的描述信息`,
            avatar: `https://i.pravatar.cc/40?u=${i}`
        }));
    };

    // 普通提示，只有"确定"
    const handleInfo = async () => {
        await showAlert("操作已完成", "success");
    };

    // 确认框，返回 "yes" | "no"
    const handleDelete = async () => {
        const res = await showAlert("确定要删除这条记录吗？", "warning", true);
        if (res === "yes") {
            await showAlert("已删除", "success");
        }
    };

    const handleError = async () => {
        await showAlert("网络请求失败，请稍后重试", "error");
    };

    const [listData] = useState(() => generateData(10000));

    // Tabs 相关状态
    const initialTabs: TabItem[] = [
        { key: 'home', label: '首页' },
        { key: 'profile', label: '个人中心' },
        { key: 'settings', label: '设置' },
        { key: 'disabled', label: '已禁用', disabled: true },
    ];

    const [tabs, setTabs] = useState<TabItem[]>(initialTabs);
    const [activeKey, setActiveKey] = useState('home');
    let counter = tabs.length;

    /* ---- 切换 ---- */
    const handleChange = useCallback((key: string) => {
        setActiveKey(key);
    }, []);

    /* ---- 关闭 ---- */
    const handleClose = useCallback((key: string) => {
        setTabs((prev) => {
            const next = prev.filter((t) => t.key !== key);
            // 如果关闭的是当前激活的，切到相邻标签
            setActiveKey((currentKey) => {
                if (currentKey !== key) return currentKey;
                const idx = prev.findIndex((t) => t.key === key);
                const fallback = prev[idx + 1] || prev[idx - 1];
                return fallback?.key ?? '';
            });
            return next;
        });
    }, []);

    /* ---- 添加 ---- */
    const handleAdd = useCallback(() => {
        counter++;
        const newKey = `tab-${counter}`;
        const newTab: TabItem = { key: newKey, label: `新标签 ${counter}` };
        setTabs((prev) => [...prev, newTab]);
        setActiveKey(newKey);
    }, []);

    /* ---- 拖拽排序 ---- */
    const handleReorder = useCallback((reordered: TabItem[]) => {
        setTabs(reordered);
    }, []);

    /* ---- 渲染内容区域（由外部自行控制） ---- */
    const renderContent = () => {
        switch (activeKey) {
            case 'home':
                return <div>首页内容</div>;
            case 'profile':
                return <div>个人中心内容</div>;
            case 'settings':
                return <div>设置内容</div>;
            default:
                return <div>标签 {activeKey} 的内容</div>;
        }
    };

    // SideBar
    const [selectedKey, setSelectedKey] = useState('home');
    const [collapsed, setCollapsed] = useState(false);

    /* SVG 图标示例 */
    const HomeIcon = (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const SearchIcon = (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="7" strokeWidth="1.5"/>
            <path d="M16.5 16.5L21 21" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    );

    const SettingsIcon = (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" strokeWidth="1.5"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33
               1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06
               a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15 1.65 1.65 0 003.17 14H3a2 2 0 010-4h.09
               A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009
               4.68 1.65 1.65 0 0010 3.17V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06
               a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09
               a1.65 1.65 0 00-1.51 1z"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const UserIcon = (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="8" r="4" strokeWidth="1.5"/>
            <path d="M20 21a8 8 0 00-16 0" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    );

    /* ========== 菜单数据 ========== */

    const menuItems: SideBarItem[] = [
        { key: 'home',     label: '首页',   icon: HomeIcon },
        { key: 'search',   label: '搜索',   icon: SearchIcon },
        { key: 'profile',  label: '个人',   icon: UserIcon },
        { key: 'settings', label: '设置',   icon: SettingsIcon },
        { key: 'disabled', label: '禁用项', icon: HomeIcon, disabled: true },
    ];

    return (
        <div style={{
            padding: 40,
            display: "flex",
            flexDirection: "column",
            gap: 20
        }}>
            {/* 基础用法 */}
            <Button>默认主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>

            {/* 语义色 */}
            <Button variant="danger">删除</Button>
            <Button variant="success">确认</Button>
            <Button variant="warning">警告</Button>

            {/* 尺寸 */}
            <Button size="xs">超小</Button>
            <Button size="sm">小</Button>
            <Button size="lg">大</Button>
            <Button size="xl">超大</Button>

            {/* 带图标 */}
            <Button iconLeft="←">返回</Button>
            <Button iconRight="→">前进</Button>
            <Button iconOnly iconLeft="★"/>

            {/* 状态 */}
            <Button disabled>禁用</Button>
            <Button block>块级按钮</Button>

            {/* 按钮组 */}
            <ButtonGroup>
                <Button variant="secondary">左</Button>
                <Button variant="secondary">中</Button>
                <Button variant="secondary">右</Button>
            </ButtonGroup>

            <ButtonGroup>
                <Button variant="outline">左</Button>
                <Button variant="secondary">右</Button>
            </ButtonGroup>

            {/* 工具栏 */}
            <ButtonToolbar align="right">
                <Button variant="outline">取消</Button>
                <Button variant="primary">保存</Button>
            </ButtonToolbar>

            <ButtonToolbar align="center">
                <Button variant="outline">取消</Button>
                <Button variant="primary">确认</Button>
            </ButtonToolbar>

            {/* CheckButton */}
            <CheckButton/>
            <CheckButton labelLeft="关" labelRight="开"/>
            <CheckButton
                checked={enabled}
                onChange={setEnabled}
                labelRight="设置主题"
            />
            <CheckButton labelColor={'#533236'} thumbBackground={'#f1f1f1'} labelRight={"nihao"} size="sm"/>
            <CheckButton trackBackground={'#00f'} checkedTrackBackground={'#0f0'} size="md"/>
            <CheckButton size="lg"/>
            <CheckButton disabled/>
            <CheckButton disabled checked labelRight="已锁定"/>

            {/* Alert */}
            Alert 组件
            <Button onClick={handleInfo}>成功提示</Button>
            <Button onClick={handleDelete}>删除确认</Button>
            <Button onClick={handleError}>错误提示</Button>

            {/* RollingBox */}
            {/* auto — 默认，hover/滚动时显示 */}
            <RollingBox style={{
                height: '200px',
                border: '1px solid var(--fc-color-border, #ccc)',
                padding: '10px',
                borderRadius: 'var(--fc-radius-md, 5px)'
            }}>
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    auto（默认）：hover 或滚动时显示滚动条
                </div>
            </RollingBox>

            {/* auto — 自定义 hover/滚动颜色 */}
            <RollingBox
                thumbHoverColor="#6366f1"
                thumbActiveColor="#4f46e5"
                style={{
                    height: '200px',
                    border: '1px solid var(--fc-color-border, #ccc)',
                    padding: '10px',
                    borderRadius: 'var(--fc-radius-md, 5px)'
                }}
            >
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    auto + thumbHoverColor / thumbActiveColor：hover 时紫色，滚动中深紫色
                </div>
            </RollingBox>

            {/* show — 始终显示，自定义颜色 */}
            <RollingBox
                showThumb="show"
                thumbColor="#10b981"
                style={{
                    height: '200px',
                    border: '1px solid var(--fc-color-border, #ccc)',
                    padding: '10px',
                    borderRadius: 'var(--fc-radius-md, 5px)'
                }}
            >
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    show + thumbColor：始终显示绿色滚动条
                </div>
            </RollingBox>

            {/* show + showTrack — 自定义轨道颜色 */}
            <RollingBox
                showThumb="show"
                thumbSize="thin"
                showTrack
                thumbColor="#6366f1"
                trackColor="var(--fc-color-bg-secondary)"
                style={{
                    height: '200px',
                    border: '1px solid var(--fc-color-border, #ccc)',
                    padding: '10px',
                    borderRadius: 'var(--fc-radius-md, 5px)'
                }}
            >
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    show + showTrack + thumbColor + trackColor：紫色滚动条 + 自定义轨道背景
                </div>
            </RollingBox>

            {/* hide — 隐藏滚动条 */}
            <RollingBox showThumb="hide" style={{
                height: '200px',
                border: '1px solid var(--fc-color-border, #ccc)',
                padding: '10px',
                borderRadius: 'var(--fc-radius-md, 5px)'
            }}>
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    hide：隐藏滚动条，内容仍可滚动
                </div>
            </RollingBox>

            {/* horizontal — 水平滚动 */}
            <RollingBox
                horizontal
                showThumb="show"
                thumbColor="#f59e0b"
                style={{
                    border: '1px solid var(--fc-color-border, #ccc)',
                    padding: '10px',
                    borderRadius: 'var(--fc-radius-md, 5px)'
                }}
            >
                <div style={{width: '2000px', display: 'flex', gap: '40px', color: 'var(--fc-color-text)'}}>
                    {Array.from({length: 20}, (_, i) => (
                        <div key={i}>列 {i + 1}</div>
                    ))}
                </div>
            </RollingBox>

            {/* Input */}
            <Input
                size="lg"
                prefix="@"
                suffix=".com"
                passwordToggle
                allowClear
                status="success"
                helperText="格式正确"
            />

            {/* Slider */}
            {/* 基础 — 默认水平，step=1 */}
            <Slider defaultValue={30} tooltip/>

            {/* step=10，marks 标出每个步进点 */}
            <Slider
                min={0} max={100} step={10}
                defaultValue={40}
                marks={{0: '0', 10: '10', 20: '20', 30: '30', 40: '40', 50: '50', 60: '60', 70: '70', 80: '80', 90: '90', 100: '100'}}
                tooltip
            />

            {/* range 双滑块 + marks */}
            <Slider
                range min={0} max={100} defaultValue={[20, 80]}
                marks={{0: '0%', 50: '50%', 100: '100%'}}
                tooltip
            />

            {/* 自定义颜色 */}
            <Slider
                defaultValue={60}
                tooltip
                fillBackground="#10b981"
                thumbBackground="#fff"
                thumbBorderColor="#10b981"
                tooltipBackground="#10b981"
                tooltipColor="#fff"
            />

            {/* 禁用 */}
            <Slider defaultValue={40} disabled/>

            {/* 垂直 + 自定义颜色 */}
            <div style={{display: 'flex', gap: '32px', height: '220px', alignItems: 'center'}}>
                <Slider orientation="vertical" defaultValue={30} tooltip/>
                <Slider
                    orientation="vertical" defaultValue={70}
                    tooltip
                    fillBackground="#6366f1"
                    thumbBorderColor="#6366f1"
                    tooltipBackground="#6366f1"
                    tooltipColor="#fff"
                />
                <Slider
                    orientation="vertical"
                    min={0} max={100} step={20}
                    defaultValue={60}
                    marks={{0: '0', 50: '50', 100: '100'}}
                    tooltip
                />
            </div>

            {/* Select */}
            {/* 基础 */}
            <Select
                options={[
                    {value: '1', label: '选项1'},
                    {value: '2', label: '选项2'},
                    {value: '3', label: '选项3'},
                ]}
            />

            {/* 分组 + 可搜索 */}
            <Select
                options={[
                    {value: '1', label: '选项1', group: '分组A'},
                    {value: '2', label: '选项2', group: '分组A'},
                    {value: '3', label: '选项3', group: '分组B'},
                    {value: '4', label: '选项4', group: '分组B'},
                    {value: '5', label: '选项5（禁用）', group: '分组B', disabled: true},
                ]}
                searchable
            />

            {/* 多选 */}
            <Select
                options={[
                    {value: '1', label: '苹果'},
                    {value: '2', label: '香蕉'},
                    {value: '3', label: '橙子'},
                    {value: '4', label: '葡萄'},
                ]}
                multiple
                placeholder="请选择水果"
            />

            {/* 虚拟滚动（大量选项） */}
            <Select
                options={Array.from({length: 200}, (_, i) => ({
                    value: String(i),
                    label: `选项 ${i + 1}`,
                }))}
                searchable
                virtualScroll
                placeholder="从200个选项中搜索"
            />

            {/* 自定义颜色 */}
            <Select
                options={[
                    {value: '1', label: '选项1'},
                    {value: '2', label: '选项2'},
                    {value: '3', label: '选项3'},
                ]}
                defaultValue="2"
                selectedColor="#10b981"
                selectedBackground="#d1fae5"
                hoverBackground="#f0fdf4"
            />

            {/* 禁用 */}
            <Select
                options={[{value: '1', label: '选项1'}]}
                defaultValue="1"
                disabled
            />

            {/* SideBar */}
            <div style={{ display: 'flex', height: '100vh' }}>
                <SideBar
                    items={menuItems}
                    selectedKey={selectedKey}
                    collapsed={collapsed}
                    onSelect={setSelectedKey}
                    onCollapse={setCollapsed}
                />
                <main style={{ flex: 1, padding: 24 }}>
                    当前选中：{selectedKey}
                </main>
            </div>
            <SideBar
                items={menuItems}
                selectedKey={selectedKey}
                collapsed={collapsed}
                width={280}
                collapsedWidth={56}
                onSelect={setSelectedKey}
                onCollapse={setCollapsed}
            />
            <SideBar
                items={menuItems}
                selectedKey={selectedKey}
                collapsed={collapsed}
                onSelect={setSelectedKey}
                onCollapse={setCollapsed}
                style={{
                    '--sidebar-item-selected-bg': '#e8f5e9',
                    '--sidebar-item-selected-color': '#2e7d32',
                    '--sidebar-item-hover-bg': '#f1f8e9',
                    '--sidebar-item-hover-color': '#33691e',
                } as React.CSSProperties}
            />

            {/* Tree */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0',
                height: '800px'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>Tree 分类树组件测试</h3>
                <TreeDemo/>
            </div>

            {/* Chat 组件 */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>AI 智能助手</h3>
                <div style={{height: '600px', maxWidth: '800px', margin: '0 auto'}}>
                    <Chat
                        messages={chatMessages}
                        onSendMessage={handleSendMessage}
                        title="AI 智能助手"
                        placeholder="输入你的问题，按 Enter 发送..."
                        loading={chatLoading}
                        userName="我"
                        assistantName="AI助手"
                        maxInputLength={2000}
                        autoFocus={true}
                        showHeader={true}
                        showFooter={true}
                    />
                </div>
                <div style={{marginTop: 10, display: 'flex', justifyContent: 'center', gap: 10}}>
                    <Button size="sm" onClick={clearChat}>清空聊天记录</Button>
                </div>
            </div>

            {/* 懒加载演示 */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>懒加载演示</h3>
                <Button onClick={() => setShowLazy(!showLazy)}>
                    {showLazy ? '隐藏' : '加载'}懒加载内容
                </Button>
                {showLazy && <LazyContent/>}
            </div>

            {/* Avatar组件测试 */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>Avatar 头像组件测试</h3>
                <div style={{marginBottom: 20}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)'}}>尺寸变体</h4>
                    <div style={{display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                        <Avatar size="xs"/>
                        <Avatar size="sm"/>
                        <Avatar size="md"/>
                        <Avatar size="lg"/>
                        <Avatar size="xl"/>
                    </div>
                </div>
                <div style={{marginBottom: 20}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)'}}>形状</h4>
                    <div style={{display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap'}}>
                        <Avatar shape="circle"/>
                        <Avatar shape="square"/>
                    </div>
                </div>
            </div>

            {/* ListGroup组件测试 */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>ListGroup 列表组组件测试</h3>
                <div style={{marginBottom: 30, maxWidth: 300}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)'}}>基础列表组</h4>
                    <ListGroup>
                        <ListGroupItem>列表项 1</ListGroupItem>
                        <ListGroupItem>列表项 2</ListGroupItem>
                        <ListGroupItem>列表项 3</ListGroupItem>
                    </ListGroup>
                </div>
                <div style={{marginBottom: 30, maxWidth: 300}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)'}}>带激活状态</h4>
                    <ListGroup>
                        <ListGroupItem
                            active={selectedItem === '1'}
                            onClick={() => setSelectedItem('1')}
                        >
                            首页
                        </ListGroupItem>
                        <ListGroupItem
                            active={selectedItem === '2'}
                            onClick={() => setSelectedItem('2')}
                        >
                            个人中心
                        </ListGroupItem>
                        <ListGroupItem
                            active={selectedItem === '3'}
                            onClick={() => setSelectedItem('3')}
                        >
                            设置
                        </ListGroupItem>
                    </ListGroup>
                    <p style={{color: 'var(--fc-color-text-secondary)'}}>当前选中: {selectedItem}</p>
                </div>
                <div style={{marginBottom: 30, maxWidth: 300}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)'}}>禁用状态</h4>
                    <ListGroup>
                        <ListGroupItem>可用选项</ListGroupItem>
                        <ListGroupItem disabled>禁用选项</ListGroupItem>
                        <ListGroupItem>另一个可用选项</ListGroupItem>
                    </ListGroup>
                </div>
            </div>

            {/* VirtualList 虚拟列表测试 */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>
                    VirtualList 虚拟列表组件测试 (10000条数据)
                </h3>
                <div style={{display: 'flex', gap: 20, flexWrap: 'wrap'}}>
                    <div style={{flex: 1, minWidth: 300}}>
                        <h4 style={{color: 'var(--fc-color-text-secondary)'}}>基础样式</h4>
                        <VirtualList
                            data={listData}
                            height={400}
                            itemHeight={60}
                            renderItem={(item, _index) => (
                                <div style={{
                                    height: 60,
                                    padding: '10px 15px',
                                    borderBottom: '1px solid var(--fc-color-border-light, #f0f0f0)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    backgroundColor: 'transparent'
                                }}>
                                    <Avatar src={item.avatar} size="sm"/>
                                    <div>
                                        <div style={{fontWeight: 'bold', color: 'var(--fc-color-text)'}}>
                                            {item.title}
                                        </div>
                                        <div
                                            style={{fontSize: '12px', color: 'var(--fc-color-text-secondary)'}}>
                                            {item.description}
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                    <div style={{flex: 1, minWidth: 300}}>
                        <h4 style={{color: 'var(--fc-color-text-secondary)'}}>简洁样式</h4>
                        <VirtualList
                            data={listData}
                            height={400}
                            itemHeight={40}
                            renderItem={(item, index) => (
                                <div style={{
                                    height: 40,
                                    lineHeight: '40px',
                                    padding: '0 15px',
                                    borderBottom: '1px solid var(--fc-color-border-light, #eee)',
                                    fontSize: '14px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--fc-color-text)'
                                }}>
                                    {index}: {item.title}
                                </div>
                            )}
                        />
                    </div>
                </div>
                <div style={{marginTop: 30}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)'}}>卡片样式</h4>
                    <VirtualList
                        data={listData.slice(0, 5000)}
                        height={400}
                        itemHeight={80}
                        renderItem={(item) => (
                            <div style={{
                                height: 70,
                                margin: '5px 10px',
                                padding: '10px 15px',
                                backgroundColor: 'var(--fc-color-bg-elevated, #fff)',
                                border: '1px solid var(--fc-color-border, #e0e0e0)',
                                borderRadius: 'var(--fc-radius-md, 8px)',
                                boxShadow: 'var(--fc-shadow-sm, 0 2px 4px rgba(0,0,0,0.05))',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <Avatar src={item.avatar} size="md"/>
                                <div>
                                    <div style={{
                                        fontWeight: 'bold',
                                        marginBottom: '4px',
                                        color: 'var(--fc-color-text)'
                                    }}>
                                        {item.title}
                                    </div>
                                    <div style={{fontSize: '12px', color: 'var(--fc-color-text-secondary)'}}>
                                        {item.description}
                                    </div>
                                </div>
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* Card 图文卡片组件测试 */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>Card 图文卡片组件测试</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 24
                }}>
                    <Card
                        image="https://picsum.photos/id/1015/400/300"
                        title="秋日山林"
                        description="金秋时节，山林被染成了金黄色，漫步其中感受大自然的馈赠。"
                        variant="shadow"
                        hoverable
                    />
                    <Card
                        title="纯文字卡片"
                        description="即使没有图片，卡片也能正常显示。"
                        extraInfo="📝 发布于 2024-01-01"
                        variant="bordered"
                    />
                </div>
            </div>

            {/* TabBar 只负责标签栏 */}
            <div>
                <h3>贴合模式（默认）</h3>
                <TabBar
                    items={tabs}
                    activeKey={activeKey}
                    variant="attached"
                    closable
                    addable
                    draggable
                    onChange={setActiveKey}
                    onClose={(key) => {
                        setTabs((prev) => prev.filter((t) => t.key !== key));
                        if (activeKey === key) {
                            const idx = tabs.findIndex((t) => t.key === key);
                            setActiveKey(tabs[idx + 1]?.key || tabs[idx - 1]?.key || '');
                        }
                    }}
                    onAdd={() => {
                        const k = `tab-${Date.now()}`;
                        setTabs((prev) => [...prev, { key: k, label: `新标签` }]);
                        setActiveKey(k);
                    }}
                    onReorder={setTabs}
                />
                <div style={{ padding: 16 }}>当前：{activeKey}</div>
            </div>

            <div>
                <h3>悬浮模式</h3>
                <TabBar
                    items={initialTabs}
                    activeKey={activeKey}
                    variant="floating"
                    onChange={setActiveKey}
                />
                <div style={{ padding: 16 }}>当前：{activeKey}</div>
            </div>

            <div>
                <h3>自定义颜色（Props 注入）</h3>
                <TabBar
                    items={initialTabs}
                    activeKey={activeKey}
                    variant="floating"
                    onChange={setActiveKey}
                    tabHoverColor="#e65100"
                    tabHoverBackground="#fff3e0"
                    tabActiveColor="#e65100"
                    tabActiveBackground="#ffe0b2"
                />
            </div>

            <div>
                <h3>自定义背景色 + 指示器颜色（attached）</h3>
                <TabBar
                    items={initialTabs}
                    activeKey={activeKey}
                    variant="attached"
                    onChange={setActiveKey}
                    background="#1e1e2e"
                    tabColor="#a0a0b0"
                    tabHoverColor="#ffffff"
                    tabHoverBackground="#2a2a3e"
                    tabActiveColor="#c084fc"
                    tabActiveBackground="#2a2a3e"
                    activeIndicatorColor="#c084fc"
                />
            </div>

            <div>
                <h3>方式二：className 覆盖</h3>
                <TabBar
                    items={initialTabs}
                    activeKey={activeKey}
                    variant="floating"
                    tabClassName="my-tab"
                    activeTabClassName="my-tab-active"
                    onChange={setActiveKey}
                />
            </div>

            <div>
                <h3>方式三：inline style 覆盖</h3>
                <TabBar
                    items={initialTabs}
                    activeKey={activeKey}
                    variant="floating"
                    tabStyle={{ fontWeight: 500, letterSpacing: '0.02em' }}
                    activeTabStyle={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: '#fff',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                    }}
                    onChange={setActiveKey}
                />
            </div>

            <div>
                <h3>attached + tabRadius（四周圆角的贴合标签）</h3>
                <TabBar
                    items={initialTabs}
                    activeKey={activeKey}
                    variant="attached"
                    tabRadius="md"
                    onChange={setActiveKey}
                />

                <h3 style={{ marginTop: 24 }}>floating + tabRadius="lg"</h3>
                <TabBar
                    items={initialTabs}
                    activeKey={activeKey}
                    variant="floating"
                    tabRadius="lg"
                    onChange={setActiveKey}
                />
            </div>
        </div>
    );
}