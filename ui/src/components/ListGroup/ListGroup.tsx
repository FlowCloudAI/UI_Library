// ListGroup.tsx
import './ListGroup.css';
import * as React from "react";

interface ListGroupItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
    active?: boolean;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
}

export function ListGroupItem({
                                  active = false,
                                  disabled = false,
                                  onClick,
                                  className,
                                  children,
                                  ...props
                              }: ListGroupItemProps) {
    const handleClick = (e: React.MouseEvent<HTMLLIElement>) => {
        if (disabled) return;
        onClick?.(e);
    };

    const classNames = [
        'fc-list-group-item',
        active && 'fc-list-group-item--active',
        disabled && 'fc-list-group-item--disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <li
            className={classNames}
            onClick={handleClick}
            {...props}
        >
            {children}
        </li>
    );
}

interface ListGroupProps extends React.HTMLAttributes<HTMLUListElement> {
    bordered?: boolean;
    flush?: boolean;
}

export function ListGroup({
                              bordered = true,
                              flush = false,
                              className,
                              children,
                              ...props
                          }: ListGroupProps) {
    const classNames = [
        'fc-list-group',
        bordered && 'fc-list-group--bordered',
        flush && 'fc-list-group--flush',
        className
    ].filter(Boolean).join(' ');

    return (
        <ul className={classNames} {...props}>
            {children}
        </ul>
    );
}