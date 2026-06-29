import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {RollingBox} from '../Box/RollingBox';
import type {FcChangeHandler, FcChangeMeta} from '../../types/common';
import './Time.css';

export interface TimelineEvent {
    id: string;
    title: string;
    startTime: number;
    endTime?: number;
    description?: string;
    parentId?: string;
}

export type TimelineSelectedKeyChangeMeta = FcChangeMeta<React.MouseEvent<HTMLDivElement>>;
export type TimelineSelectedKeyChangeHandler = FcChangeHandler<string | null, TimelineSelectedKeyChangeMeta>;

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
    events: TimelineEvent[];
    yearStart: number;
    yearEnd: number;
    syncId?: string;
    /** 当前选中的事件 key（受控）。 */
    selectedKey?: string | null;
    /** 初始选中的事件 key（非受控）。 */
    defaultSelectedKey?: string | null;
    /** 推荐使用的选中项变更回调。 */
    onSelectedKeyChange?: TimelineSelectedKeyChangeHandler;
    /** @deprecated 保留兼容，推荐改用 selectedKey。 */
    selectedEventId?: string | null;
    /** @deprecated 保留兼容，推荐改用 onSelectedKeyChange。 */
    onEventSelect?: (eventId: string | null) => void;
}

const LEFT_OFFSET = 50;
const FLAG_HEIGHT = 70;
const PX_PER_YEAR = 12;
const MIN_TRACK_WIDTH = 800;
const MIN_CARD_WIDTH = 160;
const MAX_CARD_WIDTH = 360;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.15;
const TRACK_TOP_PADDING = 20;
const EVENT_ROW_GAP = 90;
const AXIS_TOP_GAP = 28;
const AXIS_LABEL_SPACE = 28;
const TRACK_BOTTOM_PADDING = 16;

const syncGroups = new Map<string, Set<React.RefObject<HTMLDivElement | null>>>();
const syncLocks = new WeakMap<React.RefObject<HTMLDivElement | null>, boolean>();

function isDevelopmentRuntime(): boolean {
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean } }).env;
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
    return metaEnv?.DEV === true || (metaEnv?.PROD !== true && nodeEnv !== undefined && nodeEnv !== 'production');
}

function normalizeYearRange(yearStart: number, yearEnd: number): [number, number] {
    const safeStart = Number.isFinite(yearStart) ? yearStart : 0;
    const safeEnd = Number.isFinite(yearEnd) ? yearEnd : safeStart;
    return safeStart <= safeEnd ? [safeStart, safeEnd] : [safeEnd, safeStart];
}

