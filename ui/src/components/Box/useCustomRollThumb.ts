import * as React from 'react';

interface UseCustomRollThumbOptions {
    enabled: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    contentRef: React.RefObject<HTMLDivElement | null>;
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

    const updateThumb = React.useCallback(() => {
        const el = containerRef.current;
        const anchor = thumbAnchorRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!el || !anchor || !track || !thumb) return;

        anchor.style.transform = `translateY(${el.scrollTop}px)`;

        const scrollable = el.scrollHeight - el.clientHeight;
        if (scrollable <= 0) {
            track.style.display = 'none';
            return;
        }

        track.style.display = '';
        track.style.height = `calc(${el.clientHeight}px - var(--roll-inset-top, 0px) - var(--roll-inset-bottom, 0px))`;

        const trackHeight = track.getBoundingClientRect().height;
        const thumbHeight = Math.max(24, trackHeight * (el.clientHeight / el.scrollHeight));
        const maxThumbTop = trackHeight - thumbHeight;
        const thumbTop = maxThumbTop * (el.scrollTop / scrollable);

        thumb.style.height = `${thumbHeight}px`;
        thumb.style.transform = `translateY(${thumbTop}px)`;
    }, [containerRef]);

    React.useLayoutEffect(() => {
        if (!enabled) return;

        updateThumb();

        const el = containerRef.current;
        const content = contentRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => updateThumb());
        observer.observe(el);
        if (content) observer.observe(content);

        return () => observer.disconnect();
    }, [contentRef, containerRef, enabled, updateThumb]);

    const handleThumbPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const el = containerRef.current;
        if (!el) return;

        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startScrollTop: el.scrollTop,
        };
    }, [containerRef]);

    const handleThumbPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        const el = containerRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!drag || drag.pointerId !== event.pointerId || !el || !track || !thumb) return;

        const trackHeight = track.getBoundingClientRect().height;
        const thumbHeight = thumb.getBoundingClientRect().height;
        const scrollable = el.scrollHeight - el.clientHeight;
        const maxThumbTop = trackHeight - thumbHeight;
        if (maxThumbTop <= 0) return;

        el.scrollTop = drag.startScrollTop + (event.clientY - drag.startY) * (scrollable / maxThumbTop);
    }, [containerRef]);

    const handleThumbPointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
        }
    }, []);

    const handleTrackPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const el = containerRef.current;
        const track = trackRef.current;
        const thumb = thumbRef.current;
        if (!el || !track || !thumb || event.target !== track) return;

        event.preventDefault();

        const trackRect = track.getBoundingClientRect();
        const thumbHeight = thumb.getBoundingClientRect().height;
        const maxThumbTop = trackRect.height - thumbHeight;
        if (maxThumbTop <= 0) return;

        const targetThumbTop = Math.min(
            Math.max(0, event.clientY - trackRect.top - thumbHeight / 2),
            maxThumbTop,
        );
        el.scrollTop = (targetThumbTop / maxThumbTop) * (el.scrollHeight - el.clientHeight);
    }, [containerRef]);

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
