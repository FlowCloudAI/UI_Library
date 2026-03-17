import './Button.css'
import * as React from "react";

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** 按钮变体 */
    variant?: ButtonVariant;
    /** 尺寸 */
    size?: ButtonSize;
    /** 是否禁用 */
    disabled?: boolean;
    /** 加载状态 */
    loading?: boolean;
    /** 块级按钮（宽度100%） */
    block?: boolean;
    /** 圆形按钮 */
    circle?: boolean;
    /** 仅图标模式 */
    iconOnly?: boolean;
    /** 左侧图标 */
    iconLeft?: React.ReactNode;
    /** 右侧图标 */
    iconRight?: React.ReactNode;
}

export function Button({
                           variant = 'primary',
                           size = 'md',
                           disabled = false,
                           loading = false,
                           block = false,
                           circle = false,
                           iconOnly = false,
                           iconLeft,
                           iconRight,
                           className,
                           children,
                           ...props
                       }: ButtonProps) {

    // 构建类名
    const classNames = [
        'fc-btn',
        `fc-btn--${variant}`,
        `fc-btn--${size}`,
        block && 'fc-btn--block',
        circle && 'fc-btn--circle',
        iconOnly && 'fc-btn--icon-only',
        loading && 'is-loading',
        disabled && 'is-disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classNames}
            disabled={disabled || loading}
            {...props}
        >
            {iconLeft && !loading && (
                <span className="fc-btn__icon fc-btn__icon--left">{iconLeft}</span>
            )}
            {children}
            {iconRight && !loading && (
                <span className="fc-btn__icon fc-btn__icon--right">{iconRight}</span>
            )}
        </button>
    );
}

// 按钮组组件
interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function ButtonGroup({children, className, ...props}: ButtonGroupProps) {
    return (
        <div className={`fc-btn-group ${className ?? ''}`} {...props}>
            {children}
        </div>
    );
}

// 按钮工具栏组件
interface ButtonToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right' | 'between';
}

export function ButtonToolbar({
                                  children,
                                  align = 'left',
                                  className,
                                  ...props
                              }: ButtonToolbarProps) {
    const alignClass = {
        left: '',
        center: 'fc-btn-toolbar--center',
        right: 'fc-btn-toolbar--right',
        between: 'fc-btn-toolbar--between'
    }[align];

    return (
        <div className={`fc-btn-toolbar ${alignClass} ${className ?? ''}`} {...props}>
            {children}
        </div>
    );
}