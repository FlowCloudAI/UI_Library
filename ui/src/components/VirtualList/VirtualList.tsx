// VirtualList.tsx
import './VirtualList.css';
import * as React from "react";
import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";

export interface VirtualListVisibleRange {
    startIndex: number;
    endIndexExclusive: number;
}

export interface VirtualListProps<T = any> {
    /** 数据源 */
    data: T[];
    /** 容器高度 */
    height: number;
    /** 每项固定高度 */
    itemHeight: number;
    /** 渲染函数 */
    renderItem: (item: T, index: number) => React.ReactNode;
    /** 稳定 key 生成函数；未提供时回退为 index。 */
    getKey?: (item: T, index: number) => React.Key;
    /** 容器类名 */
    className?: string;
    /** 滚动偏移量（预加载区域） */
    overscan?: number;
    /** 是否显示滚动条 */
    showScrollbar?: boolean;
    /** 真实视口范围变化回调（不含 overscan） */
    onVisibleRangeChange?: (range: VirtualListVisibleRange) => void;
    /** 滚动到底部回调 */
    onScrollEnd?: () => void;
    /** 容器样式 */
    style?: React.CSSProperties;
}

// 单项包装，避免滚动时整个列表重渲染
const VirtualItem = memo(({ children, height }: { children: React.ReactNode; height: number }) => (
    <div className="fc-virtual-list__item" style={{ height: `${height}px` }}>
        {children}
    </div>
));
VirtualItem.displayName = 'VirtualItem';

export function VirtualList<T>({
                                   data,
                                   height,
                                   itemHeight,
                                   renderItem,
                                   getKey,
                                   className = '',
                                   overscan = 3,
                                   showScrollbar = true,
                                   onVisibleRangeChange,
                                   onScrollEnd,
                                   style
                               }: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const lastVisibleRangeRef = useRef<VirtualListVisibleRange | null>(null);
    const lastVisibleRangeCallbackRef = useRef<typeof onVisibleRangeChange>(undefined);

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

    // 计算真实视口范围（不含 overscan）
    const visibleRange = useMemo(() => {
        const startIndex = Math.min(
            data.length,
            Math.max(0, Math.floor(scrollTop / itemHeight))
        );
        const endIndexExclusive = Math.min(
            data.length,
            Math.max(startIndex, Math.ceil((scrollTop + height) / itemHeight))
        );
        return { startIndex, endIndexExclusive };
    }, [scrollTop, height, itemHeight, data.length]);

    // 计算实际渲染范围（含 overscan）
    const renderedRange = useMemo(() => {
        const startIndex = Math.max(0, visibleRange.startIndex - overscan);
        const endIndexExclusive = Math.min(
            data.length,
            visibleRange.endIndexExclusive + overscan
        );
        return { startIndex, endIndexExclusive };
    }, [data.length, overscan, visibleRange]);

    useEffect(() => {
        const callbackChanged = lastVisibleRangeCallbackRef.current !== onVisibleRangeChange;
        lastVisibleRangeCallbackRef.current = onVisibleRangeChange;

        if (!onVisibleRangeChange) {
            lastVisibleRangeRef.current = null;
            return;
        }

        const prev = lastVisibleRangeRef.current;
        const rangeUnchanged = prev !== null
            && prev.startIndex === visibleRange.startIndex
            && prev.endIndexExclusive === visibleRange.endIndexExclusive;

        if (!callbackChanged && rangeUnchanged) return;

        lastVisibleRangeRef.current = visibleRange;
        onVisibleRangeChange(visibleRange);
    }, [onVisibleRangeChange, visibleRange]);

    // 可见数据
    const visibleData = useMemo(() => {
        return data.slice(renderedRange.startIndex, renderedRange.endIndexExclusive);
    }, [data, renderedRange]);

    // 偏移量
    const offsetY = renderedRange.startIndex * itemHeight;

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
                        const actualIndex = renderedRange.startIndex + idx;
                        return (
                            <VirtualItem key={getKey?.(item, actualIndex) ?? actualIndex} height={itemHeight}>
                                {renderItem(item, actualIndex)}
                            </VirtualItem>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default VirtualList;
