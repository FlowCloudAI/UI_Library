import { useState } from 'react'
import { Chat } from '../../../ui/src/index'

interface Message {
    id: string
    content: string
    type: 'user' | 'assistant' | 'system' | 'tool'
    timestamp: Date
    status?: 'sending' | 'sent' | 'error'
    toolName?: string
    toolResult?: any
}

export default function ChatDemo() {
    const [messages] = useState<Message[]>([{
        id: '1',
        content: '你好！我是 AI 助手，有什么可以帮助你的吗？',
        type: 'assistant',
        timestamp: new Date(),
    }])
    const [loading] = useState(false)

    return (
        <>
            <div className="demo-section">
                <h4>AI 对话</h4>
                <div style={{ height: '500px', maxWidth: '800px' }}>
                    <Chat
                        messages={messages}
                        title="AI 智能助手"
                        loading={loading}
                        showHeader
                        showFooter
                    />
                </div>
            </div>
        </>
    )
}