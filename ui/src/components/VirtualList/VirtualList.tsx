// VirtualList.tsx
import './VirtualList.css';
import * as React from "react";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";

interface VirtualListProps<T = any> {
    /** 数据源 */
    data: T[];
    /** 容器高度 */
    height: number;
    /** 每项固定高度 */
    itemHeight: number;
    /** 渲染函数 */
    renderItem: (item: T, index: number) => React.ReactNode;
    /** 容器类名 */
    className?: string;
    /** 滚动偏移量（预加载区域） */
    overscan?: number;
    /** 是否显示滚动条 */
    showScrollbar?: boolean;
    /** 滚动到底部回调 */
    onScrollEnd?: () => void;
    /** 容器样式 */
    style?: React.CSSProperties;
}

export function VirtualList<T>({
                                   data,
                                   height,
                                   itemHeight,
                                   renderItem,
                                   className = '',
                                   overscan = 3,
                                   showScrollbar = true,
                                   onScrollEnd,
                                   style
                               }: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const totalHeight = data.length * itemHeight;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = e.currentTarget.scrollTop;
        setScrollTop(newScrollTop);

        // 滚动到底部检测
        if (onScrollEnd) {
            const scrollHeight = e.currentTarget.scrollHeight;
            const clientHeight = e.currentTarget.clientHeight;
            if (newScrollTop + clientHeight >= scrollHeight - 5) {
                onScrollEnd();
            }
        }
    }, [onScrollEnd]);

    // 计算可见范围
    const visibleRange = useMemo(() => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const endIndex = Math.min(
            data.length,
            Math.ceil((scrollTop + height) / itemHeight) + overscan
        );
        return { startIndex, endIndex };
    }, [scrollTop, height, itemHeight, data.length, overscan]);

    // 可见数据
    const visibleData = useMemo(() => {
        return data.slice(visibleRange.startIndex, visibleRange.endIndex);
    }, [data, visibleRange]);

    // 偏移量
    const offsetY = visibleRange.startIndex * itemHeight;

    // 滚动条样式控制
    useEffect(() => {
        if (!showScrollbar && containerRef.current) {
            containerRef.current.style.scrollbarWidth = 'none';
        }
    }, [showScrollbar]);

    const classNames = [
        'fc-virtual-list',
        !showScrollbar && 'fc-virtual-list--hide-scrollbar',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={containerRef}
            className={classNames}
            style={{ height: `${height}px`, ...style }}
            onScroll={handleScroll}
        >
            <div
                className="fc-virtual-list__container"
                style={{ height: `${totalHeight}px` }}
            >
                <div
                    className="fc-virtual-list__content"
                    style={{ transform: `translateY(${offsetY}px)` }}
                >
                    {visibleData.map((item, idx) => {
                        const actualIndex = visibleRange.startIndex + idx;
                        return (
                            <div
                                key={actualIndex}
                                className="fc-virtual-list__item"
                                style={{ height: `${itemHeight}px` }}
                            >
                                {renderItem(item, actualIndex)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default VirtualList;