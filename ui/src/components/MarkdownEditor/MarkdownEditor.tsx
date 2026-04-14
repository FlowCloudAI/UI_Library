import React, {useCallback, useLayoutEffect, useMemo, useRef, useState} from "react";
import "./MarkdownEditor.css";
import type {ICommand, MDEditorProps} from "@uiw/react-md-editor";
import MDEditor, {commands} from "@uiw/react-md-editor";
import {useTheme} from "../../ThemeProvider";

type MarkdownPreviewOptions = MDEditorProps["previewOptions"];
type MarkdownPreviewRenderer = NonNullable<MDEditorProps["components"]>["preview"];

export interface MarkdownEditorProps {
    value:        string;
    onChange:     (v: string) => void;
    /** AI 补全回调 */
    onAiComplete?: () => void;
    minHeight?:   number;
    height?:      number | string;
    maxHeight?:   number;
    autoHeight?:  boolean;
    placeholder?: string;
    disabled?:    boolean;
    className?:   string;
    style?:       React.CSSProperties;
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
    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    background?:      string;
    toolbarBackground?: string;
    borderColor?:     string;
    textColor?:       string;
    mutedTextColor?:  string;
    toolbarButtonHoverBackground?: string;
    toolbarButtonHoverColor?: string;
    primaryColor?:    string;
    primaryBackground?: string;
    editorTextBackground?: string;
    previewBackground?: string;
    fontSizeScale?: number;
    codeInlineBackground?: string;
    codeBlockBackground?: string;
    blockquoteBorderColor?: string;
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

export function MarkdownEditor({
    value,
    onChange,
    onAiComplete,
    minHeight   = 200,
    height,
    maxHeight,
    autoHeight  = true,
    placeholder = "在此输入内容...",
    disabled,
    className,
    style,
    textareaProps,
    onFocus,
    onBlur,
    mode        = "edit",
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
}: MarkdownEditorProps) {
    const { resolvedTheme } = useTheme();
    // Stable onChange wrapper — MDEditor won't see a new function reference each render
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const handleChange = useCallback((v: string | undefined) => { onChangeRef.current(v ?? ""); }, []);

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
    const colorVars: Record<string, string | undefined> = {
        "--md-bg":                         background,
        "--md-toolbar-bg":                 toolbarBackground,
        "--md-border":                     borderColor,
        "--md-text":                       textColor,
        "--md-text-muted":                 mutedTextColor,
        "--md-toolbar-hover-bg":           toolbarButtonHoverBackground,
        "--md-toolbar-hover-color":        toolbarButtonHoverColor,
        "--md-primary":                    primaryColor,
        "--md-primary-bg":                 primaryBackground,
        "--md-editor-text-bg":             editorTextBackground,
        "--md-preview-bg":                 previewBackground,
        "--md-font-size-scale":            fontSizeScale?.toString(),
        "--md-code-inline-bg":             codeInlineBackground,
        "--md-code-block-bg":              codeBlockBackground,
        "--md-blockquote-border":          blockquoteBorderColor,
        "--md-selection-bg":               selectionBackground,
    };
    const overrideStyle: React.CSSProperties = { ...style };
    for (const [k, v] of Object.entries(colorVars)) {
        if (v !== undefined) (overrideStyle as any)[k] = v;
    }

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
    }), [textareaProps, placeholder, disabled, onFocus, onBlur]);

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
            ref={wrapRef}
            className={["fc-md-wrap", className].filter(Boolean).join(" ")}
            style={overrideStyle}
            data-color-mode={resolvedTheme}
            data-auto-height={autoHeight ? "true" : "false"}
            data-mode={mode}
        >
            <MDEditor
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
}
