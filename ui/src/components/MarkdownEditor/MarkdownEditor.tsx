import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,} from "react";
import "./MarkdownEditor.css";
import type {ICommand, MDEditorProps, RefMDEditor} from "@uiw/react-md-editor";
import MDEditor, {commands} from "@uiw/react-md-editor";
import {useOptionalTheme} from "../../ThemeProvider";
import type {FcChangeHandler, FcChangeMeta} from "../../types/common";
import {isDevelopmentRuntime} from "../../utils/runtime";
import {buildCssVars} from "../../utils/cssVars";
import {useDeprecatedPropWarning} from "../../hooks/useDeprecatedPropWarning";

export type MarkdownPreviewOptions = MDEditorProps["previewOptions"];
export type MarkdownPreviewRenderer = NonNullable<MDEditorProps["components"]>["preview"];
type MarkdownEditorChangeEvent = Parameters<NonNullable<MDEditorProps["onChange"]>>[1];
export type MarkdownEditorValueChangeMeta = FcChangeMeta<MarkdownEditorChangeEvent>;
export type MarkdownEditorValueChangeHandler = FcChangeHandler<string, MarkdownEditorValueChangeMeta>;

export interface MarkdownEditorTokens {
    background?: string;
    toolbarBackground?: string;
    borderColor?: string;
    textColor?: string;
    mutedTextColor?: string;
    toolbarButtonHoverBackground?: string;
    toolbarButtonHoverColor?: string;
    primaryColor?: string;
    primaryBackground?: string;
    editorTextBackground?: string;
    previewBackground?: string;
    fontSizeScale?: number;
    codeInlineBackground?: string;
    codeBlockBackground?: string;
    blockquoteBorderColor?: string;
    selectionBackground?: string;
}

export interface MarkdownEditorRef {
    /** 获取底层 @uiw/react-md-editor 的 ref 实例 */
    getEditorInstance: () => RefMDEditor | null;
    /** 获取内部 textarea DOM 节点 */
    getTextareaElement: () => HTMLTextAreaElement | null;
}

export interface MarkdownEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "onFocus" | "onBlur" | "onKeyDown"> {
    value:        string;
    /** 推荐使用的内容变更回调。 */
    onValueChange?: MarkdownEditorValueChangeHandler;
    /** @deprecated 保留兼容，推荐改用 onValueChange。 */
    onChange?:     (v: string) => void;
    /** AI 补全回调 */
    onAiComplete?: () => void;
    minHeight?:   number;
    height?:      number | string;
    maxHeight?:   number;
    autoHeight?:  boolean;
    placeholder?: string;
    disabled?:    boolean;
    /** 透传到底层 textarea，用于监听键盘、输入、光标等事件 */
    textareaProps?: MDEditorProps["textareaProps"];
    onFocus?: MDEditorProps["textareaProps"] extends infer T
        ? T extends { onFocus?: infer F }
            ? F
            : never
        : never;
    onBlur?: MDEditorProps["textareaProps"] extends infer T
        ? T extends { onBlur?: infer F }
            ? F
            : never
        : never;
    /**
     * 显示模式
     * - edit:    编辑模式（工具栏含双栏切换按钮）
     * - preview: 纯预览，只读渲染 Markdown，隐藏工具栏
     * @default 'edit'
     */
    mode?: 'edit' | 'preview';
    /** 透传到内部 textarea 的 onKeyDown，可用于拦截 Ctrl+Z 等快捷键 */
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    showSplitToggle?: boolean;
    defaultSplitView?: boolean;
    splitView?: boolean;
    onSplitChange?: (split: boolean) => void;
    showAiButton?: boolean;
    toolbarCommands?: ICommand[];
    extraCommands?: ICommand[];
    hideFullscreen?: boolean;
    previewOptions?: MarkdownPreviewOptions;
    previewRender?: MarkdownPreviewRenderer;
    /** 深度样式覆盖，优先级高于旧样式 props。 */
    tokens?: Partial<MarkdownEditorTokens>;
    /* ---- 兼容旧样式 props；新用法推荐 tokens ---- */
    /** @deprecated 推荐改用 tokens.background。 */
    background?:      string;
    /** @deprecated 推荐改用 tokens.toolbarBackground。 */
    toolbarBackground?: string;
    /** @deprecated 推荐改用 tokens.borderColor。 */
    borderColor?:     string;
    /** @deprecated 推荐改用 tokens.textColor。 */
    textColor?:       string;
    /** @deprecated 推荐改用 tokens.mutedTextColor。 */
    mutedTextColor?:  string;
    /** @deprecated 推荐改用 tokens.toolbarButtonHoverBackground。 */
    toolbarButtonHoverBackground?: string;
    /** @deprecated 推荐改用 tokens.toolbarButtonHoverColor。 */
    toolbarButtonHoverColor?: string;
    /** @deprecated 推荐改用 tokens.primaryColor。 */
    primaryColor?:    string;
    /** @deprecated 推荐改用 tokens.primaryBackground。 */
    primaryBackground?: string;
    /** @deprecated 推荐改用 tokens.editorTextBackground。 */
    editorTextBackground?: string;
    /** @deprecated 推荐改用 tokens.previewBackground。 */
    previewBackground?: string;
    /** @deprecated 推荐改用 tokens.fontSizeScale。 */
    fontSizeScale?: number;
    /** @deprecated 推荐改用 tokens.codeInlineBackground。 */
    codeInlineBackground?: string;
    /** @deprecated 推荐改用 tokens.codeBlockBackground。 */
    codeBlockBackground?: string;
    /** @deprecated 推荐改用 tokens.blockquoteBorderColor。 */
    blockquoteBorderColor?: string;
    /** @deprecated 推荐改用 tokens.selectionBackground。 */
    selectionBackground?: string;
}

