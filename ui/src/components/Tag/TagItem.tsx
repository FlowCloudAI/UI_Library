import "./TagItem.css";
import {CSSProperties, useEffect, useLayoutEffect, useRef, useState} from "react";
import type {FocusEvent, HTMLAttributes, KeyboardEvent, MouseEvent} from "react";
import type {FcChangeHandler, FcChangeMeta} from '../../types/common';

export interface TagSchema {
    id:        string;
    name:      string;
    type:      "number" | "string" | "boolean";
    range_min?: number | null;
    range_max?: number | null;
}

export type TagValue = number | string | boolean;

export interface TagItemTokens {
    background?:  string;
    color?:       string;
    borderColor?: string;
}

export interface TagValueChangeMeta extends FcChangeMeta<
    MouseEvent<HTMLSpanElement> | FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>
> {
    schema: TagSchema;
}

export type TagValueChangeHandler = FcChangeHandler<TagValue, TagValueChangeMeta>;

export interface TagItemProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'defaultValue' | 'onChange' | 'value'> {
    schema:    TagSchema;
    value?:    TagValue;
    onValueChange?: TagValueChangeHandler;
    /** @deprecated 推荐改用 onValueChange。 */
    onChange?: (value: TagValue) => void;
    onDelete?: () => void;
    /** show：展示态；edit：始终为编辑控件 */
    mode?:     "show" | "edit";
    /**
     * 受控编辑状态。
     * 传入时由调用方负责维护，组件不再内部管理；
     * 不传时组件自管（提交/取消退出）。
     */
    editing?:          boolean;
    /** 编辑状态变化回调（提交或取消时触发） */
    onEditingChange?:  (editing: boolean) => void;
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<TagItemTokens>;
    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */
    /** @deprecated 推荐改用 tokens.background。 */
    background?:  string;
    /** @deprecated 推荐改用 tokens.color。 */
    color?:       string;
    /** @deprecated 推荐改用 tokens.borderColor。 */
    borderColor?: string;
}

function isDevelopmentRuntime(): boolean {
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean } }).env;
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
    return metaEnv?.DEV === true || (metaEnv?.PROD !== true && nodeEnv !== undefined && nodeEnv !== 'production');
}

