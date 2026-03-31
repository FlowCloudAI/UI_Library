import { useState } from 'react'
import { Button, ButtonGroup, MarkdownEditor, useAlert } from 'flowcloudai-ui'

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
    const { showAlert } = useAlert()

    return (
        <>
            <div className="demo-section">
                <h4>编辑 / 预览模式</h4>
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
                    </ButtonGroup>
                </div>
                <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    mode={mode}
                    minHeight={320}
                    onAiComplete={() => showAlert("AI 补全占位（待接入）", "info")}
                />
            </div>
        </>
    )
}
