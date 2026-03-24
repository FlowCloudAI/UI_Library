import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Chat.css';

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
    onSendMessage?: (message: string) => Promise<void> | void;
    placeholder?: string;
    title?: string;
    height?: string;
    showHeader?: boolean;
    showFooter?: boolean;
    loading?: boolean;
    disabled?: boolean;
    theme?: 'light' | 'dark';
    userName?: string;
    assistantName?: string;
    onTyping?: (isTyping: boolean) => void;
    maxInputLength?: number;
    autoFocus?: boolean;
    enableCopy?: boolean;
}

export const Chat: React.FC<ChatProps> = ({
                                              messages = [],
                                              onSendMessage,
                                              placeholder = "输入消息...",
                                              title = "AI 助手",
                                              height = "600px",
                                              showHeader = true,
                                              showFooter = true,
                                              loading = false,
                                              disabled = false,
                                              theme: propTheme,
                                              userName = "我",
                                              assistantName = "AI助手",
                                              onTyping,
                                              maxInputLength = 2000,
                                              autoFocus = true,
                                              enableCopy = true
                                          }) => {
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [copyError, setCopyError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 检测当前主题
    useEffect(() => {
        if (propTheme) {
            setCurrentTheme(propTheme);
        } else {
            const checkTheme = () => {
                const dataTheme = document.documentElement.getAttribute('data-theme');
                if (dataTheme === 'dark') {
                    setCurrentTheme('dark');
                } else if (dataTheme === 'light') {
                    setCurrentTheme('light');
                } else {
                    const hasDarkClass = document.documentElement.classList.contains('dark') ||
                        document.body.classList.contains('dark') ||
                        document.documentElement.classList.contains('theme-dark') ||
                        document.body.classList.contains('theme-dark');
                    setCurrentTheme(hasDarkClass ? 'dark' : 'light');
                }
            };

            checkTheme();

            const observer = new MutationObserver(checkTheme);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme', 'class']
            });
            observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['class']
            });

            return () => observer.disconnect();
        }
    }, [propTheme]);

    // 自动滚动到底部
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // 自动聚焦
    useEffect(() => {
        if (autoFocus && !disabled && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus, disabled]);

    // 清除错误提示
    useEffect(() => {
        if (copyError) {
            const timer = setTimeout(() => {
                setCopyError(null);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [copyError]);

    // 复制消息内容
    const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
        if (!navigator.clipboard) {
            setCopyError('当前浏览器不支持复制功能');
            return;
        }

        try {
            await navigator.clipboard.writeText(content);
            setCopiedMessageId(messageId);

            setTimeout(() => {
                setCopiedMessageId(null);
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    setCopyError('需要剪贴板权限，请允许后重试');
                } else if (err.name === 'SecurityError') {
                    setCopyError('出于安全原因，无法复制内容');
                } else {
                    setCopyError('复制失败，请重试');
                }
            } else {
                setCopyError('复制失败，请重试');
            }

            setTimeout(() => {
                setCopyError(null);
            }, 3000);
        }
    }, []);

    // 发送消息
    const handleSend = useCallback(() => {
        const trimmedMessage = inputValue.trim();
        if (!trimmedMessage || disabled || loading || isSending) return;

        if (trimmedMessage.length > maxInputLength) {
            console.warn(`消息超过最大长度限制: ${maxInputLength}`);
            return;
        }

        setIsSending(true);

        const sendPromise = onSendMessage?.(trimmedMessage);

        if (sendPromise) {
            void sendPromise
                .then(() => {
                    setInputValue('');
                    if (inputRef.current) {
                        inputRef.current.style.height = 'auto';
                    }
                    if (isTyping) {
                        setIsTyping(false);
                        onTyping?.(false);
                    }
                })
                .catch((error) => {
                    console.error('发送消息失败:', error);
                })
                .finally(() => {
                    setIsSending(false);
                });
        } else {
            setInputValue('');
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
            }
            if (isTyping) {
                setIsTyping(false);
                onTyping?.(false);
            }
            setIsSending(false);
        }
    }, [inputValue, disabled, loading, isSending, onSendMessage, maxInputLength, isTyping, onTyping]);

    // 处理键盘事件
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    // 处理输入变化
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;

        if (value.length <= maxInputLength) {
            setInputValue(value);

            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;

            const hasContent = value.length > 0;
            if (hasContent !== isTyping) {
                setIsTyping(hasContent);
                onTyping?.(hasContent);
            }
        }
    }, [maxInputLength, isTyping, onTyping]);

    // 格式化时间
    const formatTime = useCallback((date: Date) => {
        return new Date(date).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

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
                {/* 只显示 AI 助手的头像 */}
                {!isUser && (
                    <div className="message-avatar">
                        {assistantName[0]}
                    </div>
                )}
                <div className="message-content-wrapper">
                    <div className="message-header">
                        <span className="message-sender">
                            {isUser ? userName : assistantName}
                        </span>
                        <span className="message-time">
                            {formatTime(message.timestamp)}
                        </span>
                    </div>
                    <div className="message-bubble">
                        <div className="message-text">{message.content}</div>
                        {message.status === 'sending' && (
                            <span className="message-status sending">发送中...</span>
                        )}
                        {message.status === 'error' && (
                            <span className="message-status error">发送失败</span>
                        )}
                    </div>
                    {/* 复制按钮 - 放在气泡下方 */}
                    {enableCopy && (
                        <button
                            className={`copy-btn ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            title={isCopied ? "已复制" : "复制内容"}
                            aria-label={isCopied ? "已复制" : "复制内容"}
                        >
                            {isCopied ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span>已复制</span>
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2"/>
                                    </svg>
                                    <span>复制</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`chat-container ${currentTheme}`} style={{ height }}>
            {showHeader && (
                <div className="chat-header">
                    <div className="chat-title">{title}</div>
                    <div className="chat-status">
                        {(loading || isSending) && <span className="status-dot"></span>}
                        <span>{(loading || isSending) ? 'AI 正在思考...' : '在线'}</span>
                    </div>
                </div>
            )}

            <div className="chat-messages">
                {messages.map(renderMessage)}
                {(loading || isSending) && (
                    <div className="chat-message assistant">
                        <div className="message-avatar">{assistantName[0]}</div>
                        <div className="message-content-wrapper">
                            <div className="message-header">
                                <span className="message-sender">{assistantName}</span>
                            </div>
                            <div className="message-bubble">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 复制错误提示 */}
            {copyError && (
                <div className="copy-error-toast">
                    {copyError}
                </div>
            )}

            {showFooter && (
                <div className="chat-footer">
                    <div className="chat-input-wrapper">
                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            disabled={disabled || loading || isSending}
                            rows={1}
                            maxLength={maxInputLength}
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            autoComplete="off"
                        />
                        <button
                            className={`chat-send-btn ${(!inputValue.trim() || disabled || loading || isSending) ? 'disabled' : ''}`}
                            onClick={handleSend}
                            disabled={!inputValue.trim() || disabled || loading || isSending}
                        >
                            发送
                        </button>
                    </div>
                    <div className="chat-tips">
                        <span>按 Enter 发送，Shift + Enter 换行</span>
                        {maxInputLength && (
                            <span className="char-count">
                                {inputValue.length}/{maxInputLength}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;