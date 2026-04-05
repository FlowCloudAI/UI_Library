// src/components/TabBar/TabBar.tsx
import React, {useRef, useCallback, memo, useEffect, useMemo} from 'react';
import './TabBar.css';
import {
    DndContext,
    closestCenter,
    MouseSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type Modifier,
} from '@dnd-kit/core';

// 限制拖拽在水平轴且不超出容器边界（替代 @dnd-kit/modifiers 的两个 modifier）
function useContainerBoundModifier(containerRef: React.RefObject<HTMLDivElement | null>): Modifier {
    return useMemo(() => ({transform, activeNodeRect}) => {
        if (!containerRef.current || !activeNodeRect) {
            return {...transform, y: 0};
        }
        const {left, right} = containerRef.current.getBoundingClientRect();
        // 算出元素在当前 scroll 位置下能向左/右移动的最大距离
        const minX = left - activeNodeRect.left;
        const maxX = right - activeNodeRect.right;
        return {
            ...transform,
            y: 0,
            x: Math.min(Math.max(transform.x, minX), maxX),
        };
    }, [containerRef]);
}
import {
    SortableContext,
    useSortable,
    horizontalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

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
     * Tab 最小宽度，支持任意 CSS 长度值（如 "8rem"、"120px"）。
     * Tab 压缩至此宽度后触发横向滚动。
     * @default "80px"
     */
    minTabWidth?: string;
    /**
     * Tab 最大宽度，支持任意 CSS 长度值（如 "16rem"、"200px"）。
     * Tab 较少时不超过此宽度。
     * @default "200px"
     */
    maxTabWidth?: string;
    /**
     * 控制 Tab 是否自动填充容器宽度。
     * - true: flex: 1 1 0，Tab 会自动拉伸填满导航栏（默认行为）
     * - false: flex: 0 1 auto，Tab 只占内容宽度，剩余空间留白
     * 当 tauriDragRegion 为 true 且 fillWidth 为 false 时，空白区域可作为窗口拖拽区。
     * @default true
     */
    fillWidth?: boolean;

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
    /**
     * 将 TabBar 空白区域标记为 Tauri 窗口拖拽区域。
     * 开启后，标签之外的空白处可拖动窗口；标签、关闭、添加按钮已内置 no-drag 保护。
     * @default false
     */
    tauriDragRegion?: boolean;
}

/* ========== 子组件：单个 Tab ========== */

interface TabItemViewProps {
    item: TabItem;
    isActive: boolean;
    closable: boolean;
    draggable: boolean;
    stopMouseDown: boolean;
    tabClassName?: string;
    activeTabClassName?: string;
    tabStyle?: React.CSSProperties;
    activeTabStyle?: React.CSSProperties;
    renderCloseIcon?: (key: string) => React.ReactNode;
    onClick: (key: string) => void;
    onClose: (e: React.MouseEvent, key: string) => void;
}

