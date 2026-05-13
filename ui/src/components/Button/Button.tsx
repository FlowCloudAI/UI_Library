import './Button.css'
import * as React from "react";

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** 按钮变体 */
    variant?: ButtonVariant;
    /** 尺寸 */
    size?: ButtonSize;
    /** 圆角大小，不传则跟随 size 默认值 */
    radius?: ButtonRadius;
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

    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */

    /** 默认背景色 */
    background?: string;
    /** hover 背景色 */
    hoverBackground?: string;
    /** active 背景色 */
    activeBackground?: string;
    /** 默认文字色 */
    color?: string;
    /** hover 文字色 */
    hoverColor?: string;
    /** active 文字色 */
    activeColor?: string;
    /** 默认边框色 */
    borderColor?: string;
    /** hover 边框色 */
    hoverBorderColor?: string;
}

export function Button({
                           variant = 'primary',
                           size = 'md',
                           radius,
                           disabled = false,
                           loading = false,
                           block = false,
                           circle = false,
                           iconOnly = false,
                           type = 'button',
                           iconLeft,
                           iconRight,
                           background,
                           hoverBackground,
                           activeBackground,
                           color,
                           hoverColor,
                           activeColor,
                           borderColor,
                           hoverBorderColor,
                           className,
                           style,
                           children,
                           ...props
                       }: ButtonProps) {

    // 将颜色 props 映射到 CSS 变量，undefined 的不会出现在 style 中
    const colorVars: Record<string, string | undefined> = {
        '--btn-bg': background,
        '--btn-bg-hover': hoverBackground,
        '--btn-bg-active': activeBackground,
        '--btn-color': color,
        '--btn-color-hover': hoverColor,
        '--btn-color-active': activeColor,
        '--btn-border': borderColor,
        '--btn-border-hover': hoverBorderColor,
    };

    // 过滤掉 undefined，只保留用户实际传入的
    const overrideStyle: React.CSSProperties = {};
    for (const [key, value] of Object.entries(colorVars)) {
        if (value !== undefined) {
            (overrideStyle as any)[key] = value;
        }
    }

    const mergedStyle: React.CSSProperties = {
        ...overrideStyle,
        ...style,
    };

    const classNames = [
        'fc-btn',
        `fc-btn--${variant}`,
        `fc-btn--${size}`,
        radius && `fc-btn--radius-${radius}`,
        block && 'fc-btn--block',
        circle && 'fc-btn--circle',
        iconOnly && 'fc-btn--icon-only',
        loading && 'is-loading',
        disabled && 'is-disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={classNames}
            disabled={disabled || loading}
            style={mergedStyle}
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
