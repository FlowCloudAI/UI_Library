import './CheckButton.css'
import * as React from 'react'

type CheckButtonRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface CheckButtonBase {
    onChange?: (checked: boolean) => void
    disabled?: boolean
    size?: 'sm' | 'md' | 'lg'
    /** 轨道圆角，默认 full（胶囊形） */
    radius?: CheckButtonRadius
    labelLeft?: string
    labelRight?: string
    className?: string
    style?: React.CSSProperties

    /* ---- 颜色定制（传入即覆盖，不传走默认样式） ---- */

    /** 未选中时轨道背景色 */
    trackBackground?: string
    /** 选中时轨道背景色 */
    checkedTrackBackground?: string
    /** 滑块背景色 */
    thumbBackground?: string
    /** 滑块内部装饰色（选中时） */
    thumbDotColor?: string
    /** 标签文字色 */
    labelColor?: string
}

interface ControlledCheckButton extends CheckButtonBase {
    checked: boolean
    defaultChecked?: never
}

interface UncontrolledCheckButton extends CheckButtonBase {
    checked?: never
    defaultChecked?: boolean
}

type CheckButtonProps = ControlledCheckButton | UncontrolledCheckButton

export function CheckButton({
                                checked: controlledChecked,
                                defaultChecked = false,
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
                            }: CheckButtonProps) {
    const isControlled = controlledChecked !== undefined
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked)
    const checked = isControlled ? controlledChecked : internalChecked

    const toggle = () => {
        if (disabled) return
        const next = !checked
        if (!isControlled) setInternalChecked(next)
        onChange?.(next)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
        }
    }

    const colorVars: Record<string, string | undefined> = {
        '--check-track-bg': trackBackground,
        '--check-track-bg-checked': checkedTrackBackground,
        '--check-thumb-bg': thumbBackground,
        '--check-thumb-dot-color': thumbDotColor,
        '--check-label-color': labelColor,
    }

    const overrideStyle: React.CSSProperties = {}
    for (const [key, value] of Object.entries(colorVars)) {
        if (value !== undefined) {
            (overrideStyle as any)[key] = value
        }
    }

    const mergedStyle: React.CSSProperties = {
        ...overrideStyle,
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
            className={cls}
            style={mergedStyle}
            role="switch"
            aria-checked={checked}
            tabIndex={disabled ? -1 : 0}
            onClick={toggle}
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