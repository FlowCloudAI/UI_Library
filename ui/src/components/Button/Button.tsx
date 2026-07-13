import './Button.css'
import * as React from "react";
import type {FcRadius, FcSize} from '../../types/common'
import {buildCssVars} from '../../utils/cssVars'
import {useDeprecatedPropWarning} from '../../hooks/useDeprecatedPropWarning'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
export type ButtonSize = FcSize;
export type ButtonRadius = FcRadius;

export interface ButtonTokens {
    background?: string;
    hoverBackground?: string;
    activeBackground?: string;
    color?: string;
    hoverColor?: string;
    activeColor?: string;
    borderColor?: string;
    hoverBorderColor?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<ButtonTokens>;

    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */

    /** @deprecated 推荐改用 tokens.background。 */
    background?: string;
    /** @deprecated 推荐改用 tokens.hoverBackground。 */
    hoverBackground?: string;
    /** @deprecated 推荐改用 tokens.activeBackground。 */
    activeBackground?: string;
    /** @deprecated 推荐改用 tokens.color。 */
    color?: string;
    /** @deprecated 推荐改用 tokens.hoverColor。 */
    hoverColor?: string;
    /** @deprecated 推荐改用 tokens.activeColor。 */
    activeColor?: string;
    /** @deprecated 推荐改用 tokens.borderColor。 */
    borderColor?: string;
    /** @deprecated 推荐改用 tokens.hoverBorderColor。 */
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
                           tokens,
                           className,
                           style,
                           children,
                           ...props
                       }: ButtonProps) {

    useDeprecatedPropWarning('Button', {
        background,
        hoverBackground,
        activeBackground,
        color,
        hoverColor,
        activeColor,
        borderColor,
        hoverBorderColor,
    });

    // 将颜色 props 映射为 CSS 变量（undefined 自动过滤，保留默认样式）
    const mergedStyle: React.CSSProperties = {
        ...buildCssVars({
            '--btn-bg': tokens?.background ?? background,
            '--btn-bg-hover': tokens?.hoverBackground ?? hoverBackground,
            '--btn-bg-active': tokens?.activeBackground ?? activeBackground,
            '--btn-color': tokens?.color ?? color,
            '--btn-color-hover': tokens?.hoverColor ?? hoverColor,
            '--btn-color-active': tokens?.activeColor ?? activeColor,
            '--btn-border': tokens?.borderColor ?? borderColor,
            '--btn-border-hover': tokens?.hoverBorderColor ?? hoverBorderColor,
        }),
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
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
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
export type ButtonToolbarAlign = 'left' | 'center' | 'right' | 'between';

export interface ButtonToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    align?: ButtonToolbarAlign;
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
