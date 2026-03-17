import './CheckButton.css'
import * as React from 'react'

interface CheckButtonProps {
    checked?: boolean
    defaultChecked?: boolean
    onChange?: (checked: boolean) => void
    disabled?: boolean
    size?: 'sm' | 'md' | 'lg'
    labelLeft?: string
    labelRight?: string
    className?: string
    style?: React.CSSProperties
}

export function CheckButton({
                                checked: controlledChecked,
                                defaultChecked = false,
                                onChange,
                                disabled = false,
                                size = 'md',
                                labelLeft,
                                labelRight,
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

    const cls = [
        'fc-check',
        `fc-check--${size}`,
        checked   && 'fc-check--checked',
        disabled  && 'fc-check--disabled',
        className,
    ].filter(Boolean).join(' ')

    return (
        <div
            className={cls}
            style={style}
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