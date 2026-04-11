import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

const LEFT_OFFSET = 50;
const AXIS_Y = 380;
const FLAG_HEIGHT = 70;
const PX_PER_YEAR = 12;
const MIN_TRACK_WIDTH = 800;
const MIN_CARD_WIDTH = 160; // 点事件或极短时间段的最小卡片宽度

export function Timeline({ events, yearStart, yearEnd }: TimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragScrollLeft, setDragScrollLeft] = useState(0);

    const currentStart = yearStart;
    const currentEnd = yearEnd;

    const trackWidth = useMemo(() => {
        const range = Math.max(currentEnd - currentStart, 1);
        return Math.max(range * PX_PER_YEAR, MIN_TRACK_WIDTH);
    }, [currentStart, currentEnd]);

    const getX = useCallback((year: number) => {
        const range = currentEnd - currentStart;
        if (range === 0) return 0;
        return ((year - currentStart) / range) * trackWidth;
    }, [currentStart, currentEnd, trackWidth]);

    const ticks = useMemo(() => {
        const range = currentEnd - currentStart;
        let step = 10;
        if (range > 1000) step = 100;
        else if (range > 500) step = 50;
        else if (range > 200) step = 20;
        const start = Math.floor(currentStart / step) * step;
        const end = Math.ceil(currentEnd / step) * step;
        const ticksArr = [];
        for (let y = start; y <= end; y += step) {
            if (y >= currentStart && y <= currentEnd) {
                ticksArr.push({
                    year: y,
                    left: ((y - currentStart) / range) * 100,
                    label: `${y}`
                });
            }
        }
        return ticksArr;
    }, [currentStart, currentEnd]);

    const processedEvents = useMemo(() => {
        if (!events.length) return [];

        // 计算每个事件的起始X、持续时间条宽度、卡片宽度
        const eventsWithCoords = events.map(e => {
            const startX = getX(e.startTime);
            let durationWidth: number;
            let cardWidth: number;
            if (e.endTime !== undefined && e.endTime !== null) {
                const endX = getX(e.endTime);
                const rawWidth = endX - startX;
                durationWidth = rawWidth > 0 ? Math.max(rawWidth, 1) : 0;
                cardWidth = durationWidth > 0 ? Math.max(durationWidth, MIN_CARD_WIDTH) : MIN_CARD_WIDTH;
            } else {
                durationWidth = 0;
                cardWidth = MIN_CARD_WIDTH;
            }
            return { ...e, startX, durationWidth, cardWidth };
        });

        // 按起始时间排序
        const sorted = [...eventsWithCoords].sort((a, b) => a.startTime - b.startTime);

        // 行布局算法（基于卡片实际宽度）
        const rows: { rightX: number; y: number }[] = [];
        return sorted.map(e => {
            const cardRightX = e.startX + e.cardWidth;
            let y = 20;
            let found = false;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].rightX + 30 <= e.startX) {
                    rows[i].rightX = cardRightX;
                    y = rows[i].y;
                    found = true;
                    break;
                }
            }
            if (!found) {
                y = 20 + rows.length * 90;
                rows.push({rightX: cardRightX, y});
            }
            return {...e, y, cardRightX};
        });
    }, [events, getX]);

    // 拖拽滑动
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setDragStartX(e.pageX - scrollRef.current.offsetLeft);
        setDragScrollLeft(scrollRef.current.scrollLeft);
    };
    const handleMouseUp = useCallback(() => setIsDragging(false), []);
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        scrollRef.current.scrollLeft = dragScrollLeft - (x - dragStartX) * 1.5;
    }, [isDragging, dragScrollLeft, dragStartX]);

    // 滚轮左右滑动（垂直滚轮转水平）
    const handleWheel = useCallback((e: WheelEvent) => {
        if (!scrollRef.current) return;
        e.preventDefault();
        scrollRef.current.scrollLeft += e.deltaY * 3;
    }, []);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;
        scrollEl.addEventListener('wheel', handleWheel, { passive: false });
        return () => scrollEl.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

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
                        height: AXIS_Y + 80,
                        position: 'relative'
                    }}
                >
                    {/* 时间轴线 */}
                    <div className="flag-axis" style={{ left: LEFT_OFFSET, right: LEFT_OFFSET, top: AXIS_Y }}>
                        <div className="flag-axis-line" />
                        <div className="flag-ticks">
                            {ticks.map((t, i) => (
                                <div key={i} className="flag-tick" style={{ left: `${t.left}%` }}>
                                    <div className="flag-tick-mark" />
                                    <span className="flag-tick-label">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 持续时间条（轴线上的粗线） */}
                    {processedEvents.map(e => {
                        if (e.durationWidth <= 0) return null;
                        return (
                            <div
                                key={`duration-${e.id}`}
                                style={{
                                    position: 'absolute',
                                    left: LEFT_OFFSET + e.startX,
                                    top: AXIS_Y - 2,
                                    width: e.durationWidth,
                                    height: 4,
                                    backgroundColor: 'var(--fc-color-primary)',
                                    opacity: 0.6,
                                    borderRadius: 2,
                                    pointerEvents: 'none',
                                    zIndex: 5
                                }}
                            />
                        );
                    })}

                    {/* 事件卡片及垂线 */}
                    {processedEvents.map((e) => {
                        const flagBottom = e.y + FLAG_HEIGHT;
                        const lineHeight = AXIS_Y - flagBottom;
                        return (
                            <div
                                key={e.id}
                                className="flag-event"
                                style={{
                                    position: 'absolute',
                                    left: LEFT_OFFSET + e.startX,
                                    top: e.y
                                }}
                            >
                                <div
                                    className="flag-body"
                                    style={{
                                        width: e.cardWidth,
                                        minWidth: MIN_CARD_WIDTH,
                                        maxWidth: 'none'
                                    }}
                                >
                                    <div className="flag-year">
                                        {e.startTime < 0 ? `前${Math.abs(e.startTime)}年` : `${e.startTime}年`}
                                        {e.endTime !== undefined && (
                                            <> — {e.endTime < 0 ? `前${Math.abs(e.endTime)}年` : `${e.endTime}年`}</>
                                        )}
                                    </div>
                                    <h3 className="flag-title">{e.title}</h3>
                                    {e.description && <p className="flag-desc">{e.description}</p>}
                                </div>
                                <div className="flag-pole-container" style={{ height: lineHeight }}>
                                    <div className="flag-top-bar" />
                                    <div className="flag-pole" />
                                    <div className="flag-pole-dot" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}