export function Timeline({
                             events,
                             yearStart,
                             yearEnd,
                             syncId,
                             selectedKey,
                             defaultSelectedKey = null,
                             onSelectedKeyChange,
                             selectedEventId,
                             onEventSelect,
                             className,
                             style,
                             ...props
                         }: TimelineProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragScrollLeft, setDragScrollLeft] = useState(0);
    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(defaultSelectedKey);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [viewportWidth, setViewportWidth] = useState(0);
    const zoomAnchorRef = useRef<{ offsetX: number; contentX: number; scaleRatio: number } | null>(null);
    const warnedLegacySelectedEventIdRef = useRef(false);
    const warnedLegacyOnEventSelectRef = useRef(false);

    useEffect(() => {
        const controlledSelectedId = selectedKey !== undefined ? selectedKey : selectedEventId;
        if (controlledSelectedId !== undefined) {
            setInternalSelectedId(controlledSelectedId);
            if (controlledSelectedId && scrollRef.current) {
                const cardElement = document.getElementById(`event-card-${controlledSelectedId}`);
                if (cardElement) {
                    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [selectedEventId, selectedKey]);

    useEffect(() => {
        if (selectedEventId === undefined || warnedLegacySelectedEventIdRef.current || !isDevelopmentRuntime()) return;
        warnedLegacySelectedEventIdRef.current = true;
        console.warn('[flowcloudai-ui][Timeline] selectedEventId 已保留兼容，建议改用 selectedKey。');
    }, [selectedEventId]);

    useEffect(() => {
        if (!onEventSelect || warnedLegacyOnEventSelectRef.current || !isDevelopmentRuntime()) return;
        warnedLegacyOnEventSelectRef.current = true;
        console.warn('[flowcloudai-ui][Timeline] onEventSelect 已保留兼容，建议改用 onSelectedKeyChange。');
    }, [onEventSelect]);

    const [currentStart, currentEnd] = useMemo(
        () => normalizeYearRange(yearStart, yearEnd),
        [yearEnd, yearStart],
    );

    const baseTrackWidth = useMemo(() => {
        const range = Math.max(currentEnd - currentStart, 1);
        return Math.max(range * PX_PER_YEAR, MIN_TRACK_WIDTH);
    }, [currentStart, currentEnd]);

    const minZoomLevel = useMemo(() => {
        if (viewportWidth <= 0) {
            return MIN_ZOOM;
        }

        const fitZoom = (viewportWidth - LEFT_OFFSET * 2) / baseTrackWidth;
        return Math.max(MIN_ZOOM, Math.min(1, fitZoom));
    }, [baseTrackWidth, viewportWidth]);

    const trackWidth = useMemo(() => {
        return baseTrackWidth * zoomLevel;
    }, [baseTrackWidth, zoomLevel]);

    const layoutTrackWidth = useMemo(() => {
        return baseTrackWidth * minZoomLevel;
    }, [baseTrackWidth, minZoomLevel]);

    const getX = useCallback((year: number) => {
        const range = currentEnd - currentStart;
        if (range <= 0) return 0;
        return ((year - currentStart) / range) * trackWidth;
    }, [currentStart, currentEnd, trackWidth]);

    const getBaseX = useCallback((year: number) => {
        const range = currentEnd - currentStart;
        if (range <= 0) return 0;
        return ((year - currentStart) / range) * layoutTrackWidth;
    }, [currentStart, currentEnd, layoutTrackWidth]);

    const ticks = useMemo(() => {
        const range = currentEnd - currentStart;
        if (range <= 0) {
            return [{year: currentStart, left: 0, label: `${currentStart}`}];
        }
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

        const eventsWithCoords = events.map(e => {
            const startX = getX(e.startTime);
            const layoutStartX = getBaseX(e.startTime);
            let durationWidth = 0;
            let cardWidth = MIN_CARD_WIDTH;
            let layoutDurationWidth = 0;
            let layoutCardWidth = MIN_CARD_WIDTH;
            if (e.endTime !== undefined && e.endTime !== null) {
                const endX = getX(e.endTime);
                const layoutEndX = getBaseX(e.endTime);
                const rawWidth = endX - startX;
                const layoutRawWidth = layoutEndX - layoutStartX;
                durationWidth = rawWidth > 0 ? Math.max(rawWidth, 1) : 0;
                layoutDurationWidth = layoutRawWidth > 0 ? Math.max(layoutRawWidth, 1) : 0;
                layoutCardWidth = layoutDurationWidth > 0 ? Math.min(Math.max(layoutDurationWidth, MIN_CARD_WIDTH), MAX_CARD_WIDTH) : MIN_CARD_WIDTH;
                cardWidth = layoutCardWidth;
            }
            return {...e, startX, durationWidth, cardWidth, layoutStartX, layoutCardWidth};
        });

        const sorted = [...eventsWithCoords].sort((a, b) => a.startTime - b.startTime);
        const rows: { rightX: number; y: number }[] = [];
        return sorted.map(e => {
            const layoutCardRightX = e.layoutStartX + e.layoutCardWidth;
            let y = TRACK_TOP_PADDING;
            let found = false;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].rightX + 30 <= e.layoutStartX) {
                    rows[i].rightX = layoutCardRightX;
                    y = rows[i].y;
                    found = true;
                    break;
                }
            }
            if (!found) {
                y = TRACK_TOP_PADDING + rows.length * EVENT_ROW_GAP;
                rows.push({rightX: layoutCardRightX, y});
            }
            return {...e, y};
        });
    }, [events, getBaseX, getX]);

    const axisY = useMemo(() => {
        if (!processedEvents.length) {
            return TRACK_TOP_PADDING + FLAG_HEIGHT + AXIS_TOP_GAP;
        }

        const maxEventBottom = processedEvents.reduce((maxBottom, event) => {
            return Math.max(maxBottom, event.y + FLAG_HEIGHT);
        }, 0);

        return maxEventBottom + AXIS_TOP_GAP;
    }, [processedEvents]);

    const trackHeight = useMemo(() => {
        return axisY + AXIS_LABEL_SPACE + TRACK_BOTTOM_PADDING;
    }, [axisY]);

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

    const interceptWheel = useCallback((event: WheelEvent, container: HTMLDivElement) => {
        const rect = container.getBoundingClientRect();
        const offsetY = event.clientY - rect.top;
        const offsetX = event.clientX - rect.left;
        const isAxisWheelZone = offsetY >= axisY;

        if (!isAxisWheelZone) {
            return false;
        }

        event.preventDefault();
        event.stopPropagation();

        const direction = event.deltaY > 0 ? -1 : 1;
        const nextZoomLevel = Math.min(
            MAX_ZOOM,
            Math.max(minZoomLevel, zoomLevel + direction * ZOOM_STEP)
        );

        if (nextZoomLevel === zoomLevel) {
            return true;
        }

        zoomAnchorRef.current = {
            offsetX,
            contentX: container.scrollLeft + offsetX - LEFT_OFFSET,
            scaleRatio: nextZoomLevel / zoomLevel,
        };
        setZoomLevel(nextZoomLevel);
        return true;
    }, [axisY, minZoomLevel, zoomLevel]);

    useEffect(() => {
        if (!scrollRef.current) return;

        const updateViewportWidth = () => {
            if (!scrollRef.current) return;
            setViewportWidth(scrollRef.current.clientWidth);
        };

        updateViewportWidth();

        const resizeObserver = new ResizeObserver(() => {
            updateViewportWidth();
        });

        resizeObserver.observe(scrollRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        setZoomLevel(prevZoomLevel => Math.max(prevZoomLevel, minZoomLevel));
    }, [minZoomLevel]);

    useLayoutEffect(() => {
        if (!scrollRef.current || !zoomAnchorRef.current) return;

        const {offsetX, contentX, scaleRatio} = zoomAnchorRef.current;
        const scaledContentX = contentX * scaleRatio;
        const maxScrollLeft = Math.max(
            trackWidth + LEFT_OFFSET * 2 - scrollRef.current.clientWidth,
            0
        );

        scrollRef.current.scrollLeft = Math.min(
            maxScrollLeft,
            Math.max(0, scaledContentX - offsetX + LEFT_OFFSET)
        );
        zoomAnchorRef.current = null;
    }, [trackWidth, zoomLevel]);

    useEffect(() => {
        if (!syncId || !scrollRef.current) return;

        if (!syncGroups.has(syncId)) {
            syncGroups.set(syncId, new Set());
        }
        const group = syncGroups.get(syncId)!;
        group.add(scrollRef);

        const handleScroll = () => {
            if (!scrollRef.current) return;
            if (syncLocks.get(scrollRef)) return;

            const currentLeft = scrollRef.current.scrollLeft;
            group.forEach(otherRef => {
                if (otherRef !== scrollRef && otherRef.current) {
                    syncLocks.set(otherRef, true);
                    otherRef.current.scrollLeft = currentLeft;
                    requestAnimationFrame(() => syncLocks.set(otherRef, false));
                }
            });
        };

        const scrollEl = scrollRef.current;
        scrollEl.addEventListener('scroll', handleScroll);

        return () => {
            scrollEl.removeEventListener('scroll', handleScroll);
            group.delete(scrollRef);
            if (group.size === 0) {
                syncGroups.delete(syncId);
            }
        };
    }, [syncId]);

    const currentSelectedId = selectedKey !== undefined
        ? selectedKey
        : selectedEventId !== undefined
            ? selectedEventId
            : internalSelectedId;

    const handleCardClick = (eventId: string, event: React.MouseEvent<HTMLDivElement>) => {
        if (onSelectedKeyChange) {
            onSelectedKeyChange(eventId, {source: 'click', event});
        } else if (onEventSelect) {
            onEventSelect(eventId);
        } else {
            setInternalSelectedId(eventId);
        }
    };

    return (
        <div
            {...props}
            className={['timeline-flag', className].filter(Boolean).join(' ')}
            style={style}
        >
            <RollingBox
                className={`timeline-scroll-area ${isDragging ? 'dragging' : ''}`}
                ref={scrollRef}
                axis="x"
                showThumb="auto"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                interceptWheel={interceptWheel}
            >
                <div
                    className="flag-track"
                    style={{
                        width: trackWidth + LEFT_OFFSET * 2,
                        height: trackHeight,
                        position: 'relative'
                    }}
                >
                    <div className="flag-axis" style={{left: LEFT_OFFSET, right: LEFT_OFFSET, top: axisY}}>
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
                    {processedEvents.map(e => {
                        if (e.durationWidth <= 0) return null;
                        return (
                            <div
                                key={`duration-${e.id}`}
                                style={{
                                    position: 'absolute',
                                    left: LEFT_OFFSET + e.startX,
                                    top: axisY - 2,
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

                    {processedEvents.map((e, index) => {
                        const flagBottom = e.y + FLAG_HEIGHT;
                        const lineHeight = axisY - flagBottom;
                        const isSelected = currentSelectedId === e.id;
                        return (
                            <div
                                key={e.id}
                                className="flag-event"
                                style={{
                                    position: 'absolute',
                                    left: LEFT_OFFSET + e.startX,
                                    top: e.y,
                                    zIndex: processedEvents.length - index + 10
                                }}
                            >
                                <div
                                    id={`event-card-${e.id}`}
                                    className={`flag-body ${isSelected ? 'selected' : ''}`}
                                    style={{
                                        width: e.cardWidth,
                                        minWidth: MIN_CARD_WIDTH,
                                        maxWidth: MAX_CARD_WIDTH
                                    }}
                                    onClick={(event) => handleCardClick(e.id, event)}
                                >
                                    {/* 蓝色年份已删除 */}
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
            </RollingBox>
        </div>
    );
}