const TabItemView = memo<TabItemViewProps>(({
    item,
    isActive,
    closable,
    draggable,
    stopMouseDown,
    tabClassName,
    activeTabClassName,
    tabStyle,
    activeTabStyle,
    renderCloseIcon,
    onClick,
    onClose,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.key,
        disabled: !draggable || !!item.disabled,
    });

    const showClose = item.closable !== undefined ? item.closable : closable;

    const classes = [
        'fc-tab-bar__tab',
        isActive && 'fc-tab-bar__tab--active',
        item.disabled && 'fc-tab-bar__tab--disabled',
        draggable && !item.disabled && 'fc-tab-bar__tab--draggable',
        isDragging && 'fc-tab-bar__tab--dragging',
        tabClassName,
        isActive && activeTabClassName,
    ].filter(Boolean).join(' ');

    const mergedStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...tabStyle,
        ...(isActive ? activeTabStyle : undefined),
    };

    // 将 dnd-kit 的 onMouseDown 与 Tauri stopPropagation 合并
    // dnd-kit 必须先执行（注册后续 mousemove/mouseup 监听），再阻断冒泡
    const {onMouseDown: dndMouseDown, ...restListeners} = listeners ?? {};
    const handleMouseDown = (e: React.MouseEvent) => {
        dndMouseDown?.(e as any);
        if (stopMouseDown) e.stopPropagation();
    };

    return (
        <div
            ref={setNodeRef}
            className={classes}
            style={mergedStyle}
            onClick={() => !item.disabled && onClick(item.key)}
            onMouseDown={handleMouseDown}
            {...attributes}
            {...restListeners}
            role="tab"
            aria-selected={isActive}
            aria-disabled={item.disabled}
            tabIndex={item.disabled ? -1 : 0}
        >
            <span className="fc-tab-bar__tab-label">{item.label}</span>
            {showClose && !item.disabled && (
                <span
                    className="fc-tab-bar__tab-close"
                    onPointerDown={(e) => e.stopPropagation()}
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
    items,
    activeKey,
    variant = 'attached',
    radius = 'md',
    tabRadius,
    closable = false,
    addable = false,
    draggable = false,
    minTabWidth = '80px',
    maxTabWidth = '200px',
    fillWidth = true,
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
    tauriDragRegion = false,
    background,
    tabColor,
    tabHoverColor,
    tabHoverBackground,
    tabActiveColor,
    tabActiveBackground,
    activeIndicatorColor,
}) => {
    const colorVars: Record<string, string | undefined> = {
        '--tab-bar-bg': background,
        '--tab-color': tabColor,
        '--tab-hover-color': tabHoverColor,
        '--tab-hover-bg': tabHoverBackground,
        '--tab-active-color': tabActiveColor,
        '--tab-active-bg': tabActiveBackground,
        '--tab-active-indicator': activeIndicatorColor,
    };

    const overrideStyle: React.CSSProperties = {};
    for (const [key, value] of Object.entries(colorVars)) {
        if (value !== undefined) {
            (overrideStyle as any)[key] = value;
        }
    }

    const mergedStyle: React.CSSProperties = {...overrideStyle, ...style};
    const navRef = useRef<HTMLDivElement>(null);
    const boundModifier = useContainerBoundModifier(navRef);

    // 新增 tab 时自动滚动到末尾
    const prevItemsLengthRef = useRef(items.length);
    useEffect(() => {
        const prev = prevItemsLengthRef.current;
        prevItemsLengthRef.current = items.length;
        if (items.length <= prev) return;
        const nav = navRef.current;
        if (!nav) return;
        requestAnimationFrame(() => { nav.scrollLeft = nav.scrollWidth; });
    }, [items.length]);

    // 鼠标滚轮垂直滚动转为水平滚动（原生 overflow-x: auto 不自动处理 deltaY）
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            nav.scrollLeft += Number(e.deltaY);
        };
        nav.addEventListener('wheel', handleWheel, {passive: false});
        return () => nav.removeEventListener('wheel', handleWheel);
    }, []);

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

    // MouseSensor：Tauri/WebView2 下 pointerdown 被 Windows 吃掉，必须用 mousedown 驱动的 MouseSensor
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {distance: 5},
        }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const {active, over} = event;
        if (!over || active.id === over.id || !onReorder) return;
        const fromIndex = items.findIndex((i) => i.key === active.id);
        const toIndex = items.findIndex((i) => i.key === over.id);
        if (fromIndex === -1 || toIndex === -1) return;
        onReorder(arrayMove(items, fromIndex, toIndex));
    }, [items, onReorder]);

    /* ---- 渲染 ---- */

    const rootClasses = [
        'fc-tab-bar',
        `fc-tab-bar--${variant}`,
        `fc-tab-bar--radius-${radius}`,
        tabRadius && `fc-tab-bar--tab-radius-${tabRadius}`,
        className,
    ].filter(Boolean).join(' ');

    // Tab 宽度上下限通过 CSS 变量传入，CSS flex 自动处理压缩与滚动
    const navWrapStyle = {
        '--tab-min-width': minTabWidth,
        '--tab-max-width': maxTabWidth,
        '--tab-fill-width': fillWidth ? '1' : '0',
    } as React.CSSProperties;

    const dragRegion = tauriDragRegion ? {'data-tauri-drag-region': ''} : {};

    const tabItems = items.map((item) => (
        <TabItemView
            key={item.key}
            item={item}
            isActive={activeKey === item.key}
            closable={closable}
            draggable={draggable}
            stopMouseDown={tauriDragRegion}
            tabClassName={tabClassName}
            activeTabClassName={activeTabClassName}
            tabStyle={tabStyle}
            activeTabStyle={activeTabStyle}
            renderCloseIcon={renderCloseIcon}
            onClick={handleClick}
            onClose={handleClose}
        />
    ));

    return (
        <div className={rootClasses} style={mergedStyle} role="tablist" {...dragRegion}>
            <div className="fc-tab-bar__nav-outer" {...dragRegion}>
                <div className="fc-tab-bar__nav-wrap" ref={navRef} style={navWrapStyle}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[boundModifier]}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map((i) => i.key)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {tabItems}
                        </SortableContext>
                    </DndContext>
                    {addable && (
                        <div
                            className="fc-tab-bar__add-btn"
                            onClick={onAdd}
                            onMouseDown={tauriDragRegion ? (e) => e.stopPropagation() : undefined}
                            role="button"
                            aria-label="添加标签"
                        >
                            {renderAddButton ? renderAddButton() : '+'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

TabBar.displayName = 'TabBar';

export default TabBar;
