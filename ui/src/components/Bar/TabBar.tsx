// src/components/TabBar/TabBar.tsx
import React, { useRef, useCallback, memo, useEffect } from 'react';
import './TabBar.css';

/* ========== 类型定义 ========== */
export interface TabItem {
    key: string;
    label: React.ReactNode;
    disabled?: boolean;
    closable?: boolean;
}

export interface TabBarProps {
    items: TabItem[];
    activeKey: string;
    variant?: 'attached' | 'floating';
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    tabRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closable?: boolean;
    addable?: boolean;
    draggable?: boolean;
    minTabWidth?: number;
    maxTabWidth?: number;
    onChange: (activeKey: string) => void;
    onClose?: (key: string) => void;
    onAdd?: () => void;
    onReorder?: (reorderedItems: TabItem[]) => void;
    tabClassName?: string;
    activeTabClassName?: string;
    tabStyle?: React.CSSProperties;
    activeTabStyle?: React.CSSProperties;
    renderCloseIcon?: (key: string) => React.ReactNode;
    renderAddButton?: () => React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    background?: string;
    tabColor?: string;
    tabHoverColor?: string;
    tabHoverBackground?: string;
    tabActiveColor?: string;
    tabActiveBackground?: string;
    activeIndicatorColor?: string;
}

/* ========== 子组件：单个 Tab ========== */
interface TabItemViewProps {
    item: TabItem;
    isActive: boolean;
    closable: boolean;
    draggable: boolean;
    tabClassName?: string;
    activeTabClassName?: string;
    tabStyle?: React.CSSProperties;
    activeTabStyle?: React.CSSProperties;
    renderCloseIcon?: (key: string) => React.ReactNode;
    onClick: (key: string) => void;
    onClose: (e: React.MouseEvent, key: string) => void;
    onDragStart: (e: React.DragEvent, key: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, key: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
}

const TabItemView = memo<TabItemViewProps>(({
                              item, isActive, closable, draggable,
                              tabClassName, activeTabClassName, tabStyle, activeTabStyle,
                              renderCloseIcon, onClick, onClose,
                              onDragStart, onDragOver, onDrop, onDragEnd,
                          }) => {
    const showClose = item.closable !== undefined ? item.closable : closable;

    const classes = [
        'fc-tab-bar__tab',
        isActive && 'fc-tab-bar__tab--active',
        item.disabled && 'fc-tab-bar__tab--disabled',
        draggable && !item.disabled && 'fc-tab-bar__tab--draggable',
        tabClassName,
        isActive && activeTabClassName,
    ].filter(Boolean).join(' ');

    const mergedStyle: React.CSSProperties = {
        ...tabStyle,
        ...(isActive ? activeTabStyle : undefined),
    };

    return (
        <div
            className={classes}
            style={mergedStyle}
            onClick={() => !item.disabled && onClick(item.key)}
            draggable={draggable && !item.disabled}
            onDragStart={(e) => onDragStart(e, item.key)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, item.key)}
            onDragEnd={onDragEnd}
            role="tab"
            aria-selected={isActive}
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : 0}
        >
            <span className="fc-tab-bar__tab-label">{item.label}</span>
            {showClose && !item.disabled && (
                <span
                    className="fc-tab-bar__tab-close"
                    onClick={(e) => onClose(e, item.key)}
                    role="button"
                    aria-label="关闭"
                >
          {renderCloseIcon ? renderCloseIcon(item.key) : '×'}
        </span>
            )}
        </div>
    );
});
TabItemView.displayName = 'TabItemView';

