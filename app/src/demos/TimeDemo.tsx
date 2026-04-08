import React from 'react';
import { Timeline } from 'flowcloudai-ui';

const TimeDemo: React.FC = () => {
    const events = [
        {
            id: '1',
            title: '项目启动',
            startTime: new Date('2023-01-15').getTime(),
            date: '2023年1月',
            description: '项目正式立项',
            color: '#3b82f6', // 蓝色
        },
        {
            id: '2',
            title: '原型设计完成',
            startTime: new Date('2023-04-20').getTime(),
            date: '2023年4月',
            description: '完成高保真原型',
            color: '#8b5cf6', // 紫色
        },
        {
            id: '3',
            title: 'Alpha 版本发布',
            startTime: new Date('2023-08-10').getTime(),
            date: '2023年8月',
            description: '内部测试版本上线',
            color: '#10b981', // 绿色
        },
        {
            id: '4',
            title: '公测开始',
            startTime: new Date('2024-01-05').getTime(),
            date: '2024年1月',
            description: '向公众开放测试',
            color: '#f59e0b', // 橙色
        },
        {
            id: '5',
            title: '2.0 版本迭代',
            startTime: new Date('2024-06-15').getTime(),
            date: '2024年6月',
            description: '重大功能更新',
            color: '#ec4899', // 粉色
        }
    ];

    return (
        <div className="w-full pl-16">
            <Timeline 
                events={events} 
                width={1100}
                height={280}
                showScale={true}
                timeFormat={(time: number) => new Date(time).getFullYear().toString()}
            />
        </div>
    );
};

export default TimeDemo;