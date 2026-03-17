// SideBar.tsx
import './SideBar.css';
import * as React from 'react';

interface MenuItem {
    key: string;
    label: string;
    icon?: React.ReactNode;
    children?: MenuItem[];
    disabled?: boolean;
    href?: string;
}

interface SideBarProps {
    items: MenuItem[];
    selectedKeys?: string[];
    defaultSelectedKeys?: string[];
    openKeys?: string[];
    defaultOpenKeys?: string[];
    onSelect?: (keys: string[]) => void;
    onOpenChange?: (keys: string[]) => void;
    collapsed?: boolean;
    defaultCollapsed?: boolean;
    onCollapse?: (collapsed: boolean) => void;
    className?: string;
    width?: number;
    collapsedWidth?: number;
}

export function SideBar({
                            items,
                            selectedKeys: controlledSelected,
                            defaultSelectedKeys = [],
                            openKeys: controlledOpen,
                            defaultOpenKeys = [],
                            onSelect,
                            onOpenChange,
                            collapsed: controlledCollapsed,
                            defaultCollapsed = false,
                            onCollapse,
                            className,
                            width = 240,
                            collapsedWidth = 64,
                        }: SideBarProps) {
    const [internalSelected, setInternalSelected] = React.useState(defaultSelectedKeys);
    const [internalOpen, setInternalOpen] = React.useState(defaultOpenKeys);
    const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);

    const currentSelected = controlledSelected ?? internalSelected;
    const currentOpen = controlledOpen ?? internalOpen;
    const currentCollapsed = controlledCollapsed ?? internalCollapsed;

    const updateOpen = React.useCallback((next: string[]) => {
        if (controlledOpen === undefined) setInternalOpen(next);
        onOpenChange?.(next);
    }, [controlledOpen, onOpenChange]);

    const toggleOpen = React.useCallback((key: string) => {
        const next = currentOpen.includes(key)
            ? currentOpen.filter(k => k !== key)
            : [...currentOpen, key];
        updateOpen(next);
    }, [currentOpen, updateOpen]);

    const handleSelect = React.useCallback((key: string, item: MenuItem) => {
        if (item.disabled) return;

        const next = [key];
        if (controlledSelected === undefined) setInternalSelected(next);
        onSelect?.(next);
    }, [controlledSelected, onSelect]);

    const toggleCollapse = React.useCallback(() => {
        const next = !currentCollapsed;
        if (controlledCollapsed === undefined) setInternalCollapsed(next);
        onCollapse?.(next);
    }, [currentCollapsed, controlledCollapsed, onCollapse]);

    const handleItemClick = React.useCallback((item: MenuItem) => {
        if (item.children?.length) {
            toggleOpen(item.key);
        } else {
            handleSelect(item.key, item);
        }
    }, [toggleOpen, handleSelect]);

    const handleItemKeyDown = React.useCallback((e: React.KeyboardEvent, item: MenuItem) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleItemClick(item);
        }
    }, [handleItemClick]);

    const renderMenuItem = (item: MenuItem, level = 0) => {
        const hasChildren = (item.children?.length ?? 0) > 0;
        const isOpen = currentOpen.includes(item.key);
        const isSelected = currentSelected.includes(item.key);

        const itemClassName = [
            'fc-sidebar__item',
            `fc-sidebar__item--level-${level}`,
            hasChildren && 'fc-sidebar__item--parent',
            isOpen && 'fc-sidebar__item--open',
            isSelected && 'fc-sidebar__item--selected',
            item.disabled && 'fc-sidebar__item--disabled',
        ].filter(Boolean).join(' ');

        const Tag = item.href ? 'a' : 'div';

        const interactiveProps = {
            role: hasChildren ? 'treeitem' as const : 'menuitem' as const,
            tabIndex: item.disabled ? -1 : 0,
            'aria-selected': isSelected || undefined,
            'aria-expanded': hasChildren ? isOpen : undefined,
            'aria-disabled': item.disabled || undefined,
            onClick: () => handleItemClick(item),
            onKeyDown: (e: React.KeyboardEvent) => handleItemKeyDown(e, item),
            ...(item.href ? { href: item.href } : {}),
        };

        return (
            <div key={item.key} className="fc-sidebar__item-wrapper">
                <Tag className={itemClassName} {...interactiveProps}>
                    {item.icon && (
                        <span className="fc-sidebar__icon" aria-hidden="true">{item.icon}</span>
                    )}
                    <span className="fc-sidebar__label">{item.label}</span>
                    {hasChildren && (
                        <span className="fc-sidebar__arrow" aria-hidden="true">▶</span>
                    )}
                </Tag>

                {hasChildren && (
                    <div
                        className={[
                            'fc-sidebar__submenu',
                            isOpen && 'fc-sidebar__submenu--open',
                        ].filter(Boolean).join(' ')}
                        role="group"
                    >
                        <div className="fc-sidebar__submenu-inner">
                            {item.children!.map(child => renderMenuItem(child, level + 1))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const sidebarStyle = {
        '--sidebar-width': `${currentCollapsed ? collapsedWidth : width}px`,
        '--sidebar-collapsed-width': `${collapsedWidth}px`,
    } as React.CSSProperties;

    return (
        <aside
            className={[
                'fc-sidebar',
                currentCollapsed && 'fc-sidebar--collapsed',
                className,
            ].filter(Boolean).join(' ')}
            style={sidebarStyle}
            role="navigation"
            aria-label="Sidebar"
        >
            <div className="fc-sidebar__header">
                <button
                    className="fc-sidebar__collapse-btn"
                    onClick={toggleCollapse}
                    aria-label={currentCollapsed ? '展开侧栏' : '收起侧栏'}
                    aria-expanded={!currentCollapsed}
                >
                    {currentCollapsed ? '→' : '←'}
                </button>
            </div>

            <nav className="fc-sidebar__menu" role="tree">
                {items.map(item => renderMenuItem(item))}
            </nav>
        </aside>
    );
}