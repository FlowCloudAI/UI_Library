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

export function RollingBox({
                               showThumb = 'auto',
                               horizontal = false,
                               vertical = true,
                               thumbSize = 'normal',
                               showTrack = false,
                               children,
                               className,
                               thumbColor,
                               thumbHoverColor,
                               thumbActiveColor,
                               trackColor,
                               style,
                               ...props
                           }: RollingBoxProps) {
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
        };
    }, []);

    // 水平模式：将鼠标滚轮的纵向滚动映射为横向滚动
    // wheel 事件需要 passive: false 才能 preventDefault()
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el || !horizontal) return;
        const handler = (e: WheelEvent) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [horizontal]);

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
            ref={containerRef}
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
}