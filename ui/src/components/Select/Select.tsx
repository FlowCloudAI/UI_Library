// Select.tsx
import './Select.css'
import * as React from "react";
import { useClickOutside } from '../../hooks/useClickOutside';
import {isDevelopmentRuntime} from '../../utils/runtime';
import {buildCssVars} from '../../utils/cssVars';
import {useDeprecatedPropWarning} from '../../hooks/useDeprecatedPropWarning';
import type {FcChangeHandler, FcChangeMeta, FcRadius} from '../../types/common';
import {shouldSelectDropUp} from './selectPosition';

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
    group?: string;
}

export type SelectValue = string | number | (string | number)[];
export type SelectRadius = FcRadius;

export interface SelectTokens {
    triggerBackground?: string;
    triggerBorderColor?: string;
    selectedColor?: string;
    selectedBackground?: string;
    hoverBackground?: string;
}

export interface SelectValueChangeMeta extends FcChangeMeta<
    React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>
> {
    option: SelectOption;
    multiple: boolean;
}

export type SelectValueChangeHandler = FcChangeHandler<SelectValue, SelectValueChangeMeta>;

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'value'> {
    options: SelectOption[];
    value?: SelectValue;
    defaultValue?: SelectValue;
    onValueChange?: SelectValueChangeHandler;
    /** @deprecated 推荐改用 onValueChange。 */
    onChange?: (value: SelectValue) => void;
    placeholder?: string;
    searchable?: boolean;
    multiple?: boolean;
    disabled?: boolean;
    /** 圆角大小，触发器和下拉框同步改变 */
    radius?: SelectRadius;
    className?: string;
    style?: React.CSSProperties;
    virtualScroll?: boolean;
    virtualItemHeight?: number;
    maxHeight?: number;
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<SelectTokens>;

    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */
    /** @deprecated 推荐改用 tokens.triggerBackground。 */
    triggerBackground?: string;
    /** @deprecated 推荐改用 tokens.triggerBorderColor。 */
    triggerBorderColor?: string;
    /** @deprecated 推荐改用 tokens.selectedColor。 */
    selectedColor?: string;
    /** @deprecated 推荐改用 tokens.selectedBackground。 */
    selectedBackground?: string;
    /** @deprecated 推荐改用 tokens.hoverBackground。 */
    hoverBackground?: string;
}

