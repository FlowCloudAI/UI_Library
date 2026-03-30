// src/components/TabBar/TabBar.tsx
import React, { useRef, useCallback, memo, useState, useEffect } from 'react';
import './TabBar.css';
import { RollingBox } from '../Box/RollingBox';

/* ========== 类型定义 ========== */

export interface TabItem {
    /** 唯一标识 */
    key: string;
    /** 标签显示内容 */
    label: React.ReactNode;
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否可关闭（覆盖全局 closable） */
    closable?: boolean;
}

export interface TabBarProps {
    /** Tab 列表（受控） */
    items: TabItem[];
    /** 当前激活的 Tab key（受控） */
    activeKey: string;

    /**
     * 布局变体
     * - attached: 贴合模式 — 标签底部紧贴导航栏下边缘，底部线条作为激活指示器
     * - floating: 悬浮模式 — 标签垂直居中悬浮，胶囊形态，背景填充作为激活指示器
     * @default 'attached'
     */
    variant?: 'attached' | 'floating';

    /** TabBar 容器圆角 */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    /** 单个 Tab 项的圆角（仅在 floating 模式下或需要四周圆角时使用） */
    tabRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    /** 是否显示关闭按钮 */
    closable?: boolean;
    /** 是否显示添加按钮 */
    addable?: boolean;
    /** 是否启用拖拽排序 */
    draggable?: boolean;
    /**
     * Tab 最小宽度比例（相对 window.innerWidth）。
     * 当均分后每个 Tab 宽度 < window.innerWidth * minWidthRatio 时，切换为横向滚动模式。
     * @default 0.07
     */
    minWidthRatio?: number;

    /* ---- 回调 ---- */

    onChange: (activeKey: string) => void;
    onClose?: (key: string) => void;
    onAdd?: () => void;
    onReorder?: (reorderedItems: TabItem[]) => void;

    /* ---- 样式定制 ---- */

    /** 每个 Tab 的自定义 className */
    tabClassName?: string;
    /** 激活态 Tab 的额外 className */
    activeTabClassName?: string;
    /** 每个 Tab 的自定义 inline style */
    tabStyle?: React.CSSProperties;
    /** 激活态 Tab 的自定义 inline style（会合并到 tabStyle 之上） */
    activeTabStyle?: React.CSSProperties;

    /** 自定义关闭图标渲染 */
    renderCloseIcon?: (key: string) => React.ReactNode;
    /** 自定义添加按钮渲染 */
    renderAddButton?: () => React.ReactNode;

    className?: string;
    style?: React.CSSProperties;

    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    /** 容器背景色 */
    background?: string;
    /** 标签默认文字色 */
    tabColor?: string;
    /** 标签 hover 文字色 */
    tabHoverColor?: string;
    /** 标签 hover 背景色 */
    tabHoverBackground?: string;
    /** 激活态文字色 */
    tabActiveColor?: string;
    /** 激活态背景色 */
    tabActiveBackground?: string;
    /** 激活态指示器颜色（attached 模式底线 / floating 模式无效） */
    activeIndicatorColor?: string;
}

/* ========== 子组件：单个 Tab ========== */

