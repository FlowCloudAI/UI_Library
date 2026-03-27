import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import SmartMessage, { type MessageRole } from '../SmartMessage/SmartMessage';
import './Chat.css';

// 消息接口
export interface Message {
    id: string;
    content: string;
    type: MessageRole;
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
    toolName?: string;
    toolResult?: any;
}

// 对话历史接口
export interface Conversation {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: Date;
    messages: Message[];
}

// Chat 组件 Props
export interface ChatProps {
    messages?: Message[];
    title?: string;
    loading?: boolean;
    conversations?: Conversation[];
    currentConversationId?: string;
    emptyText?: string;
    newConversationText?: string;
    historyTitle?: string;
    showHistoryButton?: boolean;
    showMinimizeButton?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    autoScroll?: boolean;
    onSwitchConversation?: (conversationId: string) => void;
    onNewConversation?: () => void;
    onDeleteConversation?: (conversationId: string) => void;
    onMinimize?: () => void;
    onRestore?: () => void;
    onMessageCopy?: (message: Message) => void;
    className?: string;
    style?: React.CSSProperties;
    headerClassName?: string;
    headerStyle?: React.CSSProperties;
    messagesClassName?: string;
    messagesStyle?: React.CSSProperties;
    bubbleClassName?: string;
    height?: string;
    width?: string;
}

export const Chat: React.FC<ChatProps> = ({
                                              messages = [],
                                              title = "流云AI",
                                              loading = false,
                                              conversations = [],
                                              currentConversationId,
                                              emptyText = "暂无历史对话",
                                              newConversationText = "新建对话",
                                              historyTitle = "历史对话",
                                              showHistoryButton = true,
                                              showMinimizeButton = true,
                                              showHeader = true,
                                              showFooter = false,
                                              autoScroll = true,
                                              onSwitchConversation,
                                              onNewConversation,
                                              onDeleteConversation,
                                              onMinimize,
                                              onRestore,
                                              onMessageCopy,
                                              className = "",
                                              style = {},
                                              headerClassName = "",
                                              headerStyle = {},
                                              messagesClassName = "",
                                              messagesStyle = {},
                                              bubbleClassName = "",
                                              height = "600px",
                                              width,
                                          }) => {
    const [showHistory, setShowHistory] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const historyPanelRef = useRef<HTMLDivElement>(null);

    const currentConversation = useMemo(() =>
            conversations.find(c => c.id === currentConversationId),
        [conversations, currentConversationId]
    );
    const currentTitle = currentConversation?.title || title;

    useEffect(() => {
        if (autoScroll && messagesContainerRef.current && !showHistory && !isMinimized) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, loading, showHistory, isMinimized, autoScroll]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showHistory && historyPanelRef.current && !historyPanelRef.current.contains(event.target as Node)) {
                setShowHistory(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showHistory]);

    const handleDeleteConversation = useCallback((conversationId: string) => {
        onDeleteConversation?.(conversationId);
    }, [onDeleteConversation]);

    const handleMinimize = useCallback(() => {
        setIsMinimized(true);
        onMinimize?.();
    }, [onMinimize]);

    const handleRestore = useCallback(() => {
        setIsMinimized(false);
        onRestore?.();
    }, [onRestore]);

    const handleCopy = useCallback((content: string) => {
        const message = messages.find(m => m.content === content);
        if (message) {
            onMessageCopy?.(message);
        }
    }, [messages, onMessageCopy]);

    const containerStyle = useMemo(() => ({
        height: height,
        width: width,
        ...style
    }), [height, width, style]);

    // 渲染单条消息（带外部复制按钮）
    const renderMessageWithCopy = (message: Message) => {
        const isUser = message.type === 'user';

        return (
            <div
                key={message.id}
                className={`message-wrapper message-wrapper--${isUser ? 'user' : 'assistant'}`}
            >
                {/* 消息气泡 - 隐藏内部复制按钮 */}
                <SmartMessage
                    id={message.id}
                    content={message.content}
                    role={message.type}
                    timestamp={message.timestamp}
                    status={message.status}
                    toolName={message.toolName}
                    toolResult={message.toolResult}
                    onCopy={handleCopy}
                    className={bubbleClassName}
                    hideCopyButton={true}
                />

                {/* 外部复制按钮 */}
                <div className={`message-copy-wrapper message-copy-wrapper--${isUser ? 'user' : 'assistant'}`}>
                    <button
                        className="message-copy-btn"
                        onClick={() => handleCopy(message.content)}
                        title="复制内容"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"
                                  fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        );
    };

    if (isMinimized) {
        return (
            <div className={`chat-container-minimized ${className}`} style={containerStyle}>
                <button className="restore-btn-only" onClick={handleRestore} title="展开">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <div className={`chat-container ${className}`} style={containerStyle}>
            {showHeader && (
                <div className={`chat-header ${headerClassName}`} style={headerStyle}>
                    <div className="chat-title">{currentTitle}</div>
                    <div className="chat-header-actions">
                        {showHistoryButton && (
                            <button className="history-btn" onClick={() => setShowHistory(!showHistory)} title="历史对话">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                            </button>
                        )}
                        {showMinimizeButton && (
                            <button className="minimize-btn" onClick={handleMinimize} title="最小化">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className={`chat-messages ${messagesClassName}`} ref={messagesContainerRef} style={messagesStyle}>
                {messages.map(message => renderMessageWithCopy(message))}
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

            {showHistory && (
                <div className="history-panel" ref={historyPanelRef}>
                    <div className="history-header">
                        <h3>{historyTitle}</h3>
                        <button className="close-history-btn" onClick={() => setShowHistory(false)}>✕</button>
                    </div>
                    <div className="history-list">
                        <button className="new-conversation-btn-large" onClick={() => { onNewConversation?.(); setShowHistory(false); }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span>{newConversationText}</span>
                        </button>
                        {conversations.length === 0 ? (
                            <div className="empty-history"><p>{emptyText}</p></div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`history-item ${currentConversationId === conv.id ? 'active' : ''}`}
                                    onClick={() => {
                                        onSwitchConversation?.(conv.id);
                                        setShowHistory(false);
                                    }}
                                >
                                    <div className="history-item-content">
                                        <div className="history-item-title">
                                            <span>{conv.title}</span>
                                        </div>
                                        <div className="history-item-preview">{conv.lastMessage}</div>
                                        <div className="history-item-meta">
                                            <span>{new Date(conv.timestamp).toLocaleDateString()}</span>
                                            <span>{conv.messages.length}条消息</span>
                                        </div>
                                    </div>
                                    <div className="history-item-actions">
                                        <button
                                            className="delete-conversation-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteConversation(conv.id);
                                            }}
                                            title="删除对话"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                <path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6" stroke="currentColor" strokeWidth="2"/>
                                                <path d="M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke="currentColor" strokeWidth="2"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;