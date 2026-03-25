import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
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

// 样式配置接口
export interface ChatTheme {
    // 颜色配置
    primaryColor?: string;
    primaryGradient?: string;
    userBubbleColor?: string;
    userBubbleGradient?: string;
    assistantBubbleColor?: string;
    headerBgColor?: string;
    headerBorderColor?: string;

    // 尺寸配置
    borderRadius?: string | number;
    headerHeight?: string | number;
    messageSpacing?: string | number;
    fontSize?: string | number;
    titleFontSize?: string | number;

    // 其他配置
    showTime?: boolean;
    showHeader?: boolean;
    showBorder?: boolean;
    shadow?: string;
}

// Chat 组件 Props
export interface ChatProps {
    // 数据
    messages?: Message[];
    title?: string;
    loading?: boolean;
    conversations?: Conversation[];
    currentConversationId?: string;

    // 文本配置
    userName?: string;
    assistantName?: string;
    emptyText?: string;
    newConversationText?: string;
    historyTitle?: string;

    // 功能开关
    enableCopy?: boolean;
    showHistoryButton?: boolean;
    showMinimizeButton?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    autoScroll?: boolean;

    // 事件回调
    onSwitchConversation?: (conversationId: string) => void;
    onNewConversation?: () => void;
    onDeleteConversation?: (conversationId: string) => void;
    onMinimize?: () => void;
    onRestore?: () => void;
    onMessageCopy?: (message: Message) => void;

    // 样式自定义
    className?: string;
    style?: React.CSSProperties;
    headerClassName?: string;
    headerStyle?: React.CSSProperties;
    messagesClassName?: string;
    messagesStyle?: React.CSSProperties;
    bubbleClassName?: string;

    // 主题配置
    theme?: ChatTheme;

    // 尺寸
    height?: string | number;
    width?: string | number;
}

// 默认主题
const defaultTheme: ChatTheme = {
    primaryColor: '#667eea',
    primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    userBubbleGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    assistantBubbleColor: 'var(--fc-color-bg-tertiary)',
    borderRadius: 12,
    fontSize: 14,
    titleFontSize: 16,
    showTime: false,
    showBorder: true,
    shadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
};

