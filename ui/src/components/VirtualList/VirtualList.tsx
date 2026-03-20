// src/components/VirtualList/VirtualList.tsx
import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import './VirtualList.css';

export interface VirtualListProps {
    data: any[];
    height: number;
    itemHeight: number;
    renderItem: (item: any, index: number) => ReactNode;
    className?: string;
}

export const VirtualList: React.FC<VirtualListProps> = ({
                                                            data = [],
                                                            height,
                                                            itemHeight,
                                                            renderItem,
                                                            className = ''
                                                        }) => {
    const [visibleData, setVisibleData] = useState<any[]>([]);
    const [startIndex, setStartIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const updateVisibleData = useCallback(() => {
        if (!containerRef.current) return;

        const scrollTop = containerRef.current.scrollTop;
        const containerHeight = containerRef.current.clientHeight;

        const start = Math.floor(scrollTop / itemHeight);
        const visibleCount = Math.ceil(containerHeight / itemHeight);
        const end = Math.min(data.length, start + visibleCount + 2);

        setStartIndex(Math.max(0, start - 1));
        setVisibleData(data.slice(Math.max(0, start - 1), end));
    }, [data, itemHeight]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('scroll', updateVisibleData);
        updateVisibleData();

        return () => container.removeEventListener('scroll', updateVisibleData);
    }, [updateVisibleData]);

    useEffect(() => {
        updateVisibleData();
    }, [data, updateVisibleData]);

    const totalHeight = data.length * itemHeight;
    const offsetY = startIndex * itemHeight;

    return (
        <div
            ref={containerRef}
            className={`virtual-list ${className}`}
            style={{ height, overflowY: 'auto', position: 'relative' }}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        transform: `translateY(${offsetY}px)`
                    }}
                >
                    {visibleData.map((item, index) => (
                        <div key={item.id || index} style={{ height: itemHeight }}>
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VirtualList;