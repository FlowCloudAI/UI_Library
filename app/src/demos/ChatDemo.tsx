import {useState} from 'react'
import {Chat} from '../../../ui/src/index'

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
    const [messages] = useState<Message[]>([
        {
            id: '1',
            content: '你好！我是 AI 助手，有什么可以帮助你的吗？呜哩哇啦叽咕吧啦四大伊萨尼日利亚福利哇啦哦西吧！私密密西密西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西西',
            type: 'assistant',
            timestamp: new Date(),
        },
        {
            id: '2',
            content: '你瞎几把说啥呢？',
            type: 'user',
            timestamp: new Date(),
        },
    ])
    const [loading] = useState(false)

    return (
        <>
            <div className="demo-section">
                <h4>AI 对话</h4>
                <div style={{height: '500px', maxWidth: '800px'}}>
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