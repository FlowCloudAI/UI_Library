import React, {useState} from 'react';
import {Timeline, type TimelineEvent} from 'flowcloudai-ui';

const TimeDemo: React.FC = () => {
    // 时间范围配置
    const timeRange = {
        start: -150,  // 公元前150年
        end: 650,     // 公元650年
    };

    // ============ 受控选中状态 ============
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // ============ 事件数据集 ============
    const events: TimelineEvent[] = [
        {
            id: '1',
            title: '圣火教的建立',
            startTime: -100,
            description: '第二帝国 1400年',
        },
        {
            id: '2',
            title: '第二帝国完全体',
            startTime: -30,
            endTime: 0,
            description: '第二帝国 147年（时间段事件）',
        },
        {
            id: '3',
            title: '神圣王国建立',
            startTime: 0,
            description: '从圣国诞生至大异变 元年',
        },
        {
            id: '4',
            title: '黑色沙漠城与蜂巢族出现',
            startTime: 10,
            description: '从圣国诞生至大异变 10年',
        },
        {
            id: '5',
            title: '联合都市的建立',
            startTime: 30,
            endTime: 600,
            description: '从圣国诞生至大异变 30年 → 600年（长跨度事件）',
        },
        {
            id: '6',
            title: '大异变事件',
            startTime: 200,
            endTime: 250,
            description: '重大历史转折',
        },
    ];

    // ============ 第二个时间轴的数据（不同范围）============
    const timeRange2 = {
        start: 0,
        end: 400,
    };

    const events2: TimelineEvent[] = [
        {
            id: '101',
            title: '新纪元开始',
            startTime: 0,
            description: '历史新阶段的起点',
        },
        {
            id: '102',
            title: '扩张期',
            startTime: 50,
            endTime: 200,
            description: '领土扩张的黄金时期',
        },
        {
            id: '103',
            title: '繁荣阶段',
            startTime: 200,
            endTime: 350,
            description: '经济和文化的顶峰',
        },
        {
            id: '104',
            title: '衰落期',
            startTime: 350,
            description: '开始走向衰退',
        },
    ];

    return (
        <div style={{padding: 20}}>
            <div style={{marginBottom: 40}}>
                <h2>Timeline 组件功能演示</h2>

                {/* ============ 功能说明 ============ */}
                <div style={{
                    backgroundColor: '#f0f2f5',
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 24,
                    fontSize: 12,
                    lineHeight: 1.6,
                    color: '#666',
                }}>
                    <p><strong>📌 功能展示：</strong></p>
                    <ul style={{margin: '8px 0', paddingLeft: 20}}>
                        <li>✅ <strong>受控选中</strong>：点击事件卡片更新 selectedEventId，下方显示当前选中</li>
                        <li>✅ <strong>单点事件</strong>：仅有 startTime 的事件（如"圣火教的建立"）</li>
                        <li>✅ <strong>时间段事件</strong>：有 startTime 和 endTime 的事件（如"第二帝国完全体"）</li>
                        <li>✅ <strong>多实例同步</strong>：两个 Timeline 组件共用 syncId，scroll 位置保持同步</li>
                        <li>✅ <strong>自适应缩放</strong>：鼠标滚轮在时间轴下方缩放，卡片宽度平滑响应</li>
                        <li>✅ <strong>拖拽滚动</strong>：可拖拽时间轴进行平移</li>
                    </ul>
                </div>

                {/* ============ 当前选中状态 ============ */}
                <div style={{
                    backgroundColor: '#e6f7ff',
                    padding: 12,
                    borderRadius: 6,
                    marginBottom: 20,
                    fontSize: 14,
                }}>
                    <strong>当前选中事件：</strong>{' '}
                    {selectedEventId ? (
                        <span style={{color: '#1890ff', fontWeight: 'bold'}}>
                            {events.find(e => e.id === selectedEventId)?.title ||
                                events2.find(e => e.id === selectedEventId)?.title || '未知'}
                            {' '}
                            <button
                                onClick={() => setSelectedEventId(null)}
                                style={{
                                    marginLeft: 12,
                                    padding: '4px 12px',
                                    background: '#1890ff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontSize: 12,
                                }}
                            >
                                取消选中
                            </button>
                        </span>
                    ) : (
                        <span style={{color: '#999'}}>无（点击任意事件卡片选中）</span>
                    )}
                </div>

                {/* ============ 第一个时间轴 ============ */}
                <div>
                    <h3>Timeline 1: 完整历史（-150 ~ 650 年）</h3>
                    <p style={{fontSize: 12, color: '#999', marginBottom: 12}}>
                        演示：受控选中、多种事件类型、多实例同步
                    </p>
                    <div style={{height: 400, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden'}}>
                        <Timeline
                            events={events}
                            yearStart={timeRange.start}
                            yearEnd={timeRange.end}
                            syncId="demo-timeline-group"
                            selectedEventId={selectedEventId}
                            onEventSelect={setSelectedEventId}
                        />
                    </div>
                </div>

                {/* ============ 第二个时间轴（演示同步） ============ */}
                <div style={{marginTop: 32}}>
                    <h3>Timeline 2: 近代历史（0 ~ 400 年）</h3>
                    <p style={{fontSize: 12, color: '#999', marginBottom: 12}}>
                        演示：多实例 scroll 同步（与 Timeline 1 共享 syncId）、不同时间范围
                    </p>
                    <div style={{height: 400, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden'}}>
                        <Timeline
                            events={events2}
                            yearStart={timeRange2.start}
                            yearEnd={timeRange2.end}
                            syncId="demo-timeline-group"
                            selectedEventId={selectedEventId}
                            onEventSelect={setSelectedEventId}
                        />
                    </div>
                </div>

                {/* ============ 交互提示 ============ */}
                <div style={{
                    marginTop: 24,
                    padding: 16,
                    backgroundColor: '#f9f9f9',
                    borderLeft: '4px solid #1890ff',
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#555',
                }}>
                    <strong>🎮 交互方式：</strong>
                    <ul style={{margin: '8px 0', paddingLeft: 20}}>
                        <li>🖱️ <strong>滚轮缩放</strong>：将鼠标移到时间轴下方的刻度区域，滚动鼠标滚轮可缩放</li>
                        <li>👆 <strong>拖拽平移</strong>：在时间轴上点击并拖动可以左右移动</li>
                        <li>🔍 <strong>事件选中</strong>：点击任意事件卡片可选中，卡片背景变色</li>
                        <li>🔗 <strong>同步滚动</strong>：两个时间轴的 scroll 位置保持同步（通过 syncId）</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TimeDemo;
