import { SmartMessage } from 'flowcloudai-ui'

export function SmartMessageDemo() {
    const handleCopy = (content: string, role: string) => {
        console.log(`复制了 ${role} 消息:`, content)
    }

    return (
        <>
            <div className="demo-section">
                <h4>消息类型</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <SmartMessage
                        id="demo-user"
                        content="这是一条用户消息，带有复制按钮，右对齐显示"
                        role="user"
                        timestamp={new Date()}
                        status="sent"
                        onCopy={handleCopy}
                    />

                    <SmartMessage
                        id="demo-assistant"
                        content="这是一条流云AI消息，带有复制按钮，左对齐显示"
                        role="assistant"
                        timestamp={new Date()}
                        status="sent"
                        onCopy={handleCopy}
                    />

                    <SmartMessage
                        id="demo-system"
                        content="系统消息：连接已建立，居中显示，灰色样式"
                        role="system"
                        timestamp={new Date()}
                    />

                    <SmartMessage
                        id="demo-tool"
                        content='{"city": "北京", "date": "2024-01-15"}'
                        role="tool"
                        timestamp={new Date()}
                        toolName="weather_query"
                        toolResult={{
                            temperature: 25,
                            weather: "晴",
                            humidity: "45%"
                        }}
                        onCopy={handleCopy}
                    />
                </div>
            </div>

            <div className="demo-section">
                <h4>消息状态</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <SmartMessage
                        id="demo-sending"
                        content="消息发送中..."
                        role="user"
                        timestamp={new Date()}
                        status="sending"
                        onCopy={handleCopy}
                    />

                    <SmartMessage
                        id="demo-error"
                        content="消息发送失败，请重试"
                        role="user"
                        timestamp={new Date()}
                        status="error"
                        onCopy={handleCopy}
                    />
                </div>
            </div>
        </>
    )
}