interface TabItemViewProps {
    item: TabItem;
    isActive: boolean;
    closable: boolean;
    draggable: boolean;
    /** 均分模式下的固定宽度（px），undefined = 自然宽度（滚动模式） */
    tabWidth?: number;
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
                                                item,
                                                isActive,
                                                closable,
                                                draggable,
                                                tabWidth,
                                                tabClassName,
                                                activeTabClassName,
                                                tabStyle,
                                                activeTabStyle,
                                                renderCloseIcon,
                                                onClick,
                                                onClose,
                                                onDragStart,
                                                onDragOver,
                                                onDrop,
                                                onDragEnd,
                                            }) => {
    const showClose = item.closable !== undefined ? item.closable : closable;

    // 计算是否需要紧凑模式：当 tabWidth 小于临界值时（padding*2 + gap + close = 6*2 + 8 + 18 = 38px）
    // 保留一些余量，设置为 42px
    const isCompact = tabWidth !== undefined && tabWidth < 50;

    const classes = [
        'fc-tab-bar__tab',
        isActive && 'fc-tab-bar__tab--active',
        item.disabled && 'fc-tab-bar__tab--disabled',
        draggable && !item.disabled && 'fc-tab-bar__tab--draggable',
        tabClassName,
        isActive && activeTabClassName,
    ].filter(Boolean).join(' ');

    const mergedStyle: React.CSSProperties = {
        ...(tabWidth !== undefined ? { width: tabWidth, boxSizing: 'border-box', flexShrink: 0 } : undefined),
        ...tabStyle,
        ...(isActive ? activeTabStyle : undefined),
    };

    return (
        <div
            className={classes}
            style={mergedStyle}
            data-compact={isCompact || undefined}
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
                    aria-label={`关闭 ${false ? item.label : ''}`}
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
                                             items,
                                             activeKey,
                                             variant = 'attached',
                                             radius = 'md',
                                             tabRadius,
                                             closable = false,
                                             addable = false,
                                             draggable = false,
                                             minWidthRatio = 0.07,
                                             onChange,
                                             onClose,
                                             onAdd,
                                             onReorder,
                                             tabClassName,
                                             activeTabClassName,
                                             tabStyle,
                                             activeTabStyle,
                                             renderCloseIcon,
                                             renderAddButton,
                                             className = '',
                                             style,
                                             background,
                                             tabColor,
                                             tabHoverColor,
                                             tabHoverBackground,
                                             tabActiveColor,
                                             tabActiveBackground,
                                             activeIndicatorColor,
                                         }) => {
    const colorVars: Record<string, string | undefined> = {
        '--tab-bar-bg':           background,
        '--tab-color':            tabColor,
        '--tab-hover-color':      tabHoverColor,
        '--tab-hover-bg':         tabHoverBackground,
        '--tab-active-color':     tabActiveColor,
        '--tab-active-bg':        tabActiveBackground,
        '--tab-active-indicator': activeIndicatorColor,
    };

    const overrideStyle: React.CSSProperties = {};
    for (const [key, value] of Object.entries(colorVars)) {
        if (value !== undefined) {
            (overrideStyle as any)[key] = value;
        }
    }

    const mergedStyle: React.CSSProperties = { ...overrideStyle, ...style };
    const dragKeyRef = useRef<string | null>(null);

    // ── 自适应宽度 ──────────────────────────────────────────────────────────
    const navRef = useRef<HTMLDivElement>(null);
    const [scrollMode, setScrollMode] = useState(false);
    const [tabWidth, setTabWidth] = useState<number | undefined>(undefined);

    const calculate = useCallback(() => {
        const navOuter = navRef.current?.parentElement;
        const nav = navRef.current;
        if (!nav || !navOuter || items.length === 0) return;
        
        const navOuterCS = getComputedStyle(navOuter);
        const navWrap = nav.querySelector('.fc-tab-bar__nav-wrap');
        
        // 获取 addBtn 的实际占用空间（宽度 + margin）
        const addBtnElement = navOuter.querySelector('.fc-tab-bar__add-btn');
        const addBtnTotalWidth = addable && addBtnElement 
            ? addBtnElement.getBoundingClientRect().width
            : 0;
        
        // navOuter 的可用宽度（减去 padding）
        const navOuterW = navOuter.clientWidth
            - parseFloat(navOuterCS.paddingLeft)
            - parseFloat(navOuterCS.paddingRight);
        
        // nav 实际可用的宽度 = navOuter 可用宽度 - addBtn 占用空间
        const navW = navOuterW - addBtnTotalWidth;
        
        // 获取 Tab 之间的 gap（attached 模式为 0，floating 模式为 4px）
        const tabGap = navWrap ? parseFloat(getComputedStyle(navWrap).gap) : 0;
        
        // 计算每个 Tab 的理想宽度（考虑 gap 占用的空间）
        // 总 gap = (items.length - 1) * tabGap
        const totalGapWidth = (items.length - 1) * tabGap;
        const idealW = (navW - totalGapWidth) / items.length;
        
        const threshold = window.innerWidth * minWidthRatio;
        
        // 计算最小允许宽度：padding(16*2) + gap(8) + close(18) = 58px
        // 在紧凑模式下：padding(6*2) + gap(8) + close(18) = 38px
        // 为了保护 close 按钮，设置硬性下限 42px（紧凑模式阈值）
        const minAllowedWidth = 42;
        
        if (idealW < threshold) {
            // 滚动模式：Tab 宽度锁在 threshold，与切换前一致，临界点无跳跃
            setScrollMode(true);
            setTabWidth(Math.max(threshold, minAllowedWidth));
        } else {
            setScrollMode(false);
            setTabWidth(Math.max(idealW, minAllowedWidth));
        }
    }, [items.length, minWidthRatio, addable]);

    useEffect(() => {
        calculate();
        window.addEventListener('resize', calculate);
        return () => window.removeEventListener('resize', calculate);
    }, [calculate]);

    const handleClick = useCallback(
        (key: string) => onChange(key),
        [onChange],
    );

    const handleClose = useCallback(
        (e: React.MouseEvent, key: string) => {
            e.stopPropagation();
            onClose?.(key);
        },
        [onClose],
    );

    const handleDragStart = useCallback(
        (e: React.DragEvent, key: string) => {
            dragKeyRef.current = key;
            e.dataTransfer.effectAllowed = 'move';
            const target = e.currentTarget as HTMLElement;
            requestAnimationFrame(() => target.classList.add('fc-tab-bar__tab--dragging'));
        },
        [],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, targetKey: string) => {
            e.preventDefault();
            const dragKey = dragKeyRef.current;
            if (!dragKey || dragKey === targetKey || !onReorder) return;

            const fromIndex = items.findIndex((i) => i.key === dragKey);
            const toIndex = items.findIndex((i) => i.key === targetKey);
            if (fromIndex === -1 || toIndex === -1) return;

            const reordered = [...items];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);
            onReorder(reordered);
        },
        [items, onReorder],
    );

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        dragKeyRef.current = null;
        (e.currentTarget as HTMLElement).classList.remove('fc-tab-bar__tab--dragging');
    }, []);

    /* ---- 渲染 ---- */

    const rootClasses = [
        'fc-tab-bar',
        `fc-tab-bar--${variant}`,
        `fc-tab-bar--radius-${radius}`,
        tabRadius && `fc-tab-bar--tab-radius-${tabRadius}`,
        !scrollMode && tabWidth !== undefined && 'fc-tab-bar--shrink',
        className,
    ].filter(Boolean).join(' ');

    const tabList = (
        <div className="fc-tab-bar__nav-wrap">
            {items.map((item) => (
                <TabItemView
                    key={item.key}
                    item={item}
                    isActive={activeKey === item.key}
                    closable={closable}
                    draggable={draggable}
                    tabWidth={tabWidth}
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
        </div>
    );

    const addBtn = addable && (
        <div
            className="fc-tab-bar__add-btn"
            onClick={onAdd}
            role="button"
            aria-label="添加标签"
        >
            {renderAddButton ? renderAddButton() : '+'}
        </div>
    );

    return (
        <div className={rootClasses} style={mergedStyle} role="tablist">
            <div className={`fc-tab-bar__nav-outer${scrollMode ? ' fc-tab-bar__nav-outer--scroll' : ''}`}>
                <div className={`fc-tab-bar__nav${scrollMode ? ' fc-tab-bar__nav--scroll' : ''}`} ref={navRef}>
                    {scrollMode ? (
                        // flex:1 + minWidth:0 强制 RollingBox 收缩至 nav 宽度，使 scrollWidth > clientWidth 触发内部滚动
                        <RollingBox horizontal showThumb="hide" style={{ flex: 1, minWidth: 0, height: 'auto' }}>
                            {tabList}
                        </RollingBox>
                    ) : tabList}
                </div>
                {addBtn}
            </div>
        </div>
    );
});

TabBar.displayName = 'TabBar';

export default TabBar;