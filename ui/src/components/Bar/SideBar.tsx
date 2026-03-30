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

export interface SideBarProps {
    /** 菜单项列表（受控） */
    items: SideBarItem[];
    /** 底部固定菜单项（如设置、退出），始终显示在侧边栏底部 */
    bottomItems?: SideBarItem[];
    /** 当前选中的 key（受控） */
    selectedKey: string;
    /** 是否折叠（受控） */
    collapsed: boolean;

    /** 展开时宽度，默认 240 */
    width?: number;
    /** 折叠时宽度，默认 64 */
    collapsedWidth?: number;

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
                                               width = 240,
                                               collapsedWidth = 64,
                                               onSelect,
                                               onCollapse,
                                               className = '',
                                               style,
                                           }) => {
    const handleClick = useCallback(
        (key: string) => onSelect(key),
        [onSelect],
    );

    const toggleCollapse = useCallback(
        () => onCollapse(!collapsed),
        [collapsed, onCollapse],
    );

    const rootClasses = [
        'fc-sidebar',
        collapsed && 'fc-sidebar--collapsed',
        className,
    ].filter(Boolean).join(' ');

    const rootStyle: React.CSSProperties = {
        '--sidebar-width': `${collapsed ? collapsedWidth : width}px`,
        '--sidebar-collapsed-width': `${collapsedWidth}px`,
        ...style,
    } as React.CSSProperties;

    return (
        <aside className={rootClasses} style={rootStyle}>
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
                            d={collapsed
                                ? 'M6 3L11 8L6 13'   /* → 展开箭头 */
                                : 'M10 3L5 8L10 13'   /* ← 收起箭头 */
                            }
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>

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