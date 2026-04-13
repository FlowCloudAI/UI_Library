import { useState, useEffect } from 'react'
import { MessageBox } from 'flowcloudai-ui'
import type { Message } from 'flowcloudai-ui'

export default function MessageBoxDemo() {
    const [messages] = useState<Message[]>([
        {
            id: 'msg-1',
            type: 'assistant',
            blocks: [
                {
                    id: 'block-1-1',
                    type: 'text',
                    content: '你好！我是流云 AI 助手，有什么可以帮助你的吗？'
                }
            ],
            status: 'completed',
            createdAt: Date.now()
        },
        {
            id: 'msg-2',
            type: 'user',
            blocks: [
                {
                    id: 'block-2-1',
                    type: 'text',
                    content: '请帮我解释一下 React 的虚拟列表是什么？'
                }
            ],
            status: 'completed',
            createdAt: Date.now() + 1000
        },
        {
            id: 'msg-3',
            type: 'assistant',
            blocks: [
                {
                    id: 'block-3-1',
                    type: 'reasoning',
                    content: '用户询问的是关于 React 虚拟列表的概念。\n\n虚拟列表是一种性能优化技术，主要用于处理大量数据列表的渲染问题。\n\n核心思想是只渲染视口内可见的项目，而不是渲染所有项目。这样可以显著减少 DOM 节点数量，提升页面性能。\n\n主要优势包括：\n- 减少内存占用\n- 提高滚动流畅度\n- 支持无限数据加载',
                    isStreaming: false
                },
                {
                    id: 'block-3-2',
                    type: 'text',
                    content: '虚拟列表（Virtual List）是一种性能优化技术，用于高效渲染大量数据的列表。\n\n## 核心原理\n\n只渲染**视口内可见**的项目，而非全部数据。通过计算滚动位置和可视区域，动态渲染当前可见的列表项。\n\n## 主要优势\n\n1. **减少 DOM 节点**：避免创建成千上万的 DOM 元素\n2. **降低内存占用**：只保留必要的数据在内存中\n3. **提升滚动性能**：保持 60fps 的流畅滚动体验\n\n## 典型应用场景\n\n- 聊天记录列表\n- 无限滚动的内容流\n- 大型数据表格\n- 联系人列表'
                }
            ],
            status: 'completed',
            createdAt: Date.now() + 2000
        },
        {
            id: 'msg-4',
            type: 'user',
            blocks: [
                {
                    id: 'block-4-1',
                    type: 'text',
                    content: '能给我一个工具调用的例子吗？'
                }
            ],
            status: 'completed',
            createdAt: Date.now() + 3000
        },
        {
            id: 'msg-5',
            type: 'assistant',
            blocks: [
                {
                    id: 'block-5-1',
                    type: 'tool_call',
                    index: 0,
                    name: 'getWeather',
                    arguments: '{"city": "北京", "date": "2024-01-01"}',
                    isStreaming: false
                },
                {
                    id: 'block-5-2',
                    type: 'tool_result',
                    index: 0,
                    content: { temperature: 5, condition: '晴', humidity: 30 },
                    isError: false
                },
                {
                    id: 'block-5-3',
                    type: 'text',
                    content: '已为您查询到北京的天气信息。'
                }
            ],
            status: 'completed',
            createdAt: Date.now() + 4000
        }
    ])

    // 模拟流式消息
    const [streamingMessage, setStreamingMessage] = useState<Message | null>(null)

    useEffect(() => {
        // 模拟流式输出
        const fullContent = '这是一个流式输出的示例。你会看到文字逐字出现，就像真实的 AI 对话一样。这种体验更加自然和流畅。'
        let currentIndex = 0
        
        const interval = setInterval(() => {
            if (currentIndex < fullContent.length) {
                currentIndex += 2
                setStreamingMessage({
                    id: 'streaming-msg',
                    type: 'assistant',
                    blocks: [
                        {
                            id: 'streaming-block',
                            type: 'text',
                            content: fullContent.slice(0, currentIndex),
                            isStreaming: true
                        }
                    ],
                    status: 'streaming',
                    createdAt: Date.now()
                })
            } else {
                clearInterval(interval)
                setStreamingMessage((prev: Message | null) => prev ? {
                    ...prev,
                    status: 'completed',
                    blocks: prev.blocks.map((block: any) => 
                        block.type === 'text' ? { ...block, isStreaming: false } : block
                    )
                } : null)
            }
        }, 50)

        return () => clearInterval(interval)
    }, [])

    const allMessages = streamingMessage 
        ? [...messages, streamingMessage]
        : messages

    return (
        <>
            <div className="demo-section">
                <div style={{ height: '600px', maxWidth: '900px' }}>
                    {allMessages.map((message) => (
                        <MessageBox
                            key={message.id}
                            message={message}
                            isVisible={true}
                            streamingCursor={message.status === 'streaming'}
                            onReasoningToggle={(expanded: boolean) => {
                                console.log('Reasoning section:', expanded ? 'expanded' : 'collapsed')
                            }}
                            onToolCallExpand={(index: number) => {
                                console.log('Tool call expanded:', index)
                            }}
                        />
                    ))}
                </div>
            </div>
        </>
    )
}