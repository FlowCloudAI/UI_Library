// Input.tsx
import './Input.css'
import * as React from "react";
import type {FcChangeHandler, FcChangeMeta, FcRadius, FcSize, FcStatus} from '../../types/common';
import {isDevelopmentRuntime} from '../../utils/runtime';

export type InputSize = FcSize;
export type InputStatus = FcStatus;
export type InputRadius = FcRadius;
export type InputValueChangeMeta = FcChangeMeta<
    React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>
>;
export type InputValueChangeHandler = FcChangeHandler<string, InputValueChangeMeta>;

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'onChange'> {
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
    /** 推荐使用的值变更回调。 */
    onValueChange?: InputValueChangeHandler;
    /** @deprecated 保留兼容，推荐改用 onValueChange。 */
    onChange?: (value: string) => void;
    /** 在数字输入框中显示可控的加减按钮，默认开启。 */
    showNumberStepper?: boolean;
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
                                                                         style,
                                                                         type: initialType = 'text',
                                                                         value,
                                                                         defaultValue,
                                                                         onValueChange,
                                                                         onChange,
                                                                         showNumberStepper = true,
                                                                         onClear,
                                                                         step = 1,
                                                                         min,
                                                                         max,
                                                                         disabled,
                                                                         ...props
                                                                     }, ref) => {
    const [type, setType] = React.useState(initialType);
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);
    const warnedLegacyOnChangeRef = React.useRef(false);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : internalValue;
    const currentValueText = (currentValue ?? '').toString();
    const isNumberType = initialType === 'number';
    const numberStep = (() => {
        const parsed = typeof step === 'number' ? step : Number.parseFloat(String(step));
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    })();
    const numberMin = (() => {
        if (min === undefined) return undefined;
        const parsed = typeof min === 'number' ? min : Number.parseFloat(String(min));
        return Number.isFinite(parsed) ? parsed : undefined;
    })();
    const numberMax = (() => {
        if (max === undefined) return undefined;
        const parsed = typeof max === 'number' ? max : Number.parseFloat(String(max));
        return Number.isFinite(parsed) ? parsed : undefined;
    })();
    const numberScale = String(numberStep).includes('.') ? String(numberStep).split('.')[1].length : 0;
    const showStepper = isNumberType && showNumberStepper;
    const clampNumberValue = (rawValue: number): number => {
        if (numberMin !== undefined) rawValue = Math.max(rawValue, numberMin);
        if (numberMax !== undefined) rawValue = Math.min(rawValue, numberMax);
        return rawValue;
    };
    const normalizeNumberValue = (rawValue: number): string => {
        const fixed = numberScale > 0 ? rawValue.toFixed(numberScale) : String(Math.round(rawValue));
        return numberScale > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
    };

    const emitValueChange = (
        nextValue: string,
        meta: InputValueChangeMeta,
    ) => {
        if (onValueChange) {
            onValueChange(nextValue, meta);
        } else {
            onChange?.(nextValue);
        }
    };

    const handleNumberStep = (delta: number, event: React.MouseEvent<HTMLButtonElement>) => {
        if (!showStepper || disabled) return;
        const parsedCurrent = Number.parseFloat(
            isControlled ? currentValueText : inputRef.current?.value ?? currentValueText
        );
        const baseValue = Number.isFinite(parsedCurrent) ? parsedCurrent : 0;
        const nextValue = clampNumberValue(baseValue + delta * numberStep);
        const normalizedNext = normalizeNumberValue(nextValue);

        if (!isControlled) {
            setInternalValue(normalizedNext);
            if (inputRef.current) inputRef.current.value = normalizedNext;
        }
        emitValueChange(normalizedNext, {source: 'click', event});
    };

    React.useEffect(() => {
        if (!onChange || warnedLegacyOnChangeRef.current || !isDevelopmentRuntime()) return;
        warnedLegacyOnChangeRef.current = true;
        console.warn('[flowcloudai-ui][Input] onChange(value) 已保留兼容，建议改用 onValueChange。');
    }, [onChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isControlled) setInternalValue(e.target.value);
        emitValueChange(e.target.value, {source: 'input', event: e});
    };

    const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!isControlled) {
            setInternalValue('');
            if (inputRef.current) inputRef.current.value = '';
        }
        onClear?.();
        emitValueChange('', {source: 'click', event});
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
        isNumberType && 'fc-input--number',
        addonBefore && 'fc-input--addon-before',
        addonAfter && 'fc-input--addon-after',
        disabled && 'fc-input--disabled',
        className
    ].filter(Boolean).join(' ');

    const input = (
        <input
            ref={inputRef}
            type={type}
            value={isControlled ? currentValue : undefined}
            defaultValue={isControlled ? undefined : defaultValue}
            onChange={handleChange}
            disabled={disabled}
            className="fc-input__field"
            {...props}
        />
    );

    return (
        <div className={classNames} style={style}>
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

                    {showStepper && (
                        <span className="fc-input__stepper">
                            <button
                                type="button"
                                className="fc-input__stepper-btn"
                                onClick={(event) => handleNumberStep(1, event)}
                                tabIndex={-1}
                                aria-label="增加"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                className="fc-input__stepper-btn"
                                onClick={(event) => handleNumberStep(-1, event)}
                                tabIndex={-1}
                                aria-label="减少"
                            >
                                -
                            </button>
                        </span>
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
