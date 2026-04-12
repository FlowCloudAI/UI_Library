// RollingBox.tsx
import './RollingBox.css';
import * as React from 'react';

type ShowThumb = 'auto' | 'hide' | 'show';
type ThumbSize = 'thin' | 'normal' | 'thick';

interface RollingBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 滚动条显示模式 */
    showThumb?: ShowThumb;
    /** 水平滚动 */
    horizontal?: boolean;
    /** 垂直滚动（默认） */
    vertical?: boolean;
    /** 自定义滚动条宽度 */
    thumbSize?: ThumbSize;
    /** 是否显示滚动轨道 */
    showTrack?: boolean;
    /** 内容 */
    children: React.ReactNode;
    /** 返回 true 时由外部接管本次滚轮事件，RollingBox 不再处理 */
    interceptWheel?: (event: WheelEvent, container: HTMLDivElement) => boolean;

    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */

    /** 滚动条颜色（show 模式下生效） */
    thumbColor?: string;
    /** hover 时滚动条颜色（auto 模式下生效） */
    thumbHoverColor?: string;
    /** 滚动中滚动条颜色（auto 模式下生效） */
    thumbActiveColor?: string;
    /** 轨道背景色（showTrack=true 时生效） */
    trackColor?: string;
}

export const RollingBox = React.forwardRef<HTMLDivElement, RollingBoxProps>(function RollingBox({
                                                                                                    showThumb = 'auto',
                                                                                                    horizontal = false,
                                                                                                    vertical = true,
                                                                                                    thumbSize = 'normal',
                                                                                                    showTrack = false,
                                                                                                    children,
                                                                                                    interceptWheel,
                                                                                                    className,
                                                                                                    thumbColor,
                                                                                                    thumbHoverColor,
                                                                                                    thumbActiveColor,
                                                                                                    trackColor,
                                                                                                    style,
                                                                                                    ...props
                                                                                                }: RollingBoxProps, ref) {
    const colorVars: Record<string, string | undefined> = {
        '--roll-thumb':        thumbColor,
        '--roll-thumb-hover':  thumbHoverColor,
        '--roll-thumb-active': thumbActiveColor,
        '--roll-track':        trackColor,
    };

    const overrideStyle: React.CSSProperties = {};
    for (const [key, value] of Object.entries(colorVars)) {
        if (value !== undefined) {
            (overrideStyle as any)[key] = value;
        }
    }

    const mergedStyle: React.CSSProperties = { ...overrideStyle, ...style };

    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = React.useState(false);
    const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationFrameRef = React.useRef<number | null>(null);
    const targetScrollLeftRef = React.useRef<number | null>(null);

    const setContainerRef = React.useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node;

        if (!ref) {
            return;
        }

        if (typeof ref === 'function') {
            ref(node);
            return;
        }

        ref.current = node;
    }, [ref]);

    const handleScroll = React.useCallback(() => {
        if (showThumb !== 'auto') return;

        setIsScrolling(true);

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1000);
    }, [showThumb]);

    React.useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // 水平模式：将鼠标滚轮的纵向滚动映射为横向滚动，并用 rAF 做平滑过渡
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el || !horizontal) return;

        const clampTarget = (value: number) => {
            const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
            return Math.min(Math.max(0, value), maxScrollLeft);
        };

        const animate = () => {
            const target = targetScrollLeftRef.current;
            if (target === null) {
                animationFrameRef.current = null;
                return;
            }

            const current = el.scrollLeft;
            const diff = target - current;

            if (Math.abs(diff) < 0.5) {
                el.scrollLeft = target;
                animationFrameRef.current = null;
                targetScrollLeftRef.current = null;
                return;
            }

            el.scrollLeft = current + diff * 0.18;
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        const handler = (e: WheelEvent) => {
            if (interceptWheel?.(e, el)) {
                return;
            }

            const rawDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (rawDelta === 0) return;
            e.preventDefault();

            const delta = e.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? rawDelta * 16
                : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
                    ? rawDelta * el.clientWidth
                    : rawDelta;

            const currentTarget = targetScrollLeftRef.current ?? el.scrollLeft;
            targetScrollLeftRef.current = clampTarget(currentTarget + delta);

            if (animationFrameRef.current === null) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        el.addEventListener('wheel', handler, { passive: false });
        return () => {
            el.removeEventListener('wheel', handler);
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            targetScrollLeftRef.current = null;
        };
    }, [horizontal, interceptWheel]);

    const resolvedDirection = horizontal ? 'horizontal' : 'vertical';

    const classNames = [
        'fc-roll',
        `fc-roll--thumb-${showThumb}`,
        `fc-roll--size-${thumbSize}`,
        `fc-roll--${resolvedDirection}`,
        showTrack && 'fc-roll--track',
        isScrolling && 'fc-roll--scrolling',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={setContainerRef}
            className={classNames}
            style={mergedStyle}
            onScroll={handleScroll}
            {...props}
        >
            <div className="fc-roll__content">
                {children}
            </div>
        </div>
    );
});
