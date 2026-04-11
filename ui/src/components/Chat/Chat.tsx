import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import './Chat.css';

export interface Message {
    id: string;
    content: string;
    type: 'user' | 'assistant' | 'system' | 'tool';
    timestamp?: Date;
    status?: 'sending' | 'sent' | 'error';
    toolName?: string;
    toolResult?: any;
}

export interface ChatProps {
    messages?: Message[];
    title?: string;
    loading?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    autoScroll?: boolean;
    className?: string;
    style?: React.CSSProperties;
    headerClassName?: string;
    headerStyle?: React.CSSProperties;
    messagesClassName?: string;
    messagesStyle?: React.CSSProperties;
    bubbleClassName?: string;
    height?: string;
    width?: string;
    onCopy?: (content: string, messageId: string) => void;
}

export const Chat: React.FC<ChatProps> = ({
                                              messages = [],
                                              title = "流云AI",
                                              loading = false,
                                              showHeader = true,
                                              showFooter = false,
                                              autoScroll = true,
                                              className = "",
                                              style = {},
                                              headerClassName = "",
                                              headerStyle = {},
                                              messagesClassName = "",
                                              messagesStyle = {},
                                              bubbleClassName = "",
                                              height = "600px",
                                              width,
                                              onCopy,
                                          }) => {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    useEffect(() => {
        if (autoScroll && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, loading, autoScroll]);

    const containerStyle = useMemo(() => ({
        height,
        width,
        ...style
    }), [height, width, style]);

    const handleCopy = useCallback(async (content: string, messageId: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);
            onCopy?.(content, messageId);
            setTimeout(() => {
                setCopiedMessageId(null);
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, [onCopy]);

    // 复制按钮组件 - 纯图标无文字，左右对齐区分
    const CopyButton = ({ content, messageId, align }: { content: string; messageId: string; align: 'left' | 'right' }) => {
        const isCopied = copiedMessageId === messageId;

        return (
            <button
                className={`chat-copy-btn chat-copy-btn--${align} ${isCopied ? 'is-copied' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(content, messageId);
                }}
                title={isCopied ? '已复制' : '复制内容'}
                aria-label={isCopied ? '已复制' : '复制内容'}
            >
                {isCopied ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                )}
            </button>
        );
    };

    const renderSystemMessage = (msg: Message) => (
        <div key={msg.id} className="chat-message chat-message--system">
            <div className="chat-message-bubble chat-message-bubble--system">
                {msg.content}
            </div>
        </div>
    );

    const renderToolMessage = (msg: Message) => (
        <div key={msg.id} className="chat-message chat-message--tool">
            {msg.toolName && (
                <div className="chat-message-tool-info">
                    <span className="chat-message-tool-icon">🔧</span>
                    <span className="chat-message-tool-name">{msg.toolName}</span>
                </div>
            )}
            <div className="chat-message-bubble chat-message-bubble--tool">
                <pre className="chat-message-tool-result">
                    {(() => {
                        try {
                            return JSON.stringify(msg.toolResult || msg.content, null, 2);
                        } catch {
                            return '[序列化失败]';
                        }
                    })()}
                </pre>
            </div>
        </div>
    );

    const renderUserAssistantMessage = (msg: Message) => {
        const isUser = msg.type === 'user';
        const btnAlign = isUser ? 'right' : 'left';

        return (
            <div
                key={msg.id}
                className={`chat-message chat-message--${isUser ? 'user' : 'assistant'}`}
            >
                <div className={`chat-message-bubble chat-message-bubble--${isUser ? 'user' : 'assistant'} ${bubbleClassName}`}>
                    <div className="chat-message-text">{msg.content}</div>
                    {msg.status === 'sending' && (
                        <span className="chat-message-status sending">发送中...</span>
                    )}
                    {msg.status === 'error' && (
                        <span className="chat-message-status error">发送失败</span>
                    )}
                </div>
                <CopyButton
                    content={msg.content}
                    messageId={msg.id}
                    align={btnAlign}
                />
            </div>
        );
    };

    const renderMessage = (msg: Message) => {
        switch (msg.type) {
            case 'system': return renderSystemMessage(msg);
            case 'tool': return renderToolMessage(msg);
            default: return renderUserAssistantMessage(msg);
        }
    };

    return (
        <div className="chat-frame" style={{ height, width }}>
            <div className={`chat-container ${className}`} style={containerStyle}>
                {showHeader && (
                    <div className={`chat-header ${headerClassName}`} style={headerStyle}>
                        <div className="chat-title">{title}</div>
                    </div>
                )}

                <div
                    className={`chat-messages ${messagesClassName}`}
                    ref={messagesContainerRef}
                    style={messagesStyle}
                >
                    {messages.map(renderMessage)}
                    {loading && (
                        <div className="typing-wrapper">
                            <div className="typing-indicator">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {showFooter && <div className="chat-footer" />}
            </div>
        </div>
    );
};

export default Chat;