function withTitle(cmd: ICommand, title: string): ICommand {
    return { ...cmd, buttonProps: { ...(cmd.buttonProps ?? {}), title } };
}

/** 精简工具栏：只保留常用排版命令 */
const TOOLBAR_COMMANDS: ICommand[] = [
    withTitle(commands.bold,                 '加粗'),
    withTitle(commands.italic,               '斜体'),
    withTitle(commands.strikethrough,        '删除线'),
    commands.divider,
    withTitle(commands.heading1, '一级标题'),
    withTitle(commands.heading2, '二级标题'),
    withTitle(commands.heading3, '三级标题'),
    commands.divider,
    withTitle(commands.quote,                '引用'),
    withTitle(commands.code,                 '行内代码'),
    withTitle(commands.codeBlock,            '代码块'),
    commands.divider,
    withTitle(commands.link,                 '链接'),
    withTitle(commands.unorderedListCommand, '无序列表'),
    withTitle(commands.orderedListCommand,   '有序列表'),
    withTitle(commands.hr,                   '分割线'),
];

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(function MarkdownEditor(_ref, ref) {
    const {
        value,
        onValueChange,
        onChange,
        onAiComplete,
        minHeight = 200,
        height,
        maxHeight,
        autoHeight = true,
        placeholder = "在此输入内容...",
        disabled,
        className,
        style,
        textareaProps,
        onFocus,
        onBlur,
        onKeyDown,
        mode = "edit",
        showSplitToggle = true,
        defaultSplitView = false,
        splitView,
        onSplitChange,
        showAiButton,
        toolbarCommands,
        extraCommands,
        hideFullscreen = false,
        previewOptions,
        previewRender,
        tokens,
        background,
        toolbarBackground,
        borderColor,
        textColor,
        mutedTextColor,
        toolbarButtonHoverBackground,
        toolbarButtonHoverColor,
        primaryColor,
        primaryBackground,
        editorTextBackground,
        previewBackground,
        fontSizeScale,
        codeInlineBackground,
        codeBlockBackground,
        blockquoteBorderColor,
        selectionBackground,
        ...props
    } = _ref;
    const resolvedTheme = useOptionalTheme()?.resolvedTheme ?? "light";
    const editorRef = useRef<RefMDEditor>(null);

    useImperativeHandle(ref, () => ({
        getEditorInstance: () => editorRef.current,
        getTextareaElement: () =>
            wrapRef.current?.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input') ?? null,
    }), []);

    const warnedLegacyOnChangeRef = useRef(false);

    useEffect(() => {
        if (!onChange || warnedLegacyOnChangeRef.current || !isDevelopmentRuntime()) return;
        warnedLegacyOnChangeRef.current = true;
        console.warn("[flowcloudai-ui][MarkdownEditor] onChange(value) 已保留兼容，建议改用 onValueChange。");
    }, [onChange]);

    useDeprecatedPropWarning('MarkdownEditor', {
        background,
        toolbarBackground,
        borderColor,
        textColor,
        mutedTextColor,
        toolbarButtonHoverBackground,
        toolbarButtonHoverColor,
        primaryColor,
        primaryBackground,
        editorTextBackground,
        previewBackground,
        fontSizeScale,
        codeInlineBackground,
        codeBlockBackground,
        blockquoteBorderColor,
        selectionBackground,
    });

    // 稳定的 change 包装 — MDEditor 每次渲染不会看到新的函数引用
    const onValueChangeRef = useRef(onValueChange);
    onValueChangeRef.current = onValueChange;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const handleChange = useCallback<NonNullable<MDEditorProps["onChange"]>>((v, event) => {
        const nextValue = v ?? "";
        if (onValueChangeRef.current) {
            onValueChangeRef.current(nextValue, {source: "input", event});
        } else {
            onChangeRef.current?.(nextValue);
        }
    }, []);

    const [uncontrolledSplit, setUncontrolledSplit] = useState(defaultSplitView);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [editorHeight, setEditorHeight] = useState(minHeight);
    const isSplitControlled = splitView !== undefined;
    const showSplit = isSplitControlled ? splitView : uncontrolledSplit;
    const resolvedShowAiButton = showAiButton ?? !!onAiComplete;
    const isPreviewMode = mode === "preview";

    const setShowSplit = (next: boolean | ((prev: boolean) => boolean)) => {
        const nextValue = typeof next === "function" ? next(showSplit) : next;
        if (!isSplitControlled) setUncontrolledSplit(nextValue);
        onSplitChange?.(nextValue);
    };

    // --- CSS 变量注入 ---
    const overrideStyle: React.CSSProperties = {
        ...style,
        ...buildCssVars({
            "--md-bg":                         tokens?.background ?? background,
            "--md-toolbar-bg":                 tokens?.toolbarBackground ?? toolbarBackground,
            "--md-border":                     tokens?.borderColor ?? borderColor,
            "--md-text":                       tokens?.textColor ?? textColor,
            "--md-text-muted":                 tokens?.mutedTextColor ?? mutedTextColor,
            "--md-toolbar-hover-bg":           tokens?.toolbarButtonHoverBackground ?? toolbarButtonHoverBackground,
            "--md-toolbar-hover-color":        tokens?.toolbarButtonHoverColor ?? toolbarButtonHoverColor,
            "--md-primary":                    tokens?.primaryColor ?? primaryColor,
            "--md-primary-bg":                 tokens?.primaryBackground ?? primaryBackground,
            "--md-editor-text-bg":             tokens?.editorTextBackground ?? editorTextBackground,
            "--md-preview-bg":                 tokens?.previewBackground ?? previewBackground,
            "--md-font-size-scale":            tokens?.fontSizeScale ?? fontSizeScale,
            "--md-code-inline-bg":             tokens?.codeInlineBackground ?? codeInlineBackground,
            "--md-code-block-bg":              tokens?.codeBlockBackground ?? codeBlockBackground,
            "--md-blockquote-border":          tokens?.blockquoteBorderColor ?? blockquoteBorderColor,
            "--md-selection-bg":               tokens?.selectionBackground ?? selectionBackground,
        }),
    };

    // --- AI 补全按钮 ---
    const aiCommand: ICommand = {
        name:        "ai-complete",
        keyCommand:  "ai-complete",
        buttonProps: { "aria-label": "AI 补全", title: "AI 补全", className: "fc-md-ai-btn" },
        icon:        <span>AI</span>,
        execute:     () => onAiComplete?.(),
    };

    // --- 双栏切换按钮 ---
    const splitCommand: ICommand = {
        name:        "split-view",
        keyCommand:  "split-view",
        buttonProps: {
            "aria-label": showSplit ? "纯编辑" : "双栏预览",
            title:        showSplit ? "纯编辑" : "双栏预览",
            className:    `fc-md-split-btn${showSplit ? " fc-md-split-btn--active" : ""}`,
        },
        icon:    <span className="fc-md-split-icon">⊟</span>,
        execute: () => setShowSplit(p => !p),
    };

    const mergedExtraCommands = useMemo(() => {
        const result: ICommand[] = [];
        if (showSplitToggle && mode === "edit") {
            result.push(splitCommand);
        }
        if (resolvedShowAiButton) {
            if (result.length > 0) result.push(commands.divider);
            result.push(aiCommand);
        }
        if (!hideFullscreen) {
            if (result.length > 0) result.push(commands.divider);
            result.push(withTitle(commands.fullscreen, "全屏"));
        }
        if (extraCommands?.length) {
            if (result.length > 0) result.push(commands.divider);
            result.push(...extraCommands);
        }
        return result;
    }, [showSplitToggle, mode, resolvedShowAiButton, onAiComplete, hideFullscreen, extraCommands, showSplit]);

    // 实际传给 MDEditor 的 preview 值
    const editorPreview = isPreviewMode ? 'preview' : showSplit ? 'live' : 'edit';

    const mergedTextareaProps = useMemo<MDEditorProps["textareaProps"]>(() => ({
        ...textareaProps,
        placeholder,
        disabled,
        onFocus: event => {
            textareaProps?.onFocus?.(event);
            onFocus?.(event);
        },
        onBlur: event => {
            textareaProps?.onBlur?.(event);
            onBlur?.(event);
        },
        onKeyDown: event => {
            textareaProps?.onKeyDown?.(event);
            onKeyDown?.(event);
        },
    }), [textareaProps, placeholder, disabled, onFocus, onBlur, onKeyDown]);

    useLayoutEffect(() => {
        if (!autoHeight) {
            const baseHeight = height ?? minHeight;
            setEditorHeight(typeof baseHeight === "number" ? baseHeight : minHeight);
            return;
        }

        const root = wrapRef.current;
        if (!root) return;

        const getScrollHeight = (selector: string) =>
            root.querySelector<HTMLElement>(selector)?.scrollHeight ?? 0;

        const measure = () => {
            const toolbarHeight =
                isPreviewMode
                    ? 0
                    : root.querySelector<HTMLElement>('.w-md-editor-toolbar')?.getBoundingClientRect().height ?? 0;
            const editorText = root.querySelector<HTMLElement>('.w-md-editor-text');
            const textarea = root.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input');
            const textPre = root.querySelector<HTMLElement>('.w-md-editor-text-pre');
            const textPreCode = root.querySelector<HTMLElement>('.w-md-editor-text-pre > code');
            const preview = root.querySelector<HTMLElement>('.w-md-editor-preview');
            const markdown = root.querySelector<HTMLElement>('.wmde-markdown');

            const getVerticalPadding = (node: HTMLElement | null) => {
                if (!node) return 0;
                const styles = window.getComputedStyle(node);
                return (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
            };

            const inputHeight = Math.max(
                textarea?.scrollHeight ?? 0,
                (textPre?.scrollHeight ?? 0) + getVerticalPadding(editorText),
                (textPreCode?.scrollHeight ?? 0) + getVerticalPadding(editorText),
            );
            const previewHeight = Math.max(
                (markdown?.scrollHeight ?? 0) + getVerticalPadding(preview),
                getScrollHeight('.wmde-markdown'),
            );

            const bodyHeight =
                isPreviewMode
                    ? previewHeight
                    : showSplit
                        ? Math.max(inputHeight, previewHeight)
                        : inputHeight;

            let nextHeight = Math.max(minHeight, Math.ceil(toolbarHeight + bodyHeight));
            if (typeof maxHeight === "number") {
                nextHeight = Math.min(nextHeight, maxHeight);
            }
            setEditorHeight(prev => (Math.abs(prev - nextHeight) > 1 ? nextHeight : prev));
        };

        const rafId = window.requestAnimationFrame(measure);
        const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);

        const toolbar = root.querySelector<HTMLElement>('.w-md-editor-toolbar');
        const inputArea = root.querySelector<HTMLElement>('.w-md-editor-area');
        const inputBody = root.querySelector<HTMLElement>('.w-md-editor-text');
        const textarea = root.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input');
        const textPre = root.querySelector<HTMLElement>('.w-md-editor-text-pre');
        const textPreCode = root.querySelector<HTMLElement>('.w-md-editor-text-pre > code');
        const preview = root.querySelector<HTMLElement>('.w-md-editor-preview');
        const markdown = root.querySelector<HTMLElement>('.wmde-markdown');

        [toolbar, inputArea, inputBody, textarea, textPre, textPreCode, preview, markdown].forEach(node => {
            if (node && resizeObserver) resizeObserver.observe(node);
        });

        window.addEventListener('resize', measure);

        return () => {
            window.cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [autoHeight, value, isPreviewMode, showSplit, minHeight, maxHeight, height]);

    const editorHeightValue = autoHeight ? editorHeight : (height ?? minHeight);
    const editorCommands = toolbarCommands ?? TOOLBAR_COMMANDS;
    const editorComponents = previewRender ? { preview: previewRender } : undefined;

    return (
        <div
            {...props}
            ref={wrapRef}
            className={["fc-md-wrap", className].filter(Boolean).join(" ")}
            style={overrideStyle}
            data-color-mode={resolvedTheme}
            data-auto-height={autoHeight ? "true" : "false"}
            data-mode={mode}
        >
            <MDEditor
                ref={editorRef}
                value={value}
                onChange={handleChange}
                commands={editorCommands}
                extraCommands={mergedExtraCommands}
                height={editorHeightValue}
                preview={editorPreview}
                hideToolbar={mode === 'preview'}
                visibleDragbar={false}
                textareaProps={mergedTextareaProps}
                previewOptions={previewOptions}
                components={editorComponents}
                className={disabled ? "fc-md-editor--disabled" : undefined}
            />
        </div>
    );
});
