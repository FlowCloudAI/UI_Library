// src/components/SideBar/SideBar.tsx
import './SideBar.css';
import React, { memo, useCallback } from 'react';

/* ========== 类型定义 ========== */

export interface SideBarItem {
    /** 唯一标识 */
    key: string;
    /** 显示文字（非折叠时显示，折叠时隐藏） */
    label: string;
    /** 图标，推荐传入 SVG 元素或 ReactNode */
    icon?: React.ReactNode;
    /** 是否禁用 */
    disabled?: boolean;
    /** 链接地址，有值时渲染为 <a> */
    href?: string;
}

export type SideBarPlacement = 'left' | 'right';
export type SideBarAnchorState = 'collapse' | 'normal';

export interface SideBarProps {
    /** 菜单项列表（受控） */
    items: SideBarItem[];
    /** 底部固定菜单项（如设置、退出），始终显示在侧边栏底部 */
    bottomItems?: SideBarItem[];
    /** 当前选中的 key（受控） */
    selectedKey: string;
    /** 是否折叠（受控） */
    collapsed: boolean;
    /** 锚定侧边栏状态；设置后将隐藏展开/折叠按钮并固定状态 */
    anchorState?: SideBarAnchorState;

    /** 展开时宽度，默认 240 */
    width?: number;
    /** 折叠时宽度，默认 64 */
    collapsedWidth?: number;
    /** 停靠位置，默认 left */
    placement?: SideBarPlacement;

    /* ---- 回调 ---- */

    /** 选中项变更 */
    onSelect: (key: string) => void;
    /** 折叠状态变更 */
    onCollapse: (collapsed: boolean) => void;

    /* ---- 样式定制 ---- */

    /**
     * 可覆盖的 CSS Variables（在 style 中设置）：
     * --sidebar-item-color          默认文字色
     * --sidebar-item-bg             默认背景色
     * --sidebar-item-hover-color    hover 文字色
     * --sidebar-item-hover-bg       hover 背景色
     * --sidebar-item-selected-color 选中文字色
     * --sidebar-item-selected-bg    选中背景色
     */
    className?: string;
    style?: React.CSSProperties;
}

/* ========== 子组件：单个菜单项 ========== */

interface SideBarItemViewProps {
    item: SideBarItem;
    isSelected: boolean;
    onClick: (key: string) => void;
}

const SideBarItemView = memo<SideBarItemViewProps>(({ item, isSelected, onClick }) => {
    const classes = [
        'fc-sidebar__item',
        isSelected && 'fc-sidebar__item--selected',
        item.disabled && 'fc-sidebar__item--disabled',
    ].filter(Boolean).join(' ');

    const Tag = item.href ? 'a' : 'div';
    const linkProps = item.href ? { href: item.href } : {};

    return (
        <Tag
            className={classes}
            onClick={() => !item.disabled && onClick(item.key)}
            {...linkProps}
        >
            {item.icon && (
                <span className="fc-sidebar__icon">{item.icon}</span>
            )}
            <span className="fc-sidebar__label">{item.label}</span>
        </Tag>
    );
});

SideBarItemView.displayName = 'SideBarItemView';

/* ========== 主组件 ========== */

export const SideBar = memo<SideBarProps>(({
                                               items,
                                               bottomItems,
                                               selectedKey,
                                               collapsed,
                                               anchorState,
                                               width = 240,
                                               collapsedWidth = 64,
                                               placement = 'left',
                                               onSelect,
                                               onCollapse,
                                               className = '',
                                               style,
                                           }) => {
    const handleClick = useCallback(
        (key: string) => onSelect(key),
        [onSelect],
    );

    const isAnchored = anchorState !== undefined;
    const isCollapsed = anchorState
        ? anchorState === 'collapse'
        : collapsed;

    const toggleCollapse = useCallback(
        () => onCollapse(!isCollapsed),
        [isCollapsed, onCollapse],
    );

    const rootClasses = [
        'fc-sidebar',
        isCollapsed && 'fc-sidebar--collapsed',
        `fc-sidebar--${placement}`,
        className,
    ].filter(Boolean).join(' ');

    const collapseIconPath = placement === 'right'
        ? (isCollapsed ? 'M10 3L5 8L10 13' : 'M6 3L11 8L6 13')
        : (isCollapsed ? 'M6 3L11 8L6 13' : 'M10 3L5 8L10 13');

    const rootStyle: React.CSSProperties = {
        '--sidebar-width': `${isCollapsed ? collapsedWidth : width}px`,
        '--sidebar-collapsed-width': `${collapsedWidth}px`,
        ...style,
    } as React.CSSProperties;

    return (
        <aside className={rootClasses} style={rootStyle}>
            {!isAnchored && (
                <div className="fc-sidebar__header">
                    <button
                        className="fc-sidebar__collapse-btn"
                        onClick={toggleCollapse}
                    >
                        <svg
                            className="fc-sidebar__collapse-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d={collapseIconPath}
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            )}

            <nav className="fc-sidebar__menu">
                {items.map((item) => (
                    <SideBarItemView
                        key={item.key}
                        item={item}
                        isSelected={selectedKey === item.key}
                        onClick={handleClick}
                    />
                ))}
            </nav>

            {bottomItems && bottomItems.length > 0 && (
                <div className="fc-sidebar__footer">
                    {bottomItems.map((item) => (
                        <SideBarItemView
                            key={item.key}
                            item={item}
                            isSelected={selectedKey === item.key}
                            onClick={handleClick}
                        />
                    ))}
                </div>
            )}
        </aside>
    );
});

SideBar.displayName = 'SideBar';

export default SideBar;
