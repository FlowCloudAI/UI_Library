import * as React from 'react';

interface UseCustomRollThumbOptions {
    enabled: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    contentRef: React.RefObject<HTMLDivElement | null>;
}

const PADDING_PROPS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
type PaddingProperty = typeof PADDING_PROPS[number];

interface PaddingSnapshot {
    container: Record<PaddingProperty, string>;
    content: Record<PaddingProperty, string>;
}

interface ThumbMetrics {
    scrollable: number;
    maxThumbTop: number;
}

function readPadding(style: CSSStyleDeclaration): Record<PaddingProperty, string> {
    return {
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
    };
}

export function useCustomRollThumb({
                                       enabled,
                                       containerRef,
                                       contentRef,
                                   }: UseCustomRollThumbOptions) {
    const thumbAnchorRef = React.useRef<HTMLDivElement>(null);
    const trackRef = React.useRef<HTMLDivElement>(null);
    const thumbRef = React.useRef<HTMLDivElement>(null);
    const dragRef = React.useRef<{ pointerId: number; startY: number; startScrollTop: number } | null>(null);
    const paddingSnapshotRef = React.useRef<PaddingSnapshot | null>(null);
    const metricsRef = React.useRef<ThumbMetrics | null>(null);
    const frameRef = React.useRef<number | null>(null);

    const restorePadding = React.useCallback(() => {
        const el = containerRef.current;
        const content = contentRef.current;
        const snapshot = paddingSnapshotRef.current;
        if (!el || !content || !snapshot) return;

        const scrollTop = el.scrollTop;
        for (const prop of PADDING_PROPS) {
            el.style[prop] = snapshot.container[prop];
            content.style[prop] = snapshot.content[prop];
        }
        el.scrollTop = scrollTop;
        paddingSnapshotRef.current = null;
    }, [containerRef, contentRef]);

    const syncPadding = React.useCallback(() => {
        const el = containerRef.current;
        const content = contentRef.current;
        if (!el || !content) return;

        const scrollTop = el.scrollTop;
        restorePadding();

        paddingSnapshotRef.current = {
            container: readPadding(el.style),
            content: readPadding(content.style),
        };

        const computedPadding = readPadding(getComputedStyle(el));
        for (const prop of PADDING_PROPS) {
            content.style[prop] = computedPadding[prop];
            el.style[prop] = '0px';
        }
        el.scrollTop = scrollTop;
    }, [containerRef, contentRef, restorePadding]);

    const syncThumbPosition = React.useCallback(() => {
        const el = containerRef.current;
        const thumb = thumbRef.current;
        const metrics = metricsRef.current;
        if (!el || !thumb || !metrics || metrics.scrollable <= 0) return;

        const thumbTop = metrics.maxThumbTop * (el.scrollTop / metrics.scrollable);
        thumb.style.transform = `translateY(${thumbTop}px)`;
    }, [containerRef]);

    const updateThumb = React.useCallback(() => {
        if (!enabled || frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            syncThumbPosition();
        });
    }, [enabled, syncThumbPosition]);

    const measure = React.useCallback(() => {
        const el = containerRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!el || !track || !thumb) return;

        const scrollable = el.scrollHeight - el.clientHeight;
        if (scrollable <= 0) {
            metricsRef.current = null;
            track.style.display = 'none';
            return;
        }

        track.style.display = '';
        track.style.height = `calc(${el.clientHeight}px - var(--roll-inset-top, 0px) - var(--roll-inset-bottom, 0px))`;

        const trackHeight = track.getBoundingClientRect().height;
        const thumbHeight = Math.max(24, trackHeight * (el.clientHeight / el.scrollHeight));
        metricsRef.current = {
            scrollable,
            maxThumbTop: trackHeight - thumbHeight,
        };

        thumb.style.height = `${thumbHeight}px`;
        syncThumbPosition();
    }, [containerRef, syncThumbPosition]);

    React.useLayoutEffect(() => {
        if (!enabled) {
            restorePadding();
            return;
        }

        syncPadding();
        measure();

        const el = containerRef.current;
        const content = contentRef.current;
        if (!el || typeof ResizeObserver === 'undefined') {
            return () => restorePadding();
        }

        const observer = new ResizeObserver(() => measure());
        observer.observe(el);
        if (content) observer.observe(content);

        return () => {
            observer.disconnect();
            restorePadding();
        };
    }, [contentRef, containerRef, enabled, measure, restorePadding, syncPadding]);

    React.useEffect(() => () => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
        }
    }, []);

    const handleThumbPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const el = containerRef.current;
        if (!el) return;

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.classList.add('is-active');
        dragRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startScrollTop: el.scrollTop,
        };
    }, [containerRef]);

    const handleThumbPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const el = containerRef.current;
        const metrics = metricsRef.current;
        if (!drag || drag.pointerId !== event.pointerId || !el || !metrics || metrics.maxThumbTop <= 0) return;

        el.scrollTop = drag.startScrollTop + (event.clientY - drag.startY) * (metrics.scrollable / metrics.maxThumbTop);
        syncThumbPosition();
    }, [containerRef, syncThumbPosition]);

    const handleThumbPointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
        }
        event.currentTarget.classList.remove('is-active');
    }, []);

    const handleTrackPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const el = containerRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        const metrics = metricsRef.current;
        if (!el || !track || !thumb || !metrics || event.target !== track || metrics.maxThumbTop <= 0) return;

        event.preventDefault();

        const trackRect = track.getBoundingClientRect();
        const thumbHeight = thumb.offsetHeight;
        const targetThumbTop = Math.min(
            Math.max(0, event.clientY - trackRect.top - thumbHeight / 2),
            metrics.maxThumbTop,
        );
        el.scrollTop = (targetThumbTop / metrics.maxThumbTop) * metrics.scrollable;
        syncThumbPosition();
    }, [containerRef, syncThumbPosition]);

    return {
        thumbAnchorRef,
        trackRef,
        thumbRef,
        updateThumb,
        handleTrackPointerDown,
        handleThumbPointerDown,
        handleThumbPointerMove,
        handleThumbPointerUp,
    };
}