// 消息项组件 - 使用 memo 优化性能
const MessageItem = memo(({
                              message,
                              isUser,
                              userName,
                              assistantName,
                              enableCopy,
                              onCopy,
                              bubbleClassName
                          }: any) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            onCopy?.(message);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    if (message.type === 'system') {
        return (
            <div className="chat-message-system">
                <span className="system-content">{message.content}</span>
            </div>
        );
    }

    return (
        <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
            <div className="message-content-wrapper">
                <div className="message-header">
                    <span className="message-sender">{isUser ? userName : assistantName}</span>
                </div>
                <div className={`message-bubble ${bubbleClassName || ''}`}>
                    <div className="message-text">{message.content}</div>
                    {enableCopy && (
                        <button
                            className={`copy-btn ${copied ? 'copied' : ''}`}
                            onClick={handleCopy}
                            title={copied ? "已复制" : "复制内容"}
                        >
                            {copied ? (
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
});

MessageItem.displayName = 'MessageItem';

export const Chat: React.FC<ChatProps> = ({
                                              // 数据
                                              messages = [],
                                              title = "AI 助手",
                                              loading = false,
                                              conversations = [],
                                              currentConversationId,

                                              // 文本配置
                                              userName = "我",
                                              assistantName = "AI助手",
                                              emptyText = "暂无历史对话",
                                              newConversationText = "新建对话",
                                              historyTitle = "历史对话",

                                              // 功能开关
                                              enableCopy = true,
                                              showHistoryButton = true,
                                              showMinimizeButton = true,
                                              showHeader = true,
                                              showFooter = false,
                                              autoScroll = true,

                                              // 事件回调
                                              onSwitchConversation,
                                              onNewConversation,
                                              onDeleteConversation,
                                              onMinimize,
                                              onRestore,
                                              onMessageCopy,

                                              // 样式自定义
                                              className = "",
                                              style = {},
                                              headerClassName = "",
                                              headerStyle = {},
                                              messagesClassName = "",
                                              messagesStyle = {},
                                              bubbleClassName = "",

                                              // 主题配置
                                              theme = {},

                                              // 尺寸
                                              height = "600px",
                                              width,
                                          }) => {
    const [showHistory, setShowHistory] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const historyPanelRef = useRef<HTMLDivElement>(null);

    // 合并主题
    const mergedTheme = useMemo(() => ({ ...defaultTheme, ...theme }), [theme]);

    // 获取当前对话
    const currentConversation = useMemo(() =>
            conversations.find(c => c.id === currentConversationId),
        [conversations, currentConversationId]
    );
    const currentTitle = currentConversation?.title || title;

    // 自动滚动到底部
    useEffect(() => {
        if (autoScroll && messagesContainerRef.current && !showHistory && !isMinimized) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, loading, showHistory, isMinimized, autoScroll]);

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

    // 处理删除确认
    const handleDeleteClick = useCallback((e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        setDeleteConfirmId(conversationId);
    }, []);

    const handleConfirmDelete = useCallback((e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        onDeleteConversation?.(conversationId);
        setDeleteConfirmId(null);
    }, [onDeleteConversation]);

    const handleCancelDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmId(null);
    }, []);

    const handleMinimize = useCallback(() => {
        setIsMinimized(true);
        onMinimize?.();
    }, [onMinimize]);

    const handleRestore = useCallback(() => {
        setIsMinimized(false);
        onRestore?.();
    }, [onRestore]);

    const handleCopy = useCallback((message: Message) => {
        onMessageCopy?.(message);
    }, [onMessageCopy]);

    // 设置 CSS 变量
    useEffect(() => {
        const root = document.documentElement;
        const t = mergedTheme;

        if (t.primaryColor) root.style.setProperty('--chat-primary', t.primaryColor);
        if (t.primaryGradient) root.style.setProperty('--chat-primary-gradient', t.primaryGradient);
        if (t.userBubbleGradient) root.style.setProperty('--chat-user-bubble', t.userBubbleGradient);
        if (t.assistantBubbleColor) root.style.setProperty('--chat-assistant-bubble', t.assistantBubbleColor);
        if (t.borderRadius) root.style.setProperty('--chat-border-radius', typeof t.borderRadius === 'number' ? `${t.borderRadius}px` : t.borderRadius);
        if (t.fontSize) root.style.setProperty('--chat-font-size', typeof t.fontSize === 'number' ? `${t.fontSize}px` : t.fontSize);
        if (t.titleFontSize) root.style.setProperty('--chat-title-font-size', typeof t.titleFontSize === 'number' ? `${t.titleFontSize}px` : t.titleFontSize);
        if (t.shadow) root.style.setProperty('--chat-shadow', t.shadow);
        if (t.showBorder === false) root.style.setProperty('--chat-border-width', '0');
    }, [mergedTheme]);

    // 容器样式
    const containerStyle = useMemo(() => ({
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
        ...style
    }), [height, width, style]);

    // 最小化模式
    if (isMinimized) {
        return (
            <div className={`chat-container-minimized ${className}`} style={containerStyle}>
                <button
                    className="restore-btn-only"
                    onClick={handleRestore}
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
        <div className={`chat-container ${className}`} style={containerStyle}>
            {showHeader && (
                <div className={`chat-header ${headerClassName}`} style={headerStyle}>
                    <div className="chat-title">{currentTitle}</div>
                    <div className="chat-header-actions">
                        {showHistoryButton && (
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
                        )}
                        {showMinimizeButton && (
                            <button
                                className="minimize-btn"
                                onClick={handleMinimize}
                                title="最小化"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div
                className={`chat-messages ${messagesClassName}`}
                ref={messagesContainerRef}
                style={messagesStyle}
            >
                {messages.map(message => (
                    <MessageItem
                        key={message.id}
                        message={message}
                        isUser={message.type === 'user'}
                        userName={userName}
                        assistantName={assistantName}
                        enableCopy={enableCopy}
                        onCopy={handleCopy}
                        bubbleClassName={bubbleClassName}
                    />
                ))}
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

            {showFooter && (
                <div className="chat-footer">
                    {/* 可自定义的底部区域 */}
                </div>
            )}

            {/* 历史对话面板 */}
            {showHistory && (
                <div className="history-panel" ref={historyPanelRef}>
                    <div className="history-header">
                        <h3>{historyTitle}</h3>
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
                            <span>{newConversationText}</span>
                        </button>

                        {conversations.length === 0 ? (
                            <div className="empty-history">
                                <p>{emptyText}</p>
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
        </div>
    );
};

export default Chat;