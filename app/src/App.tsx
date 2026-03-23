import {Button, ButtonGroup, ButtonToolbar} from "flowcloudai-ui";
import {
    CheckButton, RollingBox, Input, Select, Slider, SideBar,
    Avatar, ListGroup, ListGroupItem, VirtualList, useAlert,
    lazyLoad, Card, Tabs, Chat
} from "flowcloudai-ui";
import { useTheme } from 'flowcloudai-ui';
import {useEffect, useState} from "react";
import {TreeDemo} from './TreeDemo'

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
    const [tabs, setTabs] = useState([
        {key: '1', label: '标签1', content: <div>内容1</div>},
        {key: '2', label: '标签2', content: <div>内容2</div>},
        {key: '3', label: '标签3', content: <div>内容3</div>},
    ]);
    const [activeKey, setActiveKey] = useState('1');
    const [controlledKey, setControlledKey] = useState('1');
    const [tabCount, setTabCount] = useState(3);

    // 新增标签
    const handleAdd = () => {
        const newKey = String(tabCount + 1);
        setTabs([
            ...tabs,
            {
                key: newKey,
                label: `标签${newKey}`,
                content: <div>新增内容{newKey}</div>
            }
        ]);
        setTabCount(tabCount + 1);
        setActiveKey(newKey);
    };

    // 删除标签
    const handleClose = (key: string) => {
        const newTabs = tabs.filter(tab => tab.key !== key);
        setTabs(newTabs);

        if (activeKey === key) {
            const closedIndex = tabs.findIndex(tab => tab.key === key);
            const nextTab = newTabs[closedIndex] || newTabs[closedIndex - 1];
            if (nextTab) {
                setActiveKey(nextTab.key);
            }
        }
    };

    // 半径选项
    const radiusOptions = ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const;

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
            <CheckButton size="sm"/>
            <CheckButton size="md"/>
            <CheckButton size="lg"/>
            <CheckButton disabled/>
            <CheckButton disabled checked labelRight="已锁定"/>

            {/* Alert */}
            Alert 组件
            <Button onClick={handleInfo}>成功提示</Button>
            <Button onClick={handleDelete}>删除确认</Button>
            <Button onClick={handleError}>错误提示</Button>

            {/* RollingBox */}
            <RollingBox style={{
                height: '300px',
                border: '1px solid var(--fc-color-border, #ccc)',
                padding: '10px',
                borderRadius: 'var(--fc-radius-md, 5px)'
            }}>
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox showThumb="show" style={{
                height: '300px',
                border: '1px solid var(--fc-color-border, #ccc)',
                padding: '10px',
                borderRadius: 'var(--fc-radius-md, 5px)'
            }}>
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox showThumb="hide" style={{
                height: '300px',
                border: '1px solid var(--fc-color-border, #ccc)',
                padding: '10px',
                borderRadius: 'var(--fc-radius-md, 5px)'
            }}>
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox horizontal showThumb="show" style={{
                height: '300px',
                border: '1px solid var(--fc-color-border, #ccc)',
                padding: '10px',
                borderRadius: 'var(--fc-radius-md, 5px)'
            }}>
                <div style={{width: '2000px', display: 'flex', color: 'var(--fc-color-text)'}}>
                    <div>内容1</div>
                    <div>内容2</div>
                    <div>内容3</div>
                    <div>内容4</div>
                </div>
            </RollingBox>

            <RollingBox
                showThumb="show"
                thumbSize="thin"
                showTrack
                style={{
                    height: '300px',
                    border: '1px solid var(--fc-color-border, #ccc)',
                    padding: '10px',
                    borderRadius: 'var(--fc-radius-md, 5px)'
                }}
            >
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox thumbSize="thick" style={{
                height: '300px',
                border: '1px solid var(--fc-color-border, #ccc)',
                padding: '10px',
                borderRadius: 'var(--fc-radius-md, 5px)'
            }}>
                <div style={{height: '1000px', color: 'var(--fc-color-text)'}}>
                    内容...
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
            <Slider range min={0} max={100} defaultValue={[20, 80]} tooltip
                    marks={{0: '0%', 50: '50%', 100: '100%'}}/>
            <Slider orientation="vertical"/>

            {/* Select */}
            <Select
                options={[
                    {value: '1', label: '选项1', group: '分组A'},
                    {value: '2', label: '选项2', group: '分组A'},
                    {value: '3', label: '选项3', group: '分组B'}
                ]}
                searchable
                multiple
                virtualScroll
            />

            {/* SideBar */}
            <SideBar
                items={[
                    {key: '1', label: '首页', icon: '🏠'},
                    {
                        key: '2', label: '设置', icon: '⚙️', children: [
                            {key: '2-1', label: '个人'},
                            {key: '2-2', label: '系统'}
                        ]
                    }
                ]}
                collapsed
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

            {/* Tabs 组件测试 */}
            <div style={{
                borderTop: '2px solid var(--fc-color-border, #eee)',
                margin: '20px 0',
                padding: '20px 0'
            }}>
                <h3 style={{marginBottom: 20, color: 'var(--fc-color-text)'}}>Tabs 标签页组件</h3>

                {/* 完整功能 */}
                <div style={{marginBottom: 30}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)', marginBottom: 12}}>
                        完整功能（可选择、可关闭、可新增、圆角）
                    </h4>
                    <div style={{marginBottom: 10, fontSize: 12, color: 'var(--fc-color-text-tertiary)'}}>
                        标签总数: {tabs.length} | 当前活跃: {activeKey}
                    </div>
                    <Tabs
                        radius="md"
                        closable
                        addable
                        activeKey={activeKey}
                        items={tabs}
                        onChange={(key) => {
                            console.log('切换到:', key);
                            setActiveKey(key);
                        }}
                        onClose={(key) => {
                            console.log('关闭:', key);
                            handleClose(key);
                        }}
                        onAdd={() => {
                            console.log('新增标签页');
                            handleAdd();
                        }}
                    />
                </div>

                {/* 禁用状态 */}
                <div style={{marginBottom: 30}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)', marginBottom: 12}}>
                        禁用状态
                    </h4>
                    <Tabs
                        radius="lg"
                        items={[
                            {key: '1', label: '可用', content: <div>正常内容</div>},
                            {key: '2', label: '禁用', disabled: true, content: <div>无法点击</div>},
                            {key: '3', label: '可用', content: <div>内容3</div>},
                        ]}
                        defaultActiveKey="1"
                    />
                </div>

                {/* 不同圆角展示 */}
                <div style={{marginBottom: 30}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)', marginBottom: 12}}>
                        圆角变化（none → sm → md → lg → xl → full）
                    </h4>
                    {radiusOptions.map(r => (
                        <div key={r} style={{marginBottom: 15}}>
                            <small style={{color: 'var(--fc-color-text-tertiary)'}}>{r}</small>
                            <Tabs
                                radius={r}
                                items={[
                                    {key: '1', label: 'Tab1', content: <div>内容</div>},
                                    {key: '2', label: 'Tab2', content: <div>内容</div>},
                                ]}
                                defaultActiveKey="1"
                            />
                        </div>
                    ))}
                </div>

                {/* 受控模式 */}
                <div style={{marginBottom: 30}}>
                    <h4 style={{color: 'var(--fc-color-text-secondary)', marginBottom: 12}}>
                        受控模式（可从外部按钮切换）
                    </h4>
                    <div style={{
                        marginBottom: 15,
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap'
                    }}>
                        {['1', '2', '3'].map(key => (
                            <button
                                key={key}
                                onClick={() => setControlledKey(key)}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: controlledKey === key
                                        ? 'var(--fc-color-primary, #1677ff)'
                                        : 'var(--fc-color-bg-tertiary, #f5f5f5)',
                                    color: controlledKey === key ? 'white' : 'var(--fc-color-text)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease'
                                }}
                            >
                                切换到标签{key}
                            </button>
                        ))}
                        <span style={{
                            padding: '6px 12px',
                            color: 'var(--fc-color-text-secondary)',
                            backgroundColor: 'var(--fc-color-bg-tertiary, #f5f5f5)',
                            borderRadius: '4px',
                            fontSize: 12
                        }}>
                            当前: {controlledKey}
                        </span>
                    </div>
                    <Tabs
                        radius="md"
                        activeKey={controlledKey}
                        items={[
                            {key: '1', label: '标签1', content: <div>内容1 - 受控模式</div>},
                            {key: '2', label: '标签2', content: <div>内容2 - 受控模式</div>},
                            {key: '3', label: '标签3', content: <div>内容3 - 受控模式</div>},
                        ]}
                        onChange={(key) => setControlledKey(key)}
                    />
                </div>
            </div>
        </div>
    );
}