import React, { ReactNode } from 'react';
import './ListGroup.css';

export interface ListGroupItemProps {
    children: ReactNode;
    subtitle?: ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    className?: string; // 允许额外类名
}

// 列表项组件
export const ListGroupItem: React.FC<ListGroupItemProps> = ({
                                                                children,
                                                                subtitle,
                                                                active = false,
                                                                disabled = false,
                                                                onClick,
                                                                className = '',
                                                            }) => {
    // 动态计算类名，但不涉及任何样式逻辑
    const itemClassNames = [
        'fc-list-item',
        active && 'fc-list-item-active',
        disabled && 'fc-list-item-disabled',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={itemClassNames}
            onClick={!disabled && onClick ? onClick : undefined}
            // ⚠️ 重要：这里绝对不要加 style={{ backgroundColor: ... }}
            // 让 CSS 完全控制颜色
            role={onClick && !disabled ? 'button' : undefined}
            tabIndex={onClick && !disabled ? 0 : -1}
            aria-disabled={disabled}
        >
            <div className="fc-list-item-content">
                <div className="fc-list-item-title">{children}</div>
                {subtitle && (
                    <div className="fc-list-item-subtitle">{subtitle}</div>
                )}
            </div>

            {/* 如果需要右侧箭头或图标，可以在这里添加 */}
            {onClick && !disabled && (
                <div className="fc-list-item-action">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            )}
        </div>
    );
};

export interface ListGroupProps {
    children: ReactNode;
    className?: string;
}

// 列表组容器
export const ListGroup: React.FC<ListGroupProps> = ({ children, className = '' }) => {
    return (
        <div
            className={`fc-list-group ${className}`}
            // ⚠️ 重要：这里也绝对不要加 style={{ backgroundColor: '#fff' }}
        >
            {children}
        </div>
    );
};

export default ListGroup;