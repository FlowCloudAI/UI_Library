import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Chat.css';

// 对话历史接口
export interface Conversation {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: Date;
    messages: Message[];
}

// 消息类型定义
export interface Message {
    id: string;
    content: string;
    type: 'user' | 'assistant' | 'system';
    timestamp: Date;
    status?: 'sending' | 'sent' | 'error';
}

// Chat 组件 Props
export interface ChatProps {
    messages?: Message[];
    title?: string;
    height?: string;
    loading?: boolean;
    userName?: string;
    assistantName?: string;
    enableCopy?: boolean;
    conversations?: Conversation[];
    currentConversationId?: string;
    onSwitchConversation?: (conversationId: string) => void;
    onNewConversation?: () => void;
    onDeleteConversation?: (conversationId: string) => void;
}

export const Chat: React.FC<ChatProps> = ({
                                              messages = [],
                                              title = "AI 助手",
                                              height = "600px",
                                              loading = false,
                                              userName = "我",
                                              assistantName = "AI助手",
                                              enableCopy = true,
                                              conversations = [],
                                              currentConversationId,
                                              onSwitchConversation,
                                              onNewConversation,
                                              onDeleteConversation
                                          }) => {
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [copyError, setCopyError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const historyPanelRef = useRef<HTMLDivElement>(null);

    // 获取当前对话
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    const currentTitle = currentConversation?.title || title;

    // 自动滚动到底部
    useEffect(() => {
        if (messagesContainerRef.current && !showHistory && !isMinimized) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, loading, showHistory, isMinimized]);

    // 清除错误提示
    useEffect(() => {
        if (copyError) {
            const timer = setTimeout(() => setCopyError(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [copyError]);

    // 点击外部关闭历史面板
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showHistory && historyPanelRef.current && !historyPanelRef.current.contains(event.target as Node)) {
                setShowHistory(false);
                setDeleteConfirmId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showHistory]);

    // 复制消息
    const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
        if (!navigator.clipboard) {
            setCopyError('当前浏览器不支持复制功能');
            return;
        }
        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch {
            setCopyError('复制失败，请重试');
        }
    }, []);

    // 处理删除确认
    const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        setDeleteConfirmId(conversationId);
    };

    const handleConfirmDelete = (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        onDeleteConversation?.(conversationId);
        setDeleteConfirmId(null);
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmId(null);
    };

    // 渲染消息
    const renderMessage = (message: Message) => {
        const isUser = message.type === 'user';
        const isSystem = message.type === 'system';
        const isCopied = copiedMessageId === message.id;

        if (isSystem) {
            return (
                <div key={message.id} className="chat-message-system">
                    <span className="system-content">{message.content}</span>
                </div>
            );
        }

        return (
            <div key={message.id} className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
                <div className="message-content-wrapper">
                    <div className="message-header">
                        <span className="message-sender">{isUser ? userName : assistantName}</span>
                    </div>
                    <div className="message-bubble">
                        <div className="message-text">{message.content}</div>
                        {enableCopy && (
                            <button
                                className={`copy-btn ${isCopied ? 'copied' : ''}`}
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                title={isCopied ? "已复制" : "复制内容"}
                            >
                                {isCopied ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <span>已复制</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                        <span>复制</span>
                                    </>
                                )}
                            </button>
                        )}
                        {message.status === 'sending' && <span className="message-status sending">发送中...</span>}
                        {message.status === 'error' && <span className="message-status error">发送失败</span>}
                    </div>
                </div>
            </div>
        );
    };

    // 最小化模式
    if (isMinimized) {
        return (
            <div className="chat-container-minimized">
                <button
                    className="restore-btn-only"
                    onClick={() => setIsMinimized(false)}
                    title="展开"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <div className="chat-container" style={{ height }}>
            <div className="chat-header">
                <div className="chat-title">{currentTitle}</div>
                <div className="chat-header-actions">
                    <button
                        className="history-btn"
                        onClick={() => setShowHistory(!showHistory)}
                        title="历史对话"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 4V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                    <button
                        className="minimize-btn"
                        onClick={() => setIsMinimized(true)}
                        title="最小化"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="chat-messages" ref={messagesContainerRef}>
                {messages.map(renderMessage)}
                {loading && (
                    <div className="chat-message assistant">
                        <div className="message-content-wrapper">
                            <div className="message-header">
                                <span className="message-sender">{assistantName}</span>
                            </div>
                            <div className="message-bubble">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 历史对话面板 */}
            {showHistory && (
                <div className="history-panel" ref={historyPanelRef}>
                    <div className="history-header">
                        <h3>历史对话</h3>
                        <button
                            className="close-history-btn"
                            onClick={() => setShowHistory(false)}
                        >
                            ✕
                        </button>
                    </div>
                    <div className="history-list">
                        <button
                            className="new-conversation-btn-large"
                            onClick={() => {
                                onNewConversation?.();
                                setShowHistory(false);
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span>新建对话</span>
                        </button>

                        {conversations.length === 0 ? (
                            <div className="empty-history">
                                <p>暂无历史对话</p>
                                <p className="empty-hint">点击上方按钮开始新对话</p>
                            </div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`history-item ${currentConversationId === conv.id ? 'active' : ''}`}
                                    onClick={() => {
                                        onSwitchConversation?.(conv.id);
                                        setShowHistory(false);
                                        setDeleteConfirmId(null);
                                    }}
                                >
                                    <div className="history-item-content">
                                        <div className="history-item-title">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="1.5"/>
                                                <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg>
                                            <span>{conv.title}</span>
                                        </div>
                                        <div className="history-item-preview">
                                            {conv.lastMessage}
                                        </div>
                                        <div className="history-item-meta">
                                            <span className="history-time">{new Date(conv.timestamp).toLocaleDateString()}</span>
                                            <span className="history-count">{conv.messages.length}条消息</span>
                                        </div>
                                    </div>
                                    <div className="history-item-actions">
                                        {deleteConfirmId === conv.id ? (
                                            <div className="delete-confirm">
                                                <button
                                                    className="confirm-delete"
                                                    onClick={(e) => handleConfirmDelete(e, conv.id)}
                                                    title="确认删除"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                                <button
                                                    className="cancel-delete"
                                                    onClick={handleCancelDelete}
                                                    title="取消"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="delete-conversation-btn"
                                                onClick={(e) => handleDeleteClick(e, conv.id)}
                                                title="删除对话"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                                    <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                    <path d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6" stroke="currentColor" strokeWidth="2"/>
                                                    <path d="M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke="currentColor" strokeWidth="2"/>
                                                    <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                    <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {copyError && <div className="copy-error-toast">{copyError}</div>}
        </div>
    );
};

export default Chat;