export function Select({
                           options,
                           value: controlledValue,
                           defaultValue,
                           onValueChange,
                           onChange,
                           placeholder = '请选择',
                           searchable = false,
                           multiple = false,
                           disabled = false,
                           radius,
                           className = '',
                           style,
                           virtualScroll = false,
                           virtualItemHeight = 32,
                           maxHeight = 256,
                           triggerBackground,
                           triggerBorderColor,
                           selectedColor,
                           selectedBackground,
                           hoverBackground,
                           tokens,
                           onKeyDown,
                           ...props
                       }: SelectProps) {
    const warnedLegacyOnChangeRef = React.useRef(false);
    React.useEffect(() => {
        if (!onChange || warnedLegacyOnChangeRef.current || !isDevelopmentRuntime()) return;
        warnedLegacyOnChangeRef.current = true;
        console.warn('[flowcloudai-ui][Select] onChange 已废弃，推荐改用 onValueChange。');
    }, [onChange]);

    useDeprecatedPropWarning('Select', {
        triggerBackground,
        triggerBorderColor,
        selectedColor,
        selectedBackground,
        hoverBackground,
    });

    const mergedStyle: React.CSSProperties = {
        ...buildCssVars({
            '--select-trigger-bg':            tokens?.triggerBackground ?? triggerBackground,
            '--select-trigger-border':        tokens?.triggerBorderColor ?? triggerBorderColor,
            '--select-option-selected-color': tokens?.selectedColor ?? selectedColor,
            '--select-option-selected-bg':    tokens?.selectedBackground ?? selectedBackground,
            '--select-option-hover-bg':       tokens?.hoverBackground ?? hoverBackground,
        }),
        ...style,
    };

    const [isOpen, setIsOpen] = React.useState(false);
    const [dropUp, setDropUp] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState('');
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = React.useState<any>(
        defaultValue ?? (multiple ? [] : undefined)
    );
    const currentValue = isControlled ? controlledValue : internalValue;

    // 分组处理
    const groupedOptions = React.useMemo(() => {
        const filtered = searchable && searchValue
            ? options.filter(o => o.label.toLowerCase().includes(searchValue.toLowerCase()))
            : options;

        const groups: Record<string, SelectOption[]> = {};
        filtered.forEach(opt => {
            const group = opt.group || '';
            if (!groups[group]) groups[group] = [];
            groups[group].push(opt);
        });
        return groups;
    }, [options, searchValue, searchable]);

    const flatOptions = React.useMemo(() => {
        return Object.values(groupedOptions).flat();
    }, [groupedOptions]);

    React.useLayoutEffect(() => {
        if (!isOpen || !containerRef.current || !dropdownRef.current) {
            setDropUp(false);
            return;
        }

        const trigger = containerRef.current.querySelector<HTMLElement>('.fc-select__trigger');
        if (!trigger) return;

        const triggerRect = trigger.getBoundingClientRect();
        const dropdownHeight = dropdownRef.current.getBoundingClientRect().height;
        let clipTop = 0;
        let clipBottom = window.innerHeight;

        for (let parent = containerRef.current.parentElement; parent; parent = parent.parentElement) {
            if (!/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) continue;
            const rect = parent.getBoundingClientRect();
            clipTop = Math.max(clipTop, rect.top);
            clipBottom = Math.min(clipBottom, rect.bottom);
        }

        const spaceBelow = clipBottom - triggerRect.bottom;
        const spaceAbove = triggerRect.top - clipTop;
        setDropUp(shouldSelectDropUp(dropdownHeight, spaceBelow, spaceAbove));
    }, [isOpen, flatOptions.length]);

    // 虚拟滚动计算
    const [scrollTop, setScrollTop] = React.useState(0);
    const visibleCount = Math.ceil(maxHeight / virtualItemHeight);
    const startIndex = Math.floor(scrollTop / virtualItemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, flatOptions.length);
    const visibleOptions = virtualScroll ? flatOptions.slice(startIndex, endIndex) : flatOptions;
    const totalHeight = flatOptions.length * virtualItemHeight;
    const offsetY = startIndex * virtualItemHeight;

    const emitValueChange = (
        nextValue: SelectValue,
        meta: SelectValueChangeMeta,
    ) => {
        if (onValueChange) {
            onValueChange(nextValue, meta);
        } else {
            onChange?.(nextValue);
        }
    };

    const handleSelect = (
        option: SelectOption,
        meta: Omit<SelectValueChangeMeta, 'option' | 'multiple'>,
    ) => {
        if (option.disabled) return;

        let nextValue: SelectValue;
        if (multiple) {
            const arr = (currentValue as (string | number)[]) || [];
            const exists = arr.includes(option.value);
            nextValue = exists
                ? arr.filter(v => v !== option.value)
                : [...arr, option.value];
        } else {
            nextValue = option.value;
            setIsOpen(false);
        }

        if (!isControlled) setInternalValue(nextValue);
        emitValueChange(nextValue, {...meta, option, multiple});
        if (!multiple) setSearchValue('');
    };

    const isSelected = (value: string | number) => {
        if (multiple) return (currentValue as any[])?.includes(value);
        return currentValue === value;
    };

    const displayLabel = () => {
        if (multiple) {
            const count = (currentValue as any[])?.length || 0;
            return count > 0 ? `已选择 ${count} 项` : placeholder;
        }
        const selected = options.find(o => o.value === currentValue);
        return selected?.label || placeholder;
    };

    // 点击外部关闭
    useClickOutside(containerRef, () => setIsOpen(false));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (disabled) return;
        switch (e.key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (!isOpen) { setIsOpen(true); break; }
                if (flatOptions[highlightedIndex]) {
                    handleSelect(flatOptions[highlightedIndex], {source: 'keyboard', event: e});
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) { setIsOpen(true); break; }
                setHighlightedIndex(i => Math.min(i + 1, flatOptions.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
            case 'Home':
                e.preventDefault();
                setHighlightedIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setHighlightedIndex(flatOptions.length - 1);
                break;
        }
    };

    const classNames = [
        'fc-select',
        isOpen && 'fc-select--open',
        dropUp && 'fc-select--drop-up',
        multiple && 'fc-select--multiple',
        disabled && 'fc-select--disabled',
        radius && `fc-select--radius-${radius}`,
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            {...props}
            ref={containerRef}
            className={classNames}
            style={mergedStyle}
            onKeyDown={handleKeyDown}
        >
            <div
                className="fc-select__trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                tabIndex={disabled ? -1 : 0}
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className={`fc-select__value ${(currentValue === undefined || currentValue === null || (multiple && !(currentValue as any[]).length)) && 'fc-select__value--placeholder'}`}>
                    {displayLabel()}
                </span>
                <span className="fc-select__arrow">▼</span>
            </div>

            {isOpen && (
                <div ref={dropdownRef} className="fc-select__dropdown">
                    {searchable && (
                        <div className="fc-select__search">
                            <input
                                type="text"
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                placeholder="搜索..."
                                className="fc-select__search-input"
                                autoFocus
                            />
                        </div>
                    )}

                    <div
                        ref={listRef}
                        className="fc-select__list"
                        style={{ maxHeight }}
                        onScroll={e => virtualScroll && setScrollTop((e.target as HTMLDivElement).scrollTop)}
                    >
                        {virtualScroll && (
                            <div style={{ height: totalHeight, position: 'relative' }}>
                                <div style={{ transform: `translateY(${offsetY}px)` }}>
                                    {renderOptions(visibleOptions, startIndex)}
                                </div>
                            </div>
                        )}

                        {!virtualScroll && renderGroupedOptions()}
                    </div>
                </div>
            )}
        </div>
    );

    function renderOptions(opts: SelectOption[], baseIndex = 0) {
        return opts.map((option, idx) => {
            const actualIndex = baseIndex + idx;
            const selected = isSelected(option.value);
            const highlighted = actualIndex === highlightedIndex;

            return (
                <div
                    key={option.value}
                    className={[
                        'fc-select__option',
                        selected && 'fc-select__option--selected',
                        option.disabled && 'fc-select__option--disabled',
                        highlighted && 'fc-select__option--highlighted'
                    ].filter(Boolean).join(' ')}
                    onClick={(event) => handleSelect(option, {source: 'click', event})}
                    onMouseEnter={() => setHighlightedIndex(actualIndex)}
                    style={{ height: virtualItemHeight }}
                >
                    {multiple && (
                        <span className={`fc-select__checkbox ${selected && 'fc-select__checkbox--checked'}`}>
                            {selected && '✓'}
                        </span>
                    )}

                    <span className="fc-select__option-label">
                        {highlightText(option.label, searchValue)}
                    </span>

                    {!multiple && selected && <span className="fc-select__check">✓</span>}
                </div>
            );
        });
    }

    function renderGroupedOptions() {
        let baseIndex = 0;
        return Object.entries(groupedOptions).map(([group, opts]) => {
            const currentBaseIndex = baseIndex;
            baseIndex += opts.length;

            return (
                <div key={group} className="fc-select__group">
                    {group && <div className="fc-select__group-label">{group}</div>}
                    {renderOptions(opts, currentBaseIndex)}
                </div>
            );
        });
    }

    function highlightText(text: string, highlight: string) {
        if (!highlight) return text;
        const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === highlight.toLowerCase()
                ? <mark key={i} className="fc-select__highlight">{part}</mark>
                : part
        );
    }
}
