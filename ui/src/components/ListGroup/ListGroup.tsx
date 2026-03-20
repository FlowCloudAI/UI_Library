import React from 'react';
import './ListGroup.css';

export interface ListGroupItemProps {
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
}

// 单个列表项 - 命名导出
export const ListGroupItem: React.FC<ListGroupItemProps> = ({
                                                                children,
                                                                active = false,
                                                                disabled = false,
                                                                onClick,
                                                                className = '',
                                                            }) => {
    return (
        <li
            className={`ui-list-item ${active ? 'ui-list-item-active' : ''} ${disabled ? 'ui-list-item-disabled' : ''} ${className}`}
            onClick={!disabled ? onClick : undefined}
            role="button"
            tabIndex={disabled ? -1 : 0}
        >
            {children}
        </li>
    );
};

// 列表容器 - 命名导出
export interface ListGroupProps {
    children: React.ReactNode;
    className?: string;
}

export const ListGroup: React.FC<ListGroupProps> = ({ children, className = '' }) => {
    return (
        <ul className={`ui-list-group ${className}`}>
            {children}
        </ul>
    );
};