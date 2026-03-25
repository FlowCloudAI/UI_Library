import { useState } from 'react'
import { MarkdownEditor, useAlert } from 'flowcloudai-ui'

export function MarkdownEditorDemo() {
    const [content, setContent] = useState(
        "# 标题\n\n在此输入 **Markdown** 内容...\n\n- 列表项 1\n- 列表项 2\n\n> 引用文本\n\n```ts\nconst hello = 'world'\n```"
    )
    const { showAlert } = useAlert()

    return (
        <>
            <div className="demo-section">
                <h4>基础编辑器</h4>
                <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    minHeight={320}
                    onAiComplete={() => showAlert("AI 补全占位（待接入）", "info")}
                />
            </div>
        </>
    )
}
