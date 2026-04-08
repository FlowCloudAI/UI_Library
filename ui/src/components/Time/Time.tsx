import React, { useMemo, useRef, useState, useEffect } from 'react';
import './Time.css'; // 引入下面的CSS

export interface TimelineEvent {
    id: string;
    title: string;
    startTime: number; // 时间戳
    date: string;      // 显示的日期标签
    description?: string;
    color?: string;
}

interface TimelineProps {
    events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
    // 拖拽相关状态
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // 1. 计算时间轴的基本参数
    const { minTime, maxTime, trackWidth } = useMemo(() => {
        if (!events || events.length === 0) {
            return { minTime: 0, maxTime: 0, trackWidth: 800 };
        }

        const timestamps = events.map(e => e.startTime);
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);

        // 如果只有一个事件，或者所有事件时间相同，强制给一个基础宽度
        if (min === max) {
            return { minTime: min, maxTime: max + 31536000000, trackWidth: 800 }; // 增加1年宽度
        }

        // 正常计算宽度：每毫秒对应的像素比例 (这里设定大概 1年 = 100px)
        const duration = max - min;
        const pixelsPerMs = 100 / (365 * 24 * 60 * 60 * 1000);
        const width = Math.max(duration * pixelsPerMs, 800); // 最小宽度800px，保证能看

        return { minTime: min, maxTime: max, trackWidth: width };
    }, [events]);

    // 2. 计算单个事件的定位
    const getLeftPosition = (time: number) => {
        if (maxTime === minTime) return 0;
        const percentage = (time - minTime) / (maxTime - minTime);
        return percentage * 100; // 返回百分比，用于 CSS left
    };

    // 3. 拖拽功能
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.clientX);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.clientX;
        const walk = (x - startX) * 1.5; // 滚动速度倍数
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    useEffect(() => {
        // 防止拖拽时选中文本
        if (isDragging) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
        return () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isDragging]);

    return (
        <div className="timeline-container">
            {/* 滚动区域 */}
            <div 
                className="timeline-scroll-area"
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                {/* 实际的轨道 */}
                <div
                    className="timeline-track"
                    style={{ width: trackWidth }}
                >
                    {/* 背景线 */}
                    <div className="timeline-line"></div>

                    {/* 渲染事件点 */}
                    {events.map((event) => {
                        const leftPos = getLeftPosition(event.startTime);
                        return (
                            <div
                                key={event.id}
                                className="timeline-item"
                                style={{
                                    left: `${leftPos}%`,
                                    borderLeftColor: event.color || '#3b82f6'
                                }}
                            >
                                {/* 圆点 */}
                                <div
                                    className="timeline-dot"
                                    style={{ backgroundColor: event.color || '#3b82f6' }}
                                />

                                {/* 内容卡片 */}
                                <div className="timeline-content">
                                    {event.description && (
                                        <p className="timeline-desc">{event.description}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};