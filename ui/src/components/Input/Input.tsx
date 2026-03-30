// Input.tsx
import './Input.css'
import * as React from "react";

type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type InputStatus = 'default' | 'error' | 'warning' | 'success';
type InputRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
    size?: InputSize;
    status?: InputStatus;
    /** 圆角大小，不传则使用默认值 md */
    radius?: InputRadius;
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    allowClear?: boolean;
    passwordToggle?: boolean;
    addonBefore?: React.ReactNode;
    addonAfter?: React.ReactNode;
    helperText?: string;
    onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
                                                                         size = 'md',
                                                                         status = 'default',
                                                                         radius,
                                                                         prefix,
                                                                         suffix,
                                                                         allowClear = false,
                                                                         passwordToggle = false,
                                                                         addonBefore,
                                                                         addonAfter,
                                                                         helperText,
                                                                         className = '',
                                                                         type: initialType = 'text',
                                                                         value,
                                                                         defaultValue,
                                                                         onChange,
                                                                         onClear,
                                                                         disabled,
                                                                         ...props
                                                                     }, ref) => {
    const [type, setType] = React.useState(initialType);
    const [internalValue, setInternalValue] = React.useState(defaultValue || '');
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) setInternalValue(e.target.value);
        onChange?.(e);
    };

    const handleClear = () => {
        if (!isControlled) setInternalValue('');
        onClear?.();
        // 触发空值的change事件
        const event = {target: {value: ''}} as React.ChangeEvent<HTMLInputElement>;
        onChange?.(event);
    };

    const togglePassword = () => {
        setType(prev => prev === 'password' ? 'text' : 'password');
    };

    const showClear = allowClear && currentValue && !disabled;
    const showPasswordToggle = passwordToggle && initialType === 'password' && !disabled;

    const classNames = [
        'fc-input',
        `fc-input--${size}`,
        `fc-input--${status}`,
        radius && `fc-input--radius-${radius}`,
        (prefix || addonBefore) && 'fc-input--has-prefix',
        (suffix || addonAfter || showClear || showPasswordToggle) && 'fc-input--has-suffix',
        addonBefore && 'fc-input--addon-before',
        addonAfter && 'fc-input--addon-after',
        disabled && 'fc-input--disabled',
        className
    ].filter(Boolean).join(' ');

    const input = (
        <input
            ref={ref}
            type={type}
            value={currentValue}
            onChange={handleChange}
            disabled={disabled}
            className="fc-input__field"
            {...props}
        />
    );

    return (
        <div className={classNames}>
            {addonBefore && (
                <span className="fc-input__addon fc-input__addon--before">{addonBefore}</span>
            )}

            <div className="fc-input__wrapper">
                {prefix && (
                    <span className="fc-input__prefix">{prefix}</span>
                )}

                {input}

                <span className="fc-input__actions">
                    {showClear && (
                        <button
                            type="button"
                            className="fc-input__action fc-input__clear"
                            onClick={handleClear}
                            tabIndex={-1}
                        >
                            ✕
                        </button>
                    )}

                    {showPasswordToggle && (
                        <button
                            type="button"
                            className="fc-input__action fc-input__eye"
                            onClick={togglePassword}
                            tabIndex={-1}
                        >
                            {type === 'password' ? '👁' : '🙈'}
                        </button>
                    )}

                    {suffix && <span className="fc-input__suffix">{suffix}</span>}
                </span>
            </div>

            {addonAfter && (
                <span className="fc-input__addon fc-input__addon--after">{addonAfter}</span>
            )}

            {helperText && (
                <span className={`fc-input__helper fc-input__helper--${status}`}>
                    {helperText}
                </span>
            )}
        </div>
    );
});
Input.displayName = 'Input';