/* ========== 主组件：TabBar ========== */
export const TabBar = memo<TabBarProps>(({
                                items, activeKey,
                                variant = 'attached', radius = 'md', tabRadius,
                                closable = false, addable = false, draggable = false,
                                minTabWidth = 8, maxTabWidth = 18,
                                onChange, onClose, onAdd, onReorder,
                                tabClassName, activeTabClassName, tabStyle, activeTabStyle,
                                renderCloseIcon, renderAddButton,
                                className = '', style,
                                background, tabColor, tabHoverColor, tabHoverBackground,
                                tabActiveColor, tabActiveBackground, activeIndicatorColor,
                            }) => {
    const cssVarMap: Record<string, string | undefined> = {
        '--tab-bar-bg': background,
        '--tab-color': tabColor,
        '--tab-hover-color': tabHoverColor,
        '--tab-hover-bg': tabHoverBackground,
        '--tab-active-color': tabActiveColor,
        '--tab-active-bg': tabActiveBackground,
        '--tab-active-indicator': activeIndicatorColor,
        '--tab-min-width': `${minTabWidth}rem`,
        '--tab-max-width': `${maxTabWidth}rem`,
    };

    const cssVars: React.CSSProperties = {};
    for (const [k, v] of Object.entries(cssVarMap)) {
        if (v !== undefined) (cssVars as any)[k] = v;
    }

    const mergedStyle: React.CSSProperties = { ...cssVars, ...style };

    const navOuterRef = useRef<HTMLDivElement>(null);
    const addBtnRef = useRef<HTMLDivElement>(null);
    const navWrapRef = useRef<HTMLDivElement>(null);
    const dragKeyRef = useRef<string | null>(null);

    // 纵向滚轮 → 横向滚动
    useEffect(() => {
        const el = navWrapRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            if (e.deltaY === 0 || e.deltaX !== 0) return;
            el.scrollLeft += e.deltaY;
            e.preventDefault();
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    // 新增 tab 时自动滚动到末尾
    const prevLenRef = useRef(items.length);
    useEffect(() => {
        const prev = prevLenRef.current;
        prevLenRef.current = items.length;
        if (items.length <= prev) return;
        const el = navWrapRef.current;
        if (!el) return;
        requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
    }, [items.length]);

    const handleClick = useCallback((key: string) => onChange(key), [onChange]);

    const handleClose = useCallback((e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        onClose?.(key);
    }, [onClose]);

    const handleDragStart = useCallback((e: React.DragEvent, key: string) => {
        dragKeyRef.current = key;
        e.dataTransfer.effectAllowed = 'move';
        const target = e.currentTarget as HTMLElement;
        requestAnimationFrame(() => target.classList.add('fc-tab-bar__tab--dragging'));
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        const dragKey = dragKeyRef.current;
        if (!dragKey || dragKey === targetKey || !onReorder) return;
        const from = items.findIndex((i) => i.key === dragKey);
        const to = items.findIndex((i) => i.key === targetKey);
        if (from === -1 || to === -1) return;
        const reordered = [...items];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        onReorder(reordered);
    }, [items, onReorder]);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        dragKeyRef.current = null;
        (e.currentTarget as HTMLElement).classList.remove('fc-tab-bar__tab--dragging');
    }, []);

    const rootClasses = [
        'fc-tab-bar',
        `fc-tab-bar--${variant}`,
        `fc-tab-bar--radius-${radius}`,
        tabRadius && `fc-tab-bar--tab-radius-${tabRadius}`,
        className,
    ].filter(Boolean).join(' ');

    const navWrapClasses = [
        'fc-tab-bar__nav-wrap',
        'fc-tab-bar__nav-wrap--scroll', // 始终启用滚动模式，由 CSS 控制
    ].filter(Boolean).join(' ');

    return (
        <div className={rootClasses} style={mergedStyle} role="tablist">
            <div className="fc-tab-bar__nav-outer" ref={navOuterRef}>
                <div className={navWrapClasses} ref={navWrapRef}>
                    {items.map((item) => (
                        <TabItemView
                            key={item.key}
                            item={item}
                            isActive={activeKey === item.key}
                            closable={closable}
                            draggable={draggable}
                            tabClassName={tabClassName}
                            activeTabClassName={activeTabClassName}
                            tabStyle={tabStyle}
                            activeTabStyle={activeTabStyle}
                            renderCloseIcon={renderCloseIcon}
                            onClick={handleClick}
                            onClose={handleClose}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                        />
                    ))}
                    {addable && (
                        <div
                            className="fc-tab-bar__add-btn"
                            ref={addBtnRef}
                            onClick={onAdd}
                            role="button"
                            aria-label="添加标签"
                        >
                            {renderAddButton ? renderAddButton() : '+'}
                        </div>
                    )}
                </div>
                {/* Tauri 拖拽区域：只在空白处启用 */}
                <div className="fc-tab-bar__drag-handle" data-tauri-drag-region />
            </div>
        </div>
    );
});
TabBar.displayName = 'TabBar';
export default TabBar;