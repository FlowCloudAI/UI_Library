import { useState } from 'react'
import { Chat, Button, useAlert } from 'flowcloudai-ui'

interface Message {
    id: string
    content: string
    type: 'user' | 'assistant' | 'system'
    timestamp: Date
    status?: 'sending' | 'sent' | 'error'
}

export function ChatDemo() {
    const { showAlert } = useAlert()
    const [messages, setMessages] = useState<Message[]>([{
        id: '1',
        content: '你好！我是 AI 助手，有什么可以帮助你的吗？',
        type: 'assistant',
        timestamp: new Date(),
    }])
    const [loading, setLoading] = useState(false)

    const handleSend = async (content: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            content,
            type: 'user',
            timestamp: new Date(),
            status: 'sending',
        }
        setMessages(prev => [...prev, userMsg])
        setLoading(true)

        await new Promise(r => setTimeout(r, 1500))

        setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, status: 'sent' } : m))
        setMessages(prev => [...prev, {
            id: String(Date.now() + 1),
            content: `收到："${content}"。这是模拟回复。`,
            type: 'assistant',
            timestamp: new Date(),
        }])
        setLoading(false)
        await showAlert("消息已发送", "success", "toast", 2000)
    }

    const handleClear = async () => {
        const res = await showAlert("确定清空聊天记录？", "warning", "confirm")
        if (res === "yes") {
            setMessages([{
                id: Date.now().toString(),
                content: '聊天记录已清空。',
                type: 'assistant',
                timestamp: new Date(),
            }])
            await showAlert("已清空", "success", "toast", 2000)
        }
    }

    return (
        <>
            <div className="demo-section">
                <h4>AI 对话</h4>
                <div style={{ height: 500, maxWidth: 800 }}>
                    <Chat
                        messages={messages}
                        onSendMessage={handleSend}
                        title="AI 智能助手"
                        placeholder="输入你的问题，按 Enter 发送..."
                        loading={loading}
                        userName="我"
                        assistantName="AI助手"
                        maxInputLength={2000}
                        autoFocus
                        showHeader
                        showFooter
                    />
                </div>
                <div style={{ marginTop: 10 }}>
                    <Button size="sm" onClick={handleClear}>清空记录</Button>
                </div>
            </div>
        </>
    )
}
