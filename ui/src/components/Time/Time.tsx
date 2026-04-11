import React, { useMemo, useRef, useState } from 'react';
import './Time.css';

export interface TimelineEvent {
    id: string;
    title: string;
    startTime: number;
    endTime?: number;
    description?: string;
    parentId?: string;
}

interface TimelineProps {
    events: TimelineEvent[];
    yearStart: number;
    yearEnd: number;
}

export function Timeline({ events, yearStart, yearEnd }: TimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const trackWidth = useMemo(() => {
        const range = yearEnd - yearStart;
        return Math.max(range * 12, events.length * 200, 1200);
    }, [yearStart, yearEnd, events.length]);

    const getX = (year: number) => ((year - yearStart) / (yearEnd - yearStart)) * trackWidth;

    const ticks = useMemo(() => {
        const range = yearEnd - yearStart;
        let step: number;
        if (range > 1000) step = 100;
        else if (range > 500) step = 50;
        else if (range > 200) step = 20;
        else step = 10;

        const ticks = [];
        const start = Math.floor(yearStart / step) * step;
        const end = Math.ceil(yearEnd / step) * step;

        for (let y = start; y <= end; y += step) {
            if (y >= yearStart && y <= yearEnd) {
                ticks.push({
                    year: y,
                    left: ((y - yearStart) / range) * 100,
                    label: y < 0 ? `${Math.abs(y)}` : `${y}`
                });
            }
        }
        return ticks;
    }, [yearStart, yearEnd]);

    // 计算事件位置（仅Y轴防重叠，X轴由时间决定）
    const processedEvents = useMemo(() => {
        if (!events.length) return [];

        // 按时间排序
        const sorted = [...events].sort((a, b) => a.startTime - b.startTime);

        // 记录每行（Y层级）的结束X位置
        const rows: { endX: number; y: number }[] = [];

        return sorted.map((e) => {
            const x = getX(e.startTime);
            const width = e.endTime ? Math.max(getX(e.endTime) - x, 160) : 160;
            const endX = x + width;

            // 找第一个不重叠的行
            let y = 20; // 基础Y位置（距离顶部）
            let found = false;

            for (let i = 0; i < rows.length; i++) {
                // 检查水平是否重叠（留出30px间隙）
                if (rows[i].endX + 30 <= x) {
                    // 可以使用这一行，更新结束位置
                    rows[i].endX = endX;
                    y = rows[i].y;
                    found = true;
                    break;
                }
            }

            if (!found) {
                // 新增一行
                y = 20 + rows.length * 90; // 每行间隔90px
                rows.push({ endX, y });
            }

            return {
                ...e,
                x,
                width,
                y, // 旗帜顶部Y坐标
            };
        });
    }, [events, yearStart, yearEnd, trackWidth]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
    };

    const LEFT_OFFSET = 50;
    const AXIS_Y = 380; // 轴线位置
    const FLAG_HEIGHT = 70; // 旗帜高度（卡片高度）

    return (
        <div className="timeline-flag">
            <div
                className={`timeline-scroll-area ${isDragging ? 'dragging' : ''}`}
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                <div
                    className="flag-track"
                    style={{
                        width: trackWidth + LEFT_OFFSET * 2,
                        height: AXIS_Y + 80
                    }}
                >
                    {/* 轴线 */}
                    <div
                        className="flag-axis"
                        style={{ left: LEFT_OFFSET, right: LEFT_OFFSET, top: AXIS_Y }}
                    >
                        <div className="flag-axis-line" />
                        <div className="flag-ticks">
                            {ticks.map((t, i) => (
                                <div
                                    key={i}
                                    className="flag-tick"
                                    style={{ left: `${t.left}%` }}
                                >
                                    <div className="flag-tick-mark" />
                                    <span className="flag-tick-label">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 事件旗帜 */}
                    {processedEvents.map((e) => {
                        const flagBottom = e.y + FLAG_HEIGHT; // 旗帜底部Y
                        const lineHeight = AXIS_Y - flagBottom; // 垂线从旗帜底部到轴线

                        return (
                            <div
                                key={e.id}
                                className="flag-event"
                                style={{
                                    left: LEFT_OFFSET + e.x,
                                    top: e.y
                                }}
                            >
                                {/* 旗帜主体 */}
                                <div className="flag-body">
                                    <div className="flag-year">
                                        {e.startTime < 0 ? `前${Math.abs(e.startTime)}年` : `${e.startTime}年`}
                                        {e.endTime && ` → ${e.endTime}年`}
                                    </div>
                                    <h3 className="flag-title">{e.title}</h3>
                                    {e.description && (
                                        <p className="flag-desc">{e.description}</p>
                                    )}
                                </div>

                                {/* 垂线容器 - 从旗帜底部开始 */}
                                <div className="flag-pole-container" style={{ height: lineHeight }}>
                                    {/* 顶部小横线（连接旗帜） */}
                                    <div className="flag-top-bar" />

                                    {/* 垂线 */}
                                    <div className="flag-pole" />

                                    {/* 轴线上的圆点 */}
                                    <div className="flag-pole-dot" />

                                    {/* 持续时间条（如果有） */}
                                    {e.width > 160 && (
                                        <div
                                            className="flag-duration"
                                            style={{ width: e.width }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}