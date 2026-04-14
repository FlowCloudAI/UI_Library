import React, { useState, useEffect } from 'react'
import { MessageBox } from 'flowcloudai-ui'

export default function MessageBoxDemo() {
    const [messages] = useState<Array<{
        id: string
        role: 'user' | 'assistant' | 'system'
        content: string
        streaming?: boolean
        children?: React.ReactNode
    }>>([
        {
            id: 'msg-1',
            role: 'assistant',
            content: '你好！我是流云 AI 助手，有什么可以帮助你的吗？'
        },
        {
            id: 'msg-2',
            role: 'user',
            content: '请帮我解释一下 React 的虚拟列表是什么？'
        },
        {
            id: 'msg-3',
            role: 'assistant',
            content: '虚拟列表（Virtual List）是一种性能优化技术，用于高效渲染大量数据的列表。\n\n核心原理是只渲染视口内可见的项目，而非全部数据。这样可以显著减少 DOM 节点数量，提升页面性能。'
        }
    ])

    // 模拟流式消息
    const [streamingContent, setStreamingContent] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)

    useEffect(() => {
        // 模拟流式输出
        const fullContent = '这是一个流式输出的示例。你会看到文字逐字出现，就像真实的 AI 对话一样。这种体验更加自然和流畅。'
        let currentIndex = 0
        setIsStreaming(true)
        
        const interval = setInterval(() => {
            if (currentIndex < fullContent.length) {
                currentIndex += 2
                setStreamingContent(fullContent.slice(0, currentIndex))
            } else {
                clearInterval(interval)
                setIsStreaming(false)
            }
        }, 50)

        return () => clearInterval(interval)
    }, [])

    return (
        <>
            <div className="demo-section">
                <div style={{ height: '600px', maxWidth: '900px' }}>
                    <MessageBox>
                        {messages.map((message) => (
                            <MessageBox.Item
                                key={message.id}
                                role={message.role}
                                content={message.content}
                            />
                        ))}
                        {streamingContent && (
                            <MessageBox.Item
                                role="assistant"
                                content={streamingContent}
                                streaming={isStreaming}
                            >
                                <div className="tool-calls">
                                    {/* 工具调用等内容 */}
                                </div>
                            </MessageBox.Item>
                        )}
                    </MessageBox>
                </div>
            </div>
        </>
    )
}