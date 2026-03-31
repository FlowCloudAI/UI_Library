import React, { useState } from "react";
import "./MarkdownEditor.css";
import MDEditor, { commands } from "@uiw/react-md-editor";
import type { ICommand } from "@uiw/react-md-editor";
import { useTheme } from "../../ThemeProvider";

export interface MarkdownEditorProps {
    value:        string;
    onChange:     (v: string) => void;
    /** AI 补全回调，传入时显示 AI 按钮，不传则隐藏 */
    onAiComplete?: () => void;
    minHeight?:   number;
    placeholder?: string;
    /**
     * 显示模式
     * - edit:    编辑模式（工具栏含双栏切换按钮）
     * - preview: 纯预览，只读渲染 Markdown，隐藏工具栏
     * @default 'edit'
     */
    mode?: 'edit' | 'preview';
    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    background?:      string;
    toolbarBackground?: string;
    borderColor?:     string;
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
    withTitle(commands.title1,               '一级标题'),
    withTitle(commands.title2,               '二级标题'),
    withTitle(commands.title3,               '三级标题'),
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
    placeholder = "在此输入内容...",
    mode        = "edit",
    background,
    toolbarBackground,
    borderColor,
}: MarkdownEditorProps) {
    const { resolvedTheme } = useTheme();
    const [showSplit, setShowSplit] = useState(false);

    // --- CSS 变量注入 ---
    const colorVars: Record<string, string | undefined> = {
        "--md-bg":         background,
        "--md-toolbar-bg": toolbarBackground,
        "--md-border":     borderColor,
    };
    const overrideStyle: React.CSSProperties = {};
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

    // --- 双栏切换按钮（内置，对外不暴露） ---
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

    const extraCommands: ICommand[] = [
        splitCommand,
        ...(onAiComplete ? [commands.divider, aiCommand] : []),
        withTitle(commands.fullscreen, '全屏'),
    ];

    // 实际传给 MDEditor 的 preview 值
    const editorPreview = mode === 'preview' ? 'preview' : showSplit ? 'live' : 'edit';

    return (
        <div
            className="fc-md-wrap"
            style={overrideStyle}
            data-color-mode={resolvedTheme}
        >
            <MDEditor
                value={value}
                onChange={v => onChange(v ?? "")}
                commands={TOOLBAR_COMMANDS}
                extraCommands={extraCommands}
                height={minHeight}
                preview={editorPreview}
                hideToolbar={mode === 'preview'}
                visibleDragbar={false}
                textareaProps={{ placeholder }}
            />
        </div>
    );
}