export function TagItem({
    schema,
    value,
    onValueChange,
    onChange,
    onDelete,
    mode = "show",
    editing:          editingProp,
    onEditingChange,
    tokens,
    background,
    color,
    borderColor,
    className,
    style,
    onClick,
    title,
    ...props
}: TagItemProps) {
    const isControlled = editingProp !== undefined;
    const [internalEditing, setInternalEditing] = useState(false);
    const activeEditing = isControlled ? editingProp! : internalEditing;

    const setEditing = (next: boolean) => {
        if (!isControlled) setInternalEditing(next);
        onEditingChange?.(next);
    };

    const [draft, setDraft] = useState(() => (value !== undefined ? String(value) : ""));
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [inputWidth, setInputWidth] = useState<number | undefined>(undefined);
    const warnedLegacyOnChangeRef = useRef(false);

    useEffect(() => {
        if (!onChange || warnedLegacyOnChangeRef.current || !isDevelopmentRuntime()) return;
        warnedLegacyOnChangeRef.current = true;
        console.warn('[flowcloudai-ui][TagItem] onChange 已废弃，推荐改用 onValueChange。');
    }, [onChange]);

    // value 从外部更新时同步 draft（仅非编辑态）
    useEffect(() => {
        if (!activeEditing) setDraft(value !== undefined ? String(value) : "");
    }, [value, activeEditing]);

    useLayoutEffect(() => {
        const text = (mode === "edit" || activeEditing)
            ? draft
            : (value !== undefined ? String(value) : "");
        const nextText = text || " ";
        if (!measureRef.current) return;
        measureRef.current.textContent = nextText;
        setInputWidth(Math.ceil(measureRef.current.offsetWidth) + 2);
    }, [activeEditing, draft, mode, value]);

    // --- CSS 变量注入 ---
    const colorVars: Record<string, string | undefined> = {
        "--tag-bg":     tokens?.background ?? background,
        "--tag-color":  tokens?.color ?? color,
        "--tag-border": tokens?.borderColor ?? borderColor,
    };
    const overrideStyle: CSSProperties = {};
    for (const [k, v] of Object.entries(colorVars)) {
        if (v !== undefined) (overrideStyle as any)[k] = v;
    }
    const mergedStyle: CSSProperties = {...overrideStyle, ...style};

    useEffect(() => {
        const deprecatedColorPropNames = [
            background !== undefined && 'background',
            color !== undefined && 'color',
            borderColor !== undefined && 'borderColor',
        ].filter(Boolean) as string[];
        if (deprecatedColorPropNames.length === 0 || !isDevelopmentRuntime()) return;
        console.warn(`[flowcloudai-ui][TagItem] ${deprecatedColorPropNames.join('/')} 已废弃，推荐改用 tokens。`);
    }, [background, borderColor, color]);

    const emitValueChange = (
        nextValue: TagValue,
        meta: Omit<TagValueChangeMeta, 'schema'>,
    ) => {
        if (onValueChange) {
            onValueChange(nextValue, {...meta, schema});
        } else {
            onChange?.(nextValue);
        }
    };

    const getClassName = (...parts: Array<string | false | undefined>) =>
        [...parts, className].filter(Boolean).join(" ");

    // --- boolean：点击即切换 ---
    if (schema.type === "boolean") {
        const boolVal = value === true || value === "true";
        const handleBooleanClick = (event: MouseEvent<HTMLSpanElement>) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            emitValueChange(!boolVal, {source: 'click', event});
        };

        return (
            <span
                {...props}
                className={getClassName("fc-tag-item", "fc-tag-item--boolean")}
                style={mergedStyle}
                onClick={handleBooleanClick}
                title={title ?? "点击切换"}
            >
                <span className="fc-tag-item__name">{schema.name}</span>
                <span className="fc-tag-item__sep">·</span>
                <span className={boolVal ? "fc-tag-item__bool-true" : "fc-tag-item__bool-false"}>
                    {boolVal ? "✓" : "✗"}
                </span>
            </span>
        );
    }

    // --- 提交编辑 ---
    const commit = (
        source: TagValueChangeMeta['source'] = 'input',
        event?: TagValueChangeMeta['event'],
    ) => {
        if (schema.type === "number") {
            const n = parseFloat(draft);
            if (!isNaN(n)) {
                const clamped =
                    schema.range_min != null && n < schema.range_min ? schema.range_min :
                    schema.range_max != null && n > schema.range_max ? schema.range_max : n;
                emitValueChange(clamped, {source, event});
            }
        } else {
            emitValueChange(draft, {source, event});
        }
        if (mode !== "edit") setEditing(false);
    };

    const cancel = () => {
        setDraft(value !== undefined ? String(value) : "");
        if (mode !== "edit") setEditing(false);
    };

    // --- 编辑态（mode="edit" 或 activeEditing） ---
    const isEditing = mode === "edit" || activeEditing;

    if (isEditing) {
        return (
            <span
                {...props}
                className={getClassName("fc-tag-item", "fc-tag-item--editing")}
                style={mergedStyle}
                onClick={onClick}
                title={title}
            >
                <span ref={measureRef} className="fc-tag-item__measure" aria-hidden="true"/>
                <span className="fc-tag-item__name">{schema.name}</span>
                <span className="fc-tag-item__sep">·</span>
                <input
                    ref={inputRef}
                    className="fc-tag-item__input"
                    type={schema.type === "number" ? "number" : "text"}
                    value={draft}
                    style={inputWidth ? {width: `${inputWidth}px`} : undefined}
                    min={schema.range_min ?? undefined}
                    max={schema.range_max ?? undefined}
                    autoFocus
                    onChange={e => setDraft(e.target.value)}
                    onBlur={event => commit('input', event)}
                    onKeyDown={e => {
                        if (e.key === "Enter")  { e.preventDefault(); commit('keyboard', e); }
                        if (e.key === "Escape") { e.preventDefault(); cancel(); }
                    }}
                />
                <button
                    type="button"
                    className="fc-tag-item__delete"
                    aria-label={`删除${schema.name}`}
                    title={`删除${schema.name}`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => onDelete?.()}
                >
                    x
                </button>
            </span>
        );
    }

    // --- 展示态（外观与编辑态一致，但不支持双击进入编辑） ---
    return (
        <span
            {...props}
            className={getClassName("fc-tag-item", "fc-tag-item--editing", "fc-tag-item--show")}
            style={mergedStyle}
            onClick={onClick}
            title={title}
        >
            <span ref={measureRef} className="fc-tag-item__measure" aria-hidden="true"/>
            <span className="fc-tag-item__name">{schema.name}</span>
            <span className="fc-tag-item__sep">·</span>
            <input
                className="fc-tag-item__input fc-tag-item__input--readonly"
                type={schema.type === "number" ? "number" : "text"}
                value={value !== undefined ? String(value) : ""}
                style={inputWidth ? {width: `${inputWidth}px`} : undefined}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
            />
        </span>
    );
}
