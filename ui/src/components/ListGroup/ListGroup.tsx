// ListGroup.tsx - 优化版
import './ListGroup.css';
import * as React from 'react';
import { forwardRef, useMemo, useCallback } from 'react';

// ============================================
// 类型定义
// ============================================
export interface ListGroupItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
    active?: boolean;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
}

export interface ListGroupProps extends React.HTMLAttributes<HTMLUListElement> {
    bordered?: boolean;
    flush?: boolean;
}

// ============================================
// 工具函数
// ============================================
const combineClassNames = (...classNames: (string | boolean | undefined)[]): string => {
    return classNames.filter(Boolean).join(' ');
};

// ============================================
// ListGroupItem 组件
// ============================================
export const ListGroupItem = forwardRef<HTMLLIElement, ListGroupItemProps>(
    ({
         active = false,
         disabled = false,
         onClick,
         className,
         children,
         ...props
     }, ref) => {
        const handleClick = useCallback((e: React.MouseEvent<HTMLLIElement>) => {
            if (disabled) return;
            onClick?.(e);
        }, [disabled, onClick]);

        const classNames = useMemo(() => {
            return combineClassNames(
                'fc-list-group-item',
                active && 'fc-list-group-item--active',
                disabled && 'fc-list-group-item--disabled',
                className
            );
        }, [active, disabled, className]);

        return (
            <li
                ref={ref}
                className={classNames}
                onClick={handleClick}
                aria-disabled={disabled}
                aria-selected={active}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick && !disabled ? 0 : undefined}
                {...props}
            >
                {children}
            </li>
        );
    }
);

ListGroupItem.displayName = 'ListGroupItem';

// ============================================
// ListGroup 组件
// ============================================
export const ListGroup = forwardRef<HTMLUListElement, ListGroupProps>(
    ({
         bordered = true,
         flush = false,
         className,
         children,
         ...props
     }, ref) => {
        const classNames = useMemo(() => {
            return combineClassNames(
                'fc-list-group',
                bordered && 'fc-list-group--bordered',
                flush && 'fc-list-group--flush',
                className
            );
        }, [bordered, flush, className]);

        return (
            <ul
                ref={ref}
                className={classNames}
                role="list"
                {...props}
            >
                {children}
            </ul>
        );
    }
);

ListGroup.displayName = 'ListGroup';

// ============================================
// 默认导出
// ============================================
export default { ListGroup, ListGroupItem };