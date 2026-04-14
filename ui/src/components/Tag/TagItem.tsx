import "./TagItem.css";
import {CSSProperties, useEffect, useLayoutEffect, useRef, useState} from "react";

export interface TagSchema {
    id:        string;
    name:      string;
    type:      "number" | "string" | "boolean";
    range_min?: number | null;
    range_max?: number | null;
}

export type TagValue = number | string | boolean;

export interface TagItemProps {
    schema:    TagSchema;
    value?:    TagValue;
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
    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    background?:  string;
    color?:       string;
    borderColor?: string;
}

export function TagItem({
    schema,
    value,
    onChange,
                            onDelete,
    mode = "show",
    editing:          editingProp,
    onEditingChange,
    background,
    color,
    borderColor,
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
        "--tag-bg":     background,
        "--tag-color":  color,
        "--tag-border": borderColor,
    };
    const overrideStyle: CSSProperties = {};
    for (const [k, v] of Object.entries(colorVars)) {
        if (v !== undefined) (overrideStyle as any)[k] = v;
    }

    // --- boolean：点击即切换 ---
    if (schema.type === "boolean") {
        const boolVal = value === true || value === "true";
        return (
            <span
                className="fc-tag-item fc-tag-item--boolean"
                style={overrideStyle}
                onClick={() => onChange?.(!boolVal)}
                title="点击切换"
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
    const commit = () => {
        if (schema.type === "number") {
            const n = parseFloat(draft);
            if (!isNaN(n)) {
                const clamped =
                    schema.range_min != null && n < schema.range_min ? schema.range_min :
                    schema.range_max != null && n > schema.range_max ? schema.range_max : n;
                onChange?.(clamped);
            }
        } else {
            onChange?.(draft);
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
            <span className="fc-tag-item fc-tag-item--editing" style={overrideStyle}>
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
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === "Enter")  { e.preventDefault(); commit(); }
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
        <span className="fc-tag-item fc-tag-item--editing fc-tag-item--show" style={overrideStyle}>
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
