import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
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

    // 内部维护当前缩放后的时间范围
    const [currentStart, setCurrentStart] = useState(yearStart);
    const [currentEnd, setCurrentEnd] = useState(yearEnd);
    // 当外部 props 变化时同步内部状态
    useEffect(() => {
        setCurrentStart(yearStart);
        setCurrentEnd(yearEnd);
    }, [yearStart, yearEnd]);

    // 计算事件的时间边界（用于限制最大缩放范围）
    const { minEventYear, maxEventYear } = useMemo(() => {
        if (!events.length) return { minEventYear: currentStart, maxEventYear: currentEnd };
        let min = Infinity;
        let max = -Infinity;
        events.forEach(e => {
            min = Math.min(min, e.startTime);
            if (e.endTime !== undefined) min = Math.min(min, e.endTime);
            max = Math.max(max, e.startTime);
            if (e.endTime !== undefined) max = Math.max(max, e.endTime);
        });
        // 添加 20% 的边距作为最大范围边界
        const padding = Math.max((max - min) * 0.2, 10);
        return { minEventYear: min - padding, maxEventYear: max + padding };
    }, [events, currentStart, currentEnd]);

    // 允许的最小范围（年）
    const MIN_RANGE = 1;
    // 允许的最大范围（年）
    const MAX_RANGE = Math.max(MIN_RANGE, maxEventYear - minEventYear);

    // 限制范围在合法区间内
    const clampRange = (start: number, end: number) => {
        let newStart = start;
        let newEnd = end;
        let range = newEnd - newStart;
        if (range < MIN_RANGE) {
            const center = (newStart + newEnd) / 2;
            newStart = center - MIN_RANGE / 2;
            newEnd = center + MIN_RANGE / 2;
            range = MIN_RANGE;
        }
        if (range > MAX_RANGE) {
            const center = (newStart + newEnd) / 2;
            newStart = center - MAX_RANGE / 2;
            newEnd = center + MAX_RANGE / 2;
            range = MAX_RANGE;
        }
        // 边界不能超出 minEventYear / maxEventYear（最大范围边界）
        if (newStart < minEventYear) {
            newStart = minEventYear;
            newEnd = newStart + range;
        }
        if (newEnd > maxEventYear) {
            newEnd = maxEventYear;
            newStart = newEnd - range;
        }
        return { start: newStart, end: newEnd };
    };

    // 用于缩放后恢复滚动位置的 pending 值
    const pendingScrollLeft = useRef<number | null>(null);

    // 当范围变化且需要恢复滚动位置时执行
    useEffect(() => {
        if (pendingScrollLeft.current !== null && scrollRef.current) {
            scrollRef.current.scrollLeft = pendingScrollLeft.current;
            pendingScrollLeft.current = null;
        }
    }, [currentStart, currentEnd]);

    const trackWidth = useMemo(() => {
        const range = currentEnd - currentStart;
        return Math.max(range * 12, events.length * 200, 1200);
    }, [currentStart, currentEnd, events.length]);

    const getX = (year: number) => ((year - currentStart) / (currentEnd - currentStart)) * trackWidth;

    const ticks = useMemo(() => {
        const range = currentEnd - currentStart;
        let step: number;
        if (range > 1000) step = 100;
        else if (range > 500) step = 50;
        else if (range > 200) step = 20;
        else step = 10;

        const ticks = [];
        const start = Math.floor(currentStart / step) * step;
        const end = Math.ceil(currentEnd / step) * step;

        for (let y = start; y <= end; y += step) {
            if (y >= currentStart && y <= currentEnd) {
                ticks.push({
                    year: y,
                    left: ((y - currentStart) / range) * 100,
                    label: `${y}`
                });
            }
        }
        return ticks;
    }, [currentStart, currentEnd]);

    const processedEvents = useMemo(() => {
        if (!events.length) return [];
        const sorted = [...events].sort((a, b) => a.startTime - b.startTime);
        const rows: { endX: number; y: number }[] = [];

        return sorted.map((e) => {
            const x = getX(e.startTime);
            const width = e.endTime ? Math.max(getX(e.endTime) - x, 160) : 160;
            const endX = x + width;

            let y = 20;
            let found = false;

            for (let i = 0; i < rows.length; i++) {
                if (rows[i].endX + 30 <= x) {
                    rows[i].endX = endX;
                    y = rows[i].y;
                    found = true;
                    break;
                }
            }

            if (!found) {
                y = 20 + rows.length * 90;
                rows.push({ endX, y });
            }

            return { ...e, x, width, y };
        });
    }, [events, currentStart, currentEnd, trackWidth]);

    // 鼠标拖拽（左右滑动）
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseUp = useCallback(() => setIsDragging(false), []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        scrollRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5;
    }, [isDragging, scrollLeft, startX]);

    // 判断鼠标是否在轴线区域（Y坐标范围）
    const isMouseOnAxis = (clientY: number): boolean => {
        if (!scrollRef.current) return false;
        const rect = scrollRef.current.getBoundingClientRect();
        const AXIS_Y = 380;        // 与 CSS 中 .flag-axis 的 top 值一致
        const AXIS_HEIGHT = 30;     // 轴线区域高度
        const relativeY = clientY - rect.top;
        return relativeY >= AXIS_Y && relativeY <= AXIS_Y + AXIS_HEIGHT;
    };

    // 缩放核心逻辑
    const handleZoom = (e: WheelEvent, deltaY: number) => {
        if (!scrollRef.current) return;
        // 计算鼠标在滚动区域中的横向偏移量（px）
        const rect = scrollRef.current.getBoundingClientRect();
        const mouseXInViewport = e.clientX - rect.left;
        if (mouseXInViewport < 0 || mouseXInViewport > rect.width) return;

        // 当前滚动偏移量
        const currentScrollLeft = scrollRef.current.scrollLeft;
        // 鼠标相对于 track 内容区的 X 坐标（考虑滚动偏移）
        const mouseXInTrack = currentScrollLeft + mouseXInViewport;
        // 计算当前时间轴总宽度（不含 LEFT_OFFSET 偏移，但 track 总宽度已包含左右留白）
        const totalTrackWidth = trackWidth + 100; // LEFT_OFFSET * 2 = 100
        if (mouseXInTrack < 0 || mouseXInTrack > totalTrackWidth) return;

        // 鼠标位置对应的时间值
        const timeAtMouse = currentStart + (mouseXInTrack / totalTrackWidth) * (currentEnd - currentStart);

        // 缩放因子：向下滚动（负deltaY）为放大，向上滚动为正为缩小
        const zoomFactor = deltaY > 0 ? 1.1 : 0.9;
        let newRange = (currentEnd - currentStart) * zoomFactor;
        // 边界限制
        newRange = Math.min(MAX_RANGE, Math.max(MIN_RANGE, newRange));

        // 保持 timeAtMouse 在新范围中的相对位置不变
        let newStart = timeAtMouse - (mouseXInTrack / totalTrackWidth) * newRange;
        let newEnd = newStart + newRange;
        const clamped = clampRange(newStart, newEnd);
        newStart = clamped.start;
        newEnd = clamped.end;

        // 如果范围没有实际变化，则不更新
        if (Math.abs(newStart - currentStart) < 0.001 && Math.abs(newEnd - currentEnd) < 0.001) return;

        // 计算缩放后鼠标指向的时间点在新布局中的 X 坐标
        const newTotalTrackWidth = ((newEnd - newStart) * 12) + 100; // 注意 trackWidth 基于新范围，但公式应与 getX 一致
        const newMouseXInTrack = ((timeAtMouse - newStart) / (newEnd - newStart)) * newTotalTrackWidth;
        // 新的滚动偏移量：使鼠标下方的时间点仍然出现在相同的视口横向位置
        let newScrollLeft = newMouseXInTrack - mouseXInViewport;
        newScrollLeft = Math.max(0, Math.min(newScrollLeft, newTotalTrackWidth - rect.width));

        // 更新状态
        setCurrentStart(newStart);
        setCurrentEnd(newEnd);
        pendingScrollLeft.current = newScrollLeft;
    };

    // 统一滚轮处理：判断鼠标位置，决定缩放还是左右滑动
    const handleWheel = useCallback((e: WheelEvent) => {
        if (!scrollRef.current) return;
        const isOnAxis = isMouseOnAxis(e.clientY);
        if (isOnAxis) {
            e.preventDefault();
            handleZoom(e, e.deltaY);
        } else {
            e.preventDefault();
            // 非轴线区域：左右滑动（垂直滚轮转为水平滚动）
            const scrollSpeed = 3;
            scrollRef.current.scrollLeft += e.deltaY * scrollSpeed;
        }
    }, [currentStart, currentEnd, trackWidth, minEventYear, maxEventYear]);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;
        scrollEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => scrollEl.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const LEFT_OFFSET = 50;
    const AXIS_Y = 380;
    const FLAG_HEIGHT = 70;

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

                    {processedEvents.map((e) => {
                        const flagBottom = e.y + FLAG_HEIGHT;
                        const lineHeight = AXIS_Y - flagBottom;

                        return (
                            <div
                                key={e.id}
                                className="flag-event"
                                style={{
                                    left: LEFT_OFFSET + e.x,
                                    top: e.y
                                }}
                            >
                                <div className="flag-body">
                                    <div className="flag-year">
                                        {e.startTime < 0 ? `前${Math.abs(e.startTime)}年` : `${e.startTime}年`}
                                        {e.endTime && `  ${e.endTime < 0 ? `前${Math.abs(e.endTime)}年` : `${e.endTime}年`}`}
                                    </div>
                                    <h3 className="flag-title">{e.title}</h3>
                                    {e.description && (
                                        <p className="flag-desc">{e.description}</p>
                                    )}
                                </div>

                                <div className="flag-pole-container" style={{ height: lineHeight }}>
                                    <div className="flag-top-bar" />
                                    <div className="flag-pole" />
                                    <div className="flag-pole-dot" />
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