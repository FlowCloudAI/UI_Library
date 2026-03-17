// Select.tsx
import './Select.css'
import * as React from "react";

interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
    group?: string;
}

interface SelectProps {
    options: SelectOption[];
    value?: string | number | (string | number)[];
    defaultValue?: string | number | (string | number)[];
    onChange?: (value: any) => void;
    placeholder?: string;
    searchable?: boolean;
    multiple?: boolean;
    disabled?: boolean;
    className?: string;
    virtualScroll?: boolean;
    virtualItemHeight?: number;
    maxHeight?: number;
}

export function Select({
                           options,
                           value: controlledValue,
                           defaultValue,
                           onChange,
                           placeholder = '请选择',
                           searchable = false,
                           multiple = false,
                           disabled = false,
                           className = '',
                           virtualScroll = false,
                           virtualItemHeight = 32,
                           maxHeight = 256
                       }: SelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState('');
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);

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

    // 虚拟滚动计算
    const [scrollTop, setScrollTop] = React.useState(0);
    const visibleCount = Math.ceil(maxHeight / virtualItemHeight);
    const startIndex = Math.floor(scrollTop / virtualItemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, flatOptions.length);
    const visibleOptions = virtualScroll ? flatOptions.slice(startIndex, endIndex) : flatOptions;
    const totalHeight = flatOptions.length * virtualItemHeight;
    const offsetY = startIndex * virtualItemHeight;

    const handleSelect = (option: SelectOption) => {
        if (option.disabled) return;

        let nextValue: any;
        if (multiple) {
            const arr = (currentValue as any[]) || [];
            const exists = arr.includes(option.value);
            nextValue = exists
                ? arr.filter(v => v !== option.value)
                : [...arr, option.value];
        } else {
            nextValue = option.value;
            setIsOpen(false);
        }

        if (!isControlled) setInternalValue(nextValue);
        onChange?.(nextValue);
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
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const classNames = [
        'fc-select',
        isOpen && 'fc-select--open',
        multiple && 'fc-select--multiple',
        disabled && 'fc-select--disabled',
        className
    ].filter(Boolean).join(' ');

    return (
        <div ref={containerRef} className={classNames}>
            <div
                className="fc-select__trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`fc-select__value ${!currentValue && 'fc-select__value--placeholder'}`}>
                    {displayLabel()}
                </span>
                <span className="fc-select__arrow">▼</span>
            </div>

            {isOpen && (
                <div className="fc-select__dropdown">
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
                    onClick={() => handleSelect(option)}
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
        return Object.entries(groupedOptions).map(([group, opts]) => (
            <div key={group} className="fc-select__group">
                {group && <div className="fc-select__group-label">{group}</div>}
                {renderOptions(opts)}
            </div>
        ));
    }

    function highlightText(text: string, highlight: string) {
        if (!highlight) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === highlight.toLowerCase()
                ? <mark key={i} className="fc-select__highlight">{part}</mark>
                : part
        );
    }
}