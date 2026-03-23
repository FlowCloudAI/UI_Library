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
    theme?: 'light' | 'dark';  // 可选，如果不传则自动检测
    userName?: string;
    assistantName?: string;
    onTyping?: (isTyping: boolean) => void;
    maxInputLength?: number;
    autoFocus?: boolean;
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
                                              autoFocus = true
                                          }) => {
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 检测当前主题
    useEffect(() => {
        if (propTheme) {
            // 如果传入了 theme 属性，使用传入的值
            setCurrentTheme(propTheme);
        } else {
            // 否则自动检测全局主题
            const checkTheme = () => {
                // 检查 data-theme 属性
                const dataTheme = document.documentElement.getAttribute('data-theme');
                if (dataTheme === 'dark') {
                    setCurrentTheme('dark');
                } else if (dataTheme === 'light') {
                    setCurrentTheme('light');
                } else {
                    // 检查 class 主题
                    const hasDarkClass = document.documentElement.classList.contains('dark') ||
                        document.body.classList.contains('dark') ||
                        document.documentElement.classList.contains('theme-dark') ||
                        document.body.classList.contains('theme-dark');
                    setCurrentTheme(hasDarkClass ? 'dark' : 'light');
                }
            };

            checkTheme();

            // 监听主题变化
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

        if (isSystem) {
            return (
                <div key={message.id} className="chat-message-system">
                    <span className="system-content">{message.content}</span>
                </div>
            );
        }

        return (
            <div key={message.id} className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
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
                </div>
                {isUser && (
                    <div className="message-avatar">
                        {userName[0]}
                    </div>
                )}
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