import React, { useMemo, useRef, useState, useEffect } from 'react';
import './Time.css';

export interface TimelineEvent {
    id: string;
    title: string;
    startTime: number;      // 核心定位字段，必须
    endTime?: number;       // 可选，存在即时间段事件
    date?: string;          // 手动覆盖显示文本，优先级高于 startTime 格式化
    description?: string;
    color?: string;
}

interface TimelineProps {
    events: TimelineEvent[];
}

// 预设配色组
const COLOR_PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

// 工具函数：格式化日期
const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}年${month}月`;
};

// 工具函数：计算时间跨度文本
const formatDuration = (start: number, end: number): string => {
    const diff = end - start;
    const msPerDay = 86400000;
    const msPerMonth = msPerDay * 30;
    const msPerYear = msPerDay * 365;

    if (diff < msPerMonth) {
        const days = Math.floor(diff / msPerDay);
        return `${days}天`;
    } else if (diff < msPerYear) {
        const months = Math.floor(diff / msPerMonth);
        return `${months}个月`;
    } else {
        const years = Math.floor(diff / msPerYear);
        return `${years}年`;
    }
};

// 工具函数：智能刻度单位（增强版）
const getTimeUnit = (duration: number): { unit: string; step: number } => {
    const msPerHour = 3600000;
    const msPerDay = 86400000;
    const msPerMonth = msPerDay * 30;
    const msPerYear = msPerDay * 365;
    const msPerMyriad = msPerYear * 10000;

    if (duration < msPerDay) return { unit: 'hour', step: msPerHour };
    if (duration < msPerMonth * 3) return { unit: 'day', step: msPerDay };
    if (duration < msPerYear * 5) return { unit: 'month', step: msPerMonth };
    if (duration < msPerYear * 200) return { unit: 'year', step: msPerYear };
    if (duration < msPerMyriad) return { unit: 'century', step: msPerYear * 100 };
    return { unit: 'myriad', step: msPerYear * 10000 };
};

// 工具函数：格式化刻度标签（支持 BCE/CE）
const formatTickLabel = (timestamp: number, unit: string): string => {
    const date = new Date(timestamp);
    let year = date.getFullYear();
    
    if (unit === 'hour') {
        return `${date.getHours()}:00`;
    } else if (unit === 'day') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    } else if (unit === 'month') {
        return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (unit === 'year') {
        return year < 0 ? `${-year} BCE` : `${year} CE`;
    } else if (unit === 'myriad') {
        const myriadYear = Math.floor(Math.abs(year) / 10000);
        return year < 0 ? `${myriadYear}万 BCE` : `${myriadYear}万 CE`;
    } else {
        // century
        const century = Math.floor(Math.abs(year) / 100) + 1;
        return year < 0 ? `${century}世纪 BCE` : `${century}世纪`;
    }
};

export function Timeline({ events }: TimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // 第一次渲染：计算基础布局
    const baseLayout = useMemo(() => {
        if (!events || events.length === 0) {
            return { minTime: 0, maxTime: 0, trackWidth: 800, timeRange: 0 };
        }

        const timestamps = events.map(e => e.startTime);
        const endTimes = events.filter(e => e.endTime).map(e => e.endTime!);
        const allTimes = [...timestamps, ...endTimes];
        
        const min = Math.min(...allTimes);
        const max = Math.max(...allTimes);
        const timeRange = max - min;

        if (timeRange === 0) {
            return { minTime: min, maxTime: max + 31536000000, trackWidth: 800, timeRange: 31536000000 };
        }

        const pixelsPerMs = 100 / (365 * 24 * 60 * 60 * 1000);
        const width = Math.max(timeRange * pixelsPerMs, 800);

        return { minTime: min, maxTime: max, trackWidth: width, timeRange };
    }, [events]);

    const { minTime, maxTime, trackWidth, timeRange } = baseLayout;

    // 第二次渲染：检测重叠并分组
    const eventGroups = useMemo(() => {
        if (!events || events.length === 0) return [];

        const sorted = [...events].sort((a, b) => a.startTime - b.startTime);
        
        const getPosition = (time: number) => {
            if (maxTime === minTime) return 0;
            return ((time - minTime) / (maxTime - minTime)) * trackWidth;
        };

        const groups: TimelineEvent[][] = [];
        let currentGroup: TimelineEvent[] = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const prevPos = getPosition(sorted[i - 1].startTime);
            const currPos = getPosition(sorted[i].startTime);
            const distance = Math.abs(currPos - prevPos);

            if (distance < 160) {
                currentGroup.push(sorted[i]);
            } else {
                groups.push(currentGroup);
                currentGroup = [sorted[i]];
            }
        }
        groups.push(currentGroup);

        return groups;
    }, [events, minTime, maxTime, trackWidth]);

    // 生成刻度（防溢出优化）
    const ticks = useMemo(() => {
        if (timeRange === 0) return [];
        const { unit } = getTimeUnit(timeRange);
        const minSpacing = 80; 
        const maxTicks = Math.floor(trackWidth / minSpacing);
        const timeStep = timeRange / maxTicks;
        
        const result = [];
        for (let i = 0; i <= maxTicks; i++) {
            const timestamp = minTime + (timeStep * i);
            const position = (i / maxTicks) * 100;
            result.push({
                timestamp,
                position,
                label: formatTickLabel(timestamp, unit)
            });
        }
        return result;
    }, [minTime, timeRange, trackWidth]);

    // 拖拽功能
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.clientX);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        if (isDragging) handleMouseUp();
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.clientX;
        const walk = (x - startX) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    useEffect(() => {
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

    // 组件挂载后初始化滚动位置为0
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = 0;
        }
    }, []);

    return (
        <div className="timeline-container">
            <div 
                className="timeline-scroll-area"
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <div className="timeline-track" style={{ width: trackWidth }}>
                    {/* 时间轴线 */}
                    <div className="timeline-line"></div>

                    {/* 刻度尺 */}
                    <div className="timeline-ticks">
                        {ticks.map((tick, idx) => (
                            <div
                                key={idx}
                                className="timeline-tick"
                                style={{ left: `${tick.position}%` }}
                            >
                                <div className="timeline-tick-line"></div>
                                <span className="timeline-tick-label">{tick.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* 渲染事件组 */}
                    {eventGroups.map((group, groupIndex) => {
                        const isTop = groupIndex % 2 === 0; // 奇上偶下
                        const color = group[0].color || COLOR_PALETTE[groupIndex % COLOR_PALETTE.length];
                        const firstEvent = group[0];
                        const firstPos = ((firstEvent.startTime - minTime) / (maxTime - minTime)) * 100;

                        return (
                            <div 
                                key={groupIndex} 
                                className={`timeline-group ${isTop ? 'top' : 'bottom'}`}
                                style={{ 
                                    left: `${firstPos}%`,
                                    '--group-color': color,
                                    '--group-index': groupIndex
                                } as React.CSSProperties}
                            >
                                {/* 主圆点 */}
                                <div className="timeline-main-dot" />
                                
                                {/* 主垂线 */}
                                <div className="timeline-main-connector" />

                                {/* 时间段标记（在时间轴上） */}
                                {firstEvent.endTime && (
                                    <div
                                        className="timeline-range-bar"
                                        style={{
                                            left: `${firstPos}%`,
                                            width: `${((firstEvent.endTime - firstEvent.startTime) / (maxTime - minTime)) * 100}%`,
                                            backgroundColor: `${color}30`
                                        }}
                                    />
                                )}

                                {/* 组内卡片堆叠 */}
                                {group.map((event, indexInGroup) => {
                                    const displayDate = event.date || formatDate(event.startTime);
                                    const durationText = event.endTime 
                                        ? formatDuration(event.startTime, event.endTime)
                                        : null;
                                    const cardColor = event.color || color;

                                    return (
                                        <div
                                            key={event.id}
                                            className="timeline-card-wrapper"
                                            style={{
                                                '--stack-index': indexInGroup,
                                                '--card-color': cardColor
                                            } as React.CSSProperties}
                                        >
                                            <div className="timeline-card">
                                                <div className="card-header">
                                                    <h3 className="card-title">{event.title}</h3>
                                                </div>
                                                {event.description && (
                                                    <p className="card-description">{event.description}</p>
                                                )}
                                                <div className="card-footer">
                                                    <span className="card-date">{displayDate}</span>
                                                    {durationText && (
                                                        <span className="card-duration">⏱️ {durationText}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
