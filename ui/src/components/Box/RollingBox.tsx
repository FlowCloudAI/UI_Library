// RollingBox.tsx
import './RollingBox.css';
import * as React from 'react';

export type ShowThumb = 'auto' | 'hide' | 'show';
export type ThumbSize = 'thin' | 'normal' | 'thick';
export type RollingAxis = 'x' | 'y' | 'both' | 'none';

export interface RollingBoxTokens {
    thumbColor?: string;
    thumbHoverColor?: string;
    thumbActiveColor?: string;
    trackColor?: string;
}

function isDevelopmentRuntime(): boolean {
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean } }).env;
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
    return metaEnv?.DEV === true || (metaEnv?.PROD !== true && nodeEnv !== undefined && nodeEnv !== 'production');
}

export interface RollingBoxProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 滚动条显示模式 */
    showThumb?: ShowThumb;
    /** @deprecated 推荐改用 axis="x"。 */
    horizontal?: boolean;
    /** @deprecated 推荐改用 axis="y"。 */
    vertical?: boolean;
    /** 滚动轴。设置后优先于 horizontal/vertical。 */
    axis?: RollingAxis;
    /** 自定义滚动条宽度 */
    thumbSize?: ThumbSize;
    /** 是否显示滚动轨道 */
    showTrack?: boolean;
    /** 内容 */
    children: React.ReactNode;
    /** 返回 true 时由外部接管本次滚轮事件，RollingBox 不再处理 */
    interceptWheel?: (event: WheelEvent, container: HTMLDivElement) => boolean;
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<RollingBoxTokens>;

    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */

    /** @deprecated 推荐改用 tokens.thumbColor。 */
    thumbColor?: string;
    /** @deprecated 推荐改用 tokens.thumbHoverColor。 */
    thumbHoverColor?: string;
    /** @deprecated 推荐改用 tokens.thumbActiveColor。 */
    thumbActiveColor?: string;
    /** @deprecated 推荐改用 tokens.trackColor。 */
    trackColor?: string;
}

export const RollingBox = React.forwardRef<HTMLDivElement, RollingBoxProps>(function RollingBox({
                                                                                                    showThumb = 'auto',
                                                                                                    horizontal = false,
                                                                                                    vertical = true,
                                                                                                    axis,
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
                                                                                                    tokens,
                                                                                                    onScroll,
                                                                                                    ...props
                                                                                                }: RollingBoxProps, ref) {
    const colorVars: Record<string, string | undefined> = {
        '--roll-thumb':        tokens?.thumbColor ?? thumbColor,
        '--roll-thumb-hover':  tokens?.thumbHoverColor ?? thumbHoverColor,
        '--roll-thumb-active': tokens?.thumbActiveColor ?? thumbActiveColor,
        '--roll-track':        tokens?.trackColor ?? trackColor,
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
    const warnedLegacyAxisRef = React.useRef(false);
    const resolvedAxis: RollingAxis = axis ?? (horizontal ? 'x' : (vertical ? 'y' : 'none'));
    const resolvedDirection = resolvedAxis === 'x'
        ? 'horizontal'
        : resolvedAxis === 'y'
            ? 'vertical'
            : resolvedAxis;

    React.useEffect(() => {
        if (axis !== undefined || (!horizontal && vertical) || warnedLegacyAxisRef.current || !isDevelopmentRuntime()) {
            return;
        }

        warnedLegacyAxisRef.current = true;
        console.warn('[flowcloudai-ui][RollingBox] horizontal/vertical 已保留兼容，建议改用 axis。');
    }, [axis, horizontal, vertical]);

    const deprecatedColorPropNames = React.useMemo(() => [
        thumbColor !== undefined && 'thumbColor',
        thumbHoverColor !== undefined && 'thumbHoverColor',
        thumbActiveColor !== undefined && 'thumbActiveColor',
        trackColor !== undefined && 'trackColor',
    ].filter(Boolean) as string[], [
        thumbActiveColor,
        thumbColor,
        thumbHoverColor,
        trackColor,
    ]);

    React.useEffect(() => {
        if (deprecatedColorPropNames.length === 0 || !isDevelopmentRuntime()) return;
        console.warn(`[flowcloudai-ui][RollingBox] ${deprecatedColorPropNames.join('/')} 已废弃，推荐改用 tokens。`);
    }, [deprecatedColorPropNames]);

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

    const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
        onScroll?.(event);
        if (showThumb !== 'auto') return;

        setIsScrolling(true);

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1000);
    }, [onScroll, showThumb]);

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
        if (!el || resolvedAxis !== 'x') return;

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
    }, [interceptWheel, resolvedAxis]);

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
            {...props}
            ref={setContainerRef}
            className={classNames}
            style={mergedStyle}
            onScroll={handleScroll}
        >
            <div className="fc-roll__content">
                {children}
            </div>
        </div>
    );
});
