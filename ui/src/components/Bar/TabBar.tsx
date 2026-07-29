// src/components/TabBar/TabBar.tsx
import React, {useRef, useCallback, memo, useEffect, useMemo, useState} from 'react';
import './TabBar.css';
import type {FcChangeHandler, FcChangeMeta, FcRadius} from '../../types/common';
import {isDevelopmentRuntime} from '../../utils/runtime';
import {buildCssVars} from '../../utils/cssVars';
import {useDeprecatedPropWarning} from '../../hooks/useDeprecatedPropWarning';
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

function isSameItemOrder(a: TabItem[], b: TabItem[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (a[i]?.key !== b[i]?.key) return false;
    }
    return true;
}

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

export type TabBarVariant = 'attached' | 'floating';
export type TabBarSizing = 'fill' | 'fit' | 'adaptive';
export type TabBarRadius = FcRadius;
export type TabBarSelectedKeyChangeMeta = FcChangeMeta<
    React.MouseEvent<HTMLDivElement> | {active: {id: React.Key}}
>;
export type TabBarSelectedKeyChangeHandler = FcChangeHandler<string, TabBarSelectedKeyChangeMeta>;

export interface TabBarTokens {
    background?: string;
    tabColor?: string;
    tabHoverColor?: string;
    tabHoverBackground?: string;
    tabActiveColor?: string;
    tabActiveBackground?: string;
    activeIndicatorColor?: string;
}

export interface TabBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /** Tab 列表（受控） */
    items: TabItem[];
    /** 当前选中的 Tab key（受控）。 */
    selectedKey?: string;
    /** @deprecated 保留兼容，推荐改用 selectedKey。 */
    activeKey?: string;

    /**
     * 布局变体
     * - attached: 贴合模式 — 标签底部紧贴导航栏下边缘，底部线条作为激活指示器
     * - floating: 悬浮模式 — 标签垂直居中悬浮，胶囊形态，背景填充作为激活指示器
     * @default 'attached'
     */
    variant?: TabBarVariant;

    /** TabBar 容器圆角 */
    radius?: TabBarRadius;
    /** 单个 Tab 项的圆角（仅在 floating 模式下或需要四周圆角时使用） */
    tabRadius?: TabBarRadius;
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
     * Tab 宽度策略。
     * - `fill`: Tab 均分并撑满导航栏，宽度钳在 [minTabWidth, maxTabWidth]
     * - `fit`: 导航区按内容宽度收缩，Tab 只占内容宽度，不伸不缩
     * - `adaptive`: 浏览器式三段行为 —— 空间富裕时维持 maxTabWidth，
     *   空间不足时平滑收缩，触底 minTabWidth 后转为横向滚动
     *
     * `fit` 与 `adaptive` 下导航区按内容收缩，右侧留白归 nav-outer，
     * 配合 tauriDragRegion 可作为窗口拖拽区；`fill` 下留白被导航区占满，拖拽区失效。
     * @default 'fill'
     */
    tabSizing?: TabBarSizing;
    /**
     * 在导航区右侧永久预留的空白宽度，支持任意 CSS 长度值（如 "96px"）。
     * 该空白归 nav-outer 所有，因此始终是 tauriDragRegion 的有效命中区域 ——
     * `adaptive` 收缩到撑满后留白会归零，无边框窗口会连带丢失拖拽入口，用它兜底。
     * 仅对 `fit` / `adaptive` 生效（`fill` 下导航区本就撑满，没有可预留的空间）。
     *
     * 值直接进 `calc(100% - …)`，因此可用函数式长度让预留量随容器自适应：
     * `min(96px, 12%)` 在宽容器下等同 96px，窄容器下按比例收窄，避免定值在窄窗口
     * 吃掉过多标签区。百分比相对导航区内容宽度解析。
     * @default "0px"
     */
    dragGutter?: string;
    /** @deprecated 保留兼容，推荐改用 tabSizing（true → `fill`，false → `fit`）。 */
    fillWidth?: boolean;

    /* ---- 回调 ---- */

    /** 推荐使用的选中项变更回调。 */
    onSelectedKeyChange?: TabBarSelectedKeyChangeHandler;
    /** @deprecated 保留兼容，推荐改用 onSelectedKeyChange。 */
    onChange?: (activeKey: string) => void;
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

    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<TabBarTokens>;

    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */
    /** @deprecated 推荐改用 tokens.background。 */
    background?: string;
    /** @deprecated 推荐改用 tokens.tabColor。 */
    tabColor?: string;
    /** @deprecated 推荐改用 tokens.tabHoverColor。 */
    tabHoverColor?: string;
    /** @deprecated 推荐改用 tokens.tabHoverBackground。 */
    tabHoverBackground?: string;
    /** @deprecated 推荐改用 tokens.tabActiveColor。 */
    tabActiveColor?: string;
    /** @deprecated 推荐改用 tokens.tabActiveBackground。 */
    tabActiveBackground?: string;
    /** @deprecated 推荐改用 tokens.activeIndicatorColor。 */
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
    onItemMouseDown?: () => void;
    tabClassName?: string;
    activeTabClassName?: string;
    tabStyle?: React.CSSProperties;
    activeTabStyle?: React.CSSProperties;
    renderCloseIcon?: (key: string) => React.ReactNode;
    onClick: (key: string, event: React.MouseEvent<HTMLDivElement>) => void;
    onClose: (e: React.MouseEvent, key: string) => void;
}

