// Time.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import './Time.css';

export interface TimelineEvent {
    id: string;
    title: string;
    startTime: number;
    endTime?: number;
    date?: string;
    description?: string;
    color?: string;
}

interface TimelineProps {
    events: TimelineEvent[];
}

const COLOR_PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

const formatDuration = (start: number, end: number): string => {
    const diff = end - start;
    const msPerDay = 86400000;
    const msPerMonth = msPerDay * 30;
    if (diff < msPerMonth) return `${Math.floor(diff / msPerDay)}天`;
    return `${Math.floor(diff / msPerMonth)}个月`;
};

const getTimeUnit = (duration: number): { unit: string; step: number } => {
    const msPerDay = 86400000;
    const msPerMonth = msPerDay * 30;
    const msPerYear = msPerDay * 365;
    if (duration < msPerDay * 3) return { unit: 'hour', step: 3600000 };
    if (duration < msPerMonth * 3) return { unit: 'day', step: msPerDay };
    if (duration < msPerYear * 5) return { unit: 'month', step: msPerMonth };
    return { unit: 'year', step: msPerYear };
};

const formatTickLabel = (timestamp: number, unit: string): string => {
    const date = new Date(timestamp);
    if (unit === 'hour') return `${date.getHours()}:00`;
    if (unit === 'day') return `${date.getDate()}日`;
    if (unit === 'month') return `${date.getMonth() + 1}月`;
    return `${date.getFullYear()}`;
};

