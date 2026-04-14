import {useRef, useState} from 'react'
import {Button, ButtonGroup, MarkdownEditor, type MarkdownEditorRef, useAlert} from 'flowcloudai-ui'

type Mode = 'edit' | 'preview'

const MODES: { value: Mode; label: string }[] = [
    { value: 'edit',    label: '编辑' },
    { value: 'preview', label: '预览' },
]

const INITIAL_CONTENT =
    "# 标题\n\n在此输入 **Markdown** 内容...\n\n- 列表项 1\n- 列表项 2\n\n> 引用文本\n\n```ts\nconst hello = 'world'\n```"

export function MarkdownEditorDemo() {
    const [content, setContent] = useState(INITIAL_CONTENT)
    const [mode, setMode] = useState<Mode>('edit')
    const [splitView, setSplitView] = useState(true)
    const [fontSizeScale, setFontSizeScale] = useState(1.1)
    const { showAlert } = useAlert()
    const editorRef = useRef<MarkdownEditorRef>(null)

    const handleUndo = () => {
        const ta = editorRef.current?.getTextareaElement()
        if (ta) {
            ta.focus()
            // 演示：通过 document.execCommand 触发一次原生 undo（实际项目中可替换为自定义历史栈）
            document.execCommand('undo', false)
            showAlert('已触发原生 undo（演示）', 'info')
        }
    }

    return (
        <>
            <div className="demo-section">
                <h4>Markdown 编辑器扩展示例</h4>
                <div className="demo-row" style={{ marginBottom: 12 }}>
                    <ButtonGroup>
                        {MODES.map(m => (
                            <Button
                                key={m.value}
                                variant={mode === m.value ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setMode(m.value)}
                            >
                                {m.label}
                            </Button>
                        ))}
                        <Button
                            variant={splitView ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setSplitView(v => !v)}
                        >
                            {splitView ? '关闭双栏' : '开启双栏'}
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setFontSizeScale(v => Math.max(0.9, Number((v - 0.1).toFixed(1))))}
                        >
                            缩小字号
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setFontSizeScale(v => Math.min(1.6, Number((v + 0.1).toFixed(1))))}
                        >
                            放大字号
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleUndo}
                        >
                            测试 ref.undo
                        </Button>
                    </ButtonGroup>
                </div>
                <div className="demo-row" style={{ marginBottom: 12, color: 'var(--fc-color-text-secondary)' }}>
                    当前字号缩放：{fontSizeScale.toFixed(1)}x
                </div>
                <MarkdownEditor
                    ref={editorRef}
                    value={content}
                    onChange={setContent}
                    mode={mode}
                    splitView={splitView}
                    onSplitChange={setSplitView}
                    showSplitToggle={mode === 'edit'}
                    showAiButton
                    autoHeight
                    minHeight={500}
                    className="markdown-editor-demo"
                    style={{ marginTop: 8 }}
                    previewOptions={{
                        wrapperElement: {
                            'data-color-mode': 'light',
                        },
                    }}
                    onFocus={() => console.log('MarkdownEditor focus')}
                    onBlur={() => console.log('MarkdownEditor blur')}
                    onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                            e.preventDefault()
                            console.log('拦截 Ctrl+Z，可接入自定义历史管理')
                        }
                    }}
                    onAiComplete={() => showAlert("AI 补全占位（待接入）", "info")}
                    background={"#0f172a"}
                    toolbarBackground="#111827"
                    borderColor="#334155"
                    textColor="#e5eefb"
                    mutedTextColor="#94a3b8"
                    toolbarButtonHoverBackground="rgba(59, 130, 246, 0.18)"
                    toolbarButtonHoverColor="#f8fafc"
                    primaryColor="#38bdf8"
                    primaryBackground="rgba(56, 189, 248, 0.16)"
                    editorTextBackground="#0f172a"
                    previewBackground="#0b1120"
                    fontSizeScale={fontSizeScale}
                    codeInlineBackground="rgba(148, 163, 184, 0.16)"
                    codeBlockBackground="#020617"
                    blockquoteBorderColor="#38bdf8"
                    selectionBackground="rgba(56, 189, 248, 0.28)"
                />
            </div>
        </>
    )
}