const TabItemView = memo<TabItemViewProps>(({
    item,
    isActive,
    closable,
    draggable,
    stopMouseDown,
    onItemMouseDown,
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
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 2 : undefined,
        cursor: isDragging ? 'grabbing' : undefined,
        ...tabStyle,
        ...(isActive ? activeTabStyle : undefined),
    };

    // 将 dnd-kit 的 onMouseDown 与 Tauri stopPropagation 合并
    // dnd-kit 必须先执行（注册后续 mousemove/mouseup 监听），再阻断冒泡
    const {onMouseDown: dndMouseDown, ...restListeners} = listeners ?? {};
    const handlePointerDown = (e: React.PointerEvent) => {
        if (stopMouseDown) e.stopPropagation();
    };
    const handleMouseDown = (e: React.MouseEvent) => {
        onItemMouseDown?.();
        dndMouseDown?.(e as any);
        if (stopMouseDown) e.stopPropagation();
    };

    return (
        <div
            ref={setNodeRef}
            className={classes}
            style={mergedStyle}
            onClick={(event) => !item.disabled && onClick(item.key, event)}
            onPointerDown={handlePointerDown}
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
    selectedKey,
    activeKey,
    variant = 'attached',
    radius = 'md',
    tabRadius,
    closable = false,
    addable = false,
    draggable = false,
    minTabWidth = '80px',
    maxTabWidth = '200px',
    tabSizing,
    dragGutter,
    fillWidth,
    onSelectedKeyChange,
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
    tokens,
    background,
    tabColor,
    tabHoverColor,
    tabHoverBackground,
    tabActiveColor,
    tabActiveBackground,
    activeIndicatorColor,
    ...props
}) => {
    const currentSelectedKey = selectedKey ?? activeKey ?? '';
    // tabSizing 优先；未传时回落到旧的布尔语义，保持 fillWidth 未传 = fill 的历史默认
    const resolvedSizing: TabBarSizing = tabSizing ?? (fillWidth === false ? 'fit' : 'fill');

    const mergedStyle: React.CSSProperties = {
        ...buildCssVars({
            '--tab-bar-bg': tokens?.background ?? background,
            '--tab-color': tokens?.tabColor ?? tabColor,
            '--tab-hover-color': tokens?.tabHoverColor ?? tabHoverColor,
            '--tab-hover-bg': tokens?.tabHoverBackground ?? tabHoverBackground,
            '--tab-active-color': tokens?.tabActiveColor ?? tabActiveColor,
            '--tab-active-bg': tokens?.tabActiveBackground ?? tabActiveBackground,
            '--tab-active-indicator': tokens?.activeIndicatorColor ?? activeIndicatorColor,
        }),
        ...style,
    };
    const navRef = useRef<HTMLDivElement>(null);
    const dragRegionRestoreFrameRef = useRef<number | null>(null);
    const boundModifier = useContainerBoundModifier(navRef);
    const [isPressingTab, setIsPressingTab] = useState(false);
    const [isSorting, setIsSorting] = useState(false);
    const [isRefreshingDragRegion, setIsRefreshingDragRegion] = useState(false);
    const [pendingItems, setPendingItems] = useState<TabItem[] | null>(null);
    const displayItems = pendingItems ?? items;
    const warnedLegacyActiveKeyRef = useRef(false);
    const warnedLegacyOnChangeRef = useRef(false);

    useEffect(() => {
        if (activeKey === undefined || warnedLegacyActiveKeyRef.current || !isDevelopmentRuntime()) return;
        warnedLegacyActiveKeyRef.current = true;
        console.warn('[flowcloudai-ui][TabBar] activeKey 已保留兼容，建议改用 selectedKey。');
    }, [activeKey]);

    useEffect(() => {
        if (!onChange || warnedLegacyOnChangeRef.current || !isDevelopmentRuntime()) return;
        warnedLegacyOnChangeRef.current = true;
        console.warn('[flowcloudai-ui][TabBar] onChange(activeKey) 已保留兼容，建议改用 onSelectedKeyChange。');
    }, [onChange]);

    useDeprecatedPropWarning('TabBar', {
        background,
        tabColor,
        tabHoverColor,
        tabHoverBackground,
        tabActiveColor,
        tabActiveBackground,
        activeIndicatorColor,
    });

    useDeprecatedPropWarning('TabBar', {fillWidth}, '已保留兼容，推荐改用 tabSizing。');

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

    const clearTabPressState = useCallback(() => {
        setIsPressingTab(false);
    }, []);

    useEffect(() => {
        window.addEventListener('mouseup', clearTabPressState);
        window.addEventListener('pointerup', clearTabPressState);
        window.addEventListener('pointercancel', clearTabPressState);
        window.addEventListener('blur', clearTabPressState);
        return () => {
            window.removeEventListener('mouseup', clearTabPressState);
            window.removeEventListener('pointerup', clearTabPressState);
            window.removeEventListener('pointercancel', clearTabPressState);
            window.removeEventListener('blur', clearTabPressState);
        };
    }, [clearTabPressState]);

    useEffect(() => {
        if (!pendingItems) return;
        if (isSameItemOrder(items, pendingItems)) {
            setPendingItems(null);
            return;
        }
        const timer = window.setTimeout(() => {
            setPendingItems(null);
        }, 200);
        return () => window.clearTimeout(timer);
    }, [items, pendingItems]);

    const refreshDragRegion = useCallback(() => {
        if (!tauriDragRegion) return;
        if (dragRegionRestoreFrameRef.current !== null) {
            cancelAnimationFrame(dragRegionRestoreFrameRef.current);
            dragRegionRestoreFrameRef.current = null;
        }
        setIsRefreshingDragRegion(true);
        dragRegionRestoreFrameRef.current = requestAnimationFrame(() => {
            dragRegionRestoreFrameRef.current = requestAnimationFrame(() => {
                setIsRefreshingDragRegion(false);
                dragRegionRestoreFrameRef.current = null;
            });
        });
    }, [tauriDragRegion]);

    useEffect(() => () => {
        if (dragRegionRestoreFrameRef.current !== null) {
            cancelAnimationFrame(dragRegionRestoreFrameRef.current);
        }
    }, []);

    // 稳定的 handler ref — 调用者无需将变更/关闭回调包裹在 useCallback 中。
    // 即使调用者传入匿名函数，TabItemView 的 memo 仍然有效。
    const onSelectedKeyChangeRef = useRef(onSelectedKeyChange); onSelectedKeyChangeRef.current = onSelectedKeyChange;
    const onChangeRef = useRef(onChange); onChangeRef.current = onChange;
    const onCloseRef  = useRef(onClose);  onCloseRef.current  = onClose;

    const emitSelectedKeyChange = useCallback((key: string, meta: TabBarSelectedKeyChangeMeta) => {
        if (onSelectedKeyChangeRef.current) {
            onSelectedKeyChangeRef.current(key, meta);
        } else {
            onChangeRef.current?.(key);
        }
    }, []);

    const handleClick = useCallback(
        (key: string, event: React.MouseEvent<HTMLDivElement>) => {
            emitSelectedKeyChange(key, {source: 'click', event});
        },
        [emitSelectedKeyChange],
    );

    const handleItemMouseDown = useCallback(() => {
        if (!tauriDragRegion) return;
        setIsPressingTab(true);
    }, [tauriDragRegion]);

    const handleClose = useCallback((e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        onCloseRef.current?.(key);
    }, []);

    // MouseSensor：Tauri/WebView2 下 pointerdown 被 Windows 吃掉，必须用 mousedown 驱动的 MouseSensor
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {distance: 2},
        }),
    );

    const handleDragStart = useCallback((event: {active: {id: React.Key}}) => {
        setIsSorting(true);
        emitSelectedKeyChange(String(event.active.id), {source: 'drag', event});
        if (tauriDragRegion) {
            setIsPressingTab(true);
            setIsRefreshingDragRegion(true);
        }
    }, [emitSelectedKeyChange, tauriDragRegion]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setIsSorting(false);
        clearTabPressState();
        refreshDragRegion();
        const {active, over} = event;
        if (!over || active.id === over.id || !onReorder) return;
        const fromIndex = displayItems.findIndex((i) => i.key === active.id);
        const toIndex = displayItems.findIndex((i) => i.key === over.id);
        if (fromIndex === -1 || toIndex === -1) return;
        const reorderedItems = arrayMove(displayItems, fromIndex, toIndex);
        setPendingItems(reorderedItems);
        onReorder(reorderedItems);
    }, [clearTabPressState, displayItems, onReorder, refreshDragRegion]);

    const handleDragCancel = useCallback(() => {
        setIsSorting(false);
        clearTabPressState();
        refreshDragRegion();
    }, [clearTabPressState, refreshDragRegion]);

    /* ---- 渲染 ---- */

    const rootClasses = [
        'fc-tab-bar',
        `fc-tab-bar--${variant}`,
        `fc-tab-bar--radius-${radius}`,
        `fc-tab-bar--${resolvedSizing}`,
        tabRadius && `fc-tab-bar--tab-radius-${tabRadius}`,
        className,
    ].filter(Boolean).join(' ');

    // Tab 宽度上下限与右侧预留空白通过 CSS 变量传入，宽度策略由根节点 class 控制
    const navWrapStyle = {
        '--tab-min-width': minTabWidth,
        '--tab-max-width': maxTabWidth,
        ...(dragGutter ? {'--tab-bar-drag-gutter': dragGutter} : null),
    } as React.CSSProperties;

    const enableDragRegion = tauriDragRegion && !isPressingTab && !isSorting && !isRefreshingDragRegion;
    const dragRegion = enableDragRegion ? {'data-tauri-drag-region': ''} : {};

    const tabItems = useMemo(() => displayItems.map((item) => (
        <TabItemView
            key={item.key}
            item={item}
            isActive={currentSelectedKey === item.key}
            closable={closable}
            draggable={draggable}
            stopMouseDown={tauriDragRegion}
            onItemMouseDown={handleItemMouseDown}
            tabClassName={tabClassName}
            activeTabClassName={activeTabClassName}
            tabStyle={tabStyle}
            activeTabStyle={activeTabStyle}
            renderCloseIcon={renderCloseIcon}
            onClick={handleClick}
            onClose={handleClose}
        />
    )), [
        displayItems, currentSelectedKey, closable, draggable, tauriDragRegion,
        handleItemMouseDown, tabClassName, activeTabClassName, tabStyle, activeTabStyle,
        renderCloseIcon, handleClick, handleClose,
    ]);

    return (
        <div {...props} className={rootClasses} style={mergedStyle} role="tablist" {...dragRegion}>
            <div className="fc-tab-bar__nav-outer" {...dragRegion}>
                <div className="fc-tab-bar__nav-wrap" ref={navRef} style={navWrapStyle}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[boundModifier]}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <SortableContext
                            items={displayItems.map((i) => i.key)}
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
