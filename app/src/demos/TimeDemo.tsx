// TimeDemo.tsx（保持不变）
import React from 'react';
import { Timeline, type TimelineEvent } from 'flowcloudai-ui';

const TimeDemo: React.FC = () => {
    const events: TimelineEvent[] = [
        {
            id: '1',
            title: '项目启动',
            startTime: new Date('2023-01-15').getTime(),
            date: '2023年1月',
            description: '项目正式立项，确定核心目标与范围。',
            color: '#3b82f6',
        },
        {
            id: '2',
            title: '原型设计完成',
            startTime: new Date('2023-04-20').getTime(),
            date: '2023年4月',
            description: '完成高保真原型设计，通过初步评审。',
            color: '#8b5cf6',
        },
        {
            id: '3',
            title: 'Alpha 版本发布',
            startTime: new Date('2023-08-10').getTime(),
            date: '2023年8月',
            description: '内部测试版本上线，开始小范围功能验证。',
            color: '#10b981',
        },
        {
            id: '4',
            title: '公测开始',
            startTime: new Date('2024-01-05').getTime(),
            date: '2024年1月',
            description: '向公众开放测试，收集用户反馈并优化体验。',
            color: '#f59e0b',
        },
        {
            id: '5',
            title: '2.0 版本迭代',
            startTime: new Date('2024-06-15').getTime(),
            endTime: new Date('2024-12-31').getTime(),
            date: '2024年6月',
            description: '重大功能更新，引入 AI 辅助模块。',
            color: '#ec4899',
        },
        {
            id: '6',
            title: '年度总结大会',
            startTime: new Date('2024-12-20').getTime(),
            description: '回顾全年成果，规划下一年度战略方向。',
            color: '#6366F1',
        }
    ];

    return (
        <div className="w-full">
            <Timeline events={events} />
        </div>
    );
};

export default TimeDemo;