export function Timeline({ events }: TimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const { minTime, maxTime, trackWidth, timeRange } = useMemo(() => {
        if (!events || events.length === 0) {
            return { minTime: 0, maxTime: 0, trackWidth: 1200, timeRange: 0 };
        }
        const allTimes = events.flatMap(e => [e.startTime, e.endTime || e.startTime]);
        const min = Math.min(...allTimes);
        const max = Math.max(...allTimes);
        const range = max - min || 31536000000;
        const minWidth = events.length * 220;
        const calculatedWidth = Math.max(Math.floor(range * (120 / (365 * 24 * 60 * 60 * 1000))), minWidth, 1200);
        return { minTime: min, maxTime: max, trackWidth: calculatedWidth, timeRange: range };
    }, [events]);

    const ticks = useMemo(() => {
        if (timeRange === 0) return [];
        const { unit } = getTimeUnit(timeRange);
        const maxTicks = Math.floor(trackWidth / 120);
        const step = timeRange / maxTicks;
        return Array.from({ length: maxTicks + 1 }, (_, i) => {
            const time = minTime + step * i;
            return {
                time,
                left: Math.floor(((time - minTime) / timeRange) * 100),
                label: formatTickLabel(time, unit)
            };
        });
    }, [minTime, timeRange, trackWidth]);

    const getPosition = (time: number) => {
        if (timeRange === 0) return 0;
        return Math.floor(((time - minTime) / timeRange) * trackWidth);
    };

    const eventGroups = useMemo(() => {
        if (!events || events.length === 0) return [];
        const sorted = [...events].sort((a, b) => a.startTime - b.startTime);
        const groups: { events: typeof sorted; leftPx: number; color: string }[] = [];
        let currentGroup: typeof sorted = [sorted[0]];
        let groupColor = sorted[0].color || COLOR_PALETTE[0];

        for (let i = 1; i < sorted.length; i++) {
            const prevPos = getPosition(sorted[i - 1].startTime);
            const currPos = getPosition(sorted[i].startTime);
            const distance = Math.abs(currPos - prevPos);

            if (distance < 200) {
                currentGroup.push(sorted[i]);
            } else {
                groups.push({
                    events: currentGroup,
                    leftPx: getPosition(currentGroup[0].startTime),
                    color: groupColor
                });
                currentGroup = [sorted[i]];
                groupColor = sorted[i].color || COLOR_PALETTE[i % COLOR_PALETTE.length];
            }
        }
        groups.push({
            events: currentGroup,
            leftPx: getPosition(currentGroup[0].startTime),
            color: groupColor
        });

        return groups;
    }, [events, minTime, maxTime, trackWidth, timeRange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = '';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    useEffect(() => {
        document.body.style.cursor = isDragging ? 'grabbing' : '';
    }, [isDragging]);

    const LEFT_OFFSET = 200;

    return (
        <div className="timeline-container">
            <div
                className="timeline-scroll-area"
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                <div className="timeline-track" style={{ width: trackWidth + LEFT_OFFSET * 2 }}>
                    <div className="timeline-line" style={{ left: LEFT_OFFSET, right: LEFT_OFFSET }}></div>

                    <div className="timeline-ticks" style={{ left: LEFT_OFFSET, right: LEFT_OFFSET }}>
                        {ticks.map((tick) => (
                            <div
                                key={tick.left}
                                className="timeline-tick"
                                style={{ left: `${tick.left}%` }}
                            >
                                <div className="tick-line"></div>
                                <span className="tick-label">{tick.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* 持续时间范围条 - 实色覆盖时间轴 */}
                    {eventGroups.map((group, groupIndex) => {
                        const firstEvent = group.events[0];
                        if (!firstEvent.endTime) return null;

                        // 正确计算范围：从 startTime 到 endTime
                        const startPx = group.leftPx;
                        const endPx = getPosition(firstEvent.endTime);
                        const rangeWidth = endPx - startPx;

                        if (rangeWidth <= 0) return null;

                        return (
                            <div
                                key={`range-${groupIndex}`}
                                className="timeline-range-bar"
                                style={{
                                    left: LEFT_OFFSET + startPx,
                                    width: rangeWidth,
                                    backgroundColor: group.color || COLOR_PALETTE[groupIndex % COLOR_PALETTE.length]
                                }}
                            />
                        );
                    })}

                    {eventGroups.map((group, groupIndex) => {
                        const groupColor = group.color || COLOR_PALETTE[groupIndex % COLOR_PALETTE.length];
                        const firstEvent = group.events[0];
                        const hasDuration = !!firstEvent.endTime;
                        const cardCount = group.events.length;
                        const connectorHeight = 20 + cardCount * 25;

                        return (
                            <div
                                key={groupIndex}
                                className="timeline-group"
                                style={{ left: LEFT_OFFSET + group.leftPx }}
                            >
                                {/* 起始点圆点 */}
                                <div className="group-dot" style={{
                                    backgroundColor: groupColor,
                                    borderColor: groupColor,
                                    boxShadow: `0 0 0 3px white, 0 0 0 5px ${groupColor}40`
                                }}></div>

                                {/* 如果有持续时间，显示结束点圆点（空心） */}
                                {hasDuration && (
                                    <div
                                        className="range-end-dot"
                                        style={{
                                            left: getPosition(firstEvent.endTime!) - group.leftPx - 6,
                                            borderColor: groupColor
                                        }}
                                    />
                                )}

                                {/* 垂线连接 */}
                                <div
                                    className="group-connector"
                                    style={{
                                        backgroundColor: groupColor,
                                        height: connectorHeight
                                    }}
                                ></div>

                                {/* 卡片堆叠 */}
                                <div className="group-cards" style={{ marginTop: -5 }}>
                                    {group.events.map((event) => {
                                        const displayDate = event.date || formatDate(event.startTime);
                                        const durationText = event.endTime
                                            ? formatDuration(event.startTime, event.endTime)
                                            : null;

                                        return (
                                            <div
                                                key={event.id}
                                                className="group-card"
                                                style={{ borderLeftColor: event.color || groupColor }}
                                            >
                                                <div className="card-connector-dot" style={{ backgroundColor: event.color || groupColor }}></div>

                                                <h3 className="card-title">{event.title}</h3>
                                                {event.description && (
                                                    <p className="card-desc">{event.description}</p>
                                                )}
                                                <div className="card-meta">
                                                    <span>{displayDate}</span>
                                                    {durationText && (
                                                        <span className="duration">⏱️ {durationText}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}