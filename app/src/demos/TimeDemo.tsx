import React, {useState} from 'react';
import {Timeline, type TimelineEvent} from 'flowcloudai-ui';

const TimeDemo: React.FC = () => {
    // 从外部/后端获取的时间范围
    const timeRange = {
        start: -150,  // 公元前150年
        end: 650,     // 公元650年
    };

    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

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
            description: '第二帝国 147年',
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
            description: '从圣国诞生至大异变 30年 → 600年',
        },
    ];

    return (
        <div className="w-full p-4" style={{height: 500}}>
            <Timeline

                events={events}
                yearStart={timeRange.start}
                yearEnd={timeRange.end}
                syncId="demo-timeline"
                selectedEventId={selectedEventId}
                onEventSelect={setSelectedEventId}
            />
        </div>
    );
};

export default TimeDemo;