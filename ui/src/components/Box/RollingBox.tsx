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
}

export function RollingBox({
                               showThumb = 'auto',
                               horizontal = false,
                               vertical = true,
                               thumbSize = 'normal',
                               showTrack = false,
                               children,
                               className,
                               ...props
                           }: RollingBoxProps) {
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
            onScroll={handleScroll}
            {...props}
        >
            <div className="fc-roll__content">
                {children}
            </div>
        </div>
    );
}