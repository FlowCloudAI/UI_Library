import './CheckButton.css'
import * as React from 'react'
import type {FcChangeHandler, FcChangeMeta, FcRadius, FcSize} from '../../types/common'
import {isDevelopmentRuntime} from '../../utils/runtime'
import {buildCssVars} from '../../utils/cssVars'
import {useDeprecatedPropWarning} from '../../hooks/useDeprecatedPropWarning'

export type CheckButtonRadius = FcRadius
export type CheckButtonSize = Extract<FcSize, 'sm' | 'md' | 'lg'>
export type CheckButtonChangeMeta = FcChangeMeta<
    React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
>
export type CheckButtonChangeHandler = FcChangeHandler<boolean, CheckButtonChangeMeta>

export interface CheckButtonTokens {
    trackBackground?: string
    checkedTrackBackground?: string
    thumbBackground?: string
    thumbDotColor?: string
    labelColor?: string
}

export interface CheckButtonBaseProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    onCheckedChange?: CheckButtonChangeHandler
    /** @deprecated 推荐改用 onCheckedChange。 */
    onChange?: (checked: boolean) => void
    disabled?: boolean
    size?: CheckButtonSize
    /** 轨道圆角，默认 full（胶囊形） */
    radius?: CheckButtonRadius
    labelLeft?: string
    labelRight?: string
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<CheckButtonTokens>

    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */

    /** @deprecated 推荐改用 tokens.trackBackground。 */
    trackBackground?: string
    /** @deprecated 推荐改用 tokens.checkedTrackBackground。 */
    checkedTrackBackground?: string
    /** @deprecated 推荐改用 tokens.thumbBackground。 */
    thumbBackground?: string
    /** @deprecated 推荐改用 tokens.thumbDotColor。 */
    thumbDotColor?: string
    /** @deprecated 推荐改用 tokens.labelColor。 */
    labelColor?: string
}

export interface ControlledCheckButtonProps extends CheckButtonBaseProps {
    checked: boolean
    defaultChecked?: never
}

export interface UncontrolledCheckButtonProps extends CheckButtonBaseProps {
    checked?: never
    defaultChecked?: boolean
}

export type CheckButtonProps = ControlledCheckButtonProps | UncontrolledCheckButtonProps

export function CheckButton({
                                checked: controlledChecked,
                                defaultChecked = false,
                                onCheckedChange,
                                onChange,
                                disabled = false,
                                size = 'md',
                                radius,
                                labelLeft,
                                labelRight,
                                trackBackground,
                                checkedTrackBackground,
                                thumbBackground,
                                thumbDotColor,
                                labelColor,
                                className = '',
                                style,
                                tokens,
                                tabIndex,
                                onClick,
                                onKeyDown,
                                ...props
                            }: CheckButtonProps) {
    const isControlled = controlledChecked !== undefined
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked)
    const checked = isControlled ? controlledChecked : internalChecked

    React.useEffect(() => {
        if (!onChange || !isDevelopmentRuntime()) return
        console.warn('[flowcloudai-ui][CheckButton] onChange 已废弃，推荐改用 onCheckedChange。')
    }, [onChange])

    useDeprecatedPropWarning('CheckButton', {
        trackBackground,
        checkedTrackBackground,
        thumbBackground,
        thumbDotColor,
        labelColor,
    })

    const toggle = (
        source: CheckButtonChangeMeta['source'],
        event: CheckButtonChangeMeta['event'],
    ) => {
        if (disabled) return
        const next = !checked
        if (!isControlled) setInternalChecked(next)
        if (onCheckedChange) {
            onCheckedChange(next, {source, event})
        } else {
            onChange?.(next)
        }
    }

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        toggle('click', e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e)
        if (e.defaultPrevented) return
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle('keyboard', e)
        }
    }

    const mergedStyle: React.CSSProperties = {
        ...buildCssVars({
            '--check-track-bg': tokens?.trackBackground ?? trackBackground,
            '--check-track-bg-checked': tokens?.checkedTrackBackground ?? checkedTrackBackground,
            '--check-thumb-bg': tokens?.thumbBackground ?? thumbBackground,
            '--check-thumb-dot-color': tokens?.thumbDotColor ?? thumbDotColor,
            '--check-label-color': tokens?.labelColor ?? labelColor,
        }),
        ...style,
    }

    const cls = [
        'fc-check',
        `fc-check--${size}`,
        radius && `fc-check--radius-${radius}`,
        checked   && 'fc-check--checked',
        disabled  && 'fc-check--disabled',
        className,
    ].filter(Boolean).join(' ')

    return (
        <div
            {...props}
            className={cls}
            style={mergedStyle}
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled || undefined}
            tabIndex={tabIndex ?? (disabled ? -1 : 0)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
        >
            {labelLeft && <span className="fc-check__label">{labelLeft}</span>}

            <span className="fc-check__track">
                <span className="fc-check__thumb">
                    <span className="fc-check__thumb-inner" />
                </span>
            </span>

            {labelRight && <span className="fc-check__label">{labelRight}</span>}
        </div>
    )
}
