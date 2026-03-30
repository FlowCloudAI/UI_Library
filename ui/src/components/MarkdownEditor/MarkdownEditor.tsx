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
     * - edit:    纯编辑（默认）
     * - preview: 纯预览，只读渲染 Markdown
     * - live:    左编辑右预览双栏
     */
    mode?: 'edit' | 'preview' | 'live';
    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    background?:      string;
    toolbarBackground?: string;
    borderColor?:     string;
}

/** 精简工具栏：只保留常用排版命令 */
const TOOLBAR_COMMANDS: ICommand[] = [
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.divider,
    commands.title1,
    commands.title2,
    commands.title3,
    commands.divider,
    commands.quote,
    commands.code,
    commands.codeBlock,
    commands.divider,
    commands.link,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.hr,
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

    // --- AI 补全按钮（占位：有回调就显示） ---
    const aiCommand: ICommand = {
        name:        "ai-complete",
        keyCommand:  "ai-complete",
        buttonProps: { "aria-label": "AI 补全", className: "fc-md-ai-btn" },
        icon:        <span>AI 补全</span>,
        execute:     () => onAiComplete?.(),
    };

    const extraCommands: ICommand[] = onAiComplete
        ? [commands.divider, aiCommand, commands.fullscreen]
        : [commands.fullscreen];

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
                preview={mode}
                visibleDragbar={false}
                textareaProps={{ placeholder }}
            />
        </div>
    );
}
