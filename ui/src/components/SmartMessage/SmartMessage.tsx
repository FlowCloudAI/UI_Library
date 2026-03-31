import React, { useState, useCallback } from 'react';
import './SmartMessage.css';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface SmartMessageProps {
    id: string;
    content: string;
    role: MessageRole;
    timestamp?: Date;
    status?: 'sending' | 'sent' | 'error';
    toolName?: string;
    toolResult?: any;
    onCopy?: (content: string, role: MessageRole) => void;
    className?: string;
    style?: React.CSSProperties;
}

export const SmartMessage: React.FC<SmartMessageProps> = ({
                                                              id,
                                                              content,
                                                              role,
                                                              status,
                                                              toolName,
                                                              toolResult,
                                                              onCopy,
                                                              className = '',
                                                              style = {},
                                                          }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            onCopy?.(content, role);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    }, [content, role, onCopy]);

    const getMessageClass = () => {
        const baseClass = 'fc-smart-message';
        const roleClass = `fc-smart-message--${role}`;
        const statusClass = status ? `fc-smart-message--${status}` : '';
        return `${baseClass} ${roleClass} ${statusClass} ${className}`.trim();
    };

    // 判断是否显示复制按钮
    const shouldShowCopyButton = () => {
        return role === 'user' || role === 'assistant';
    };

    // 根据角色渲染不同的内容
    const renderContent = () => {
        switch (role) {
            case 'tool':
                return (
                    <>
                        {toolName && (
                            <div className="fc-smart-message-tool-info">
                                <span className="fc-smart-message-tool-icon">🔧</span>
                                <span className="fc-smart-message-tool-name">{toolName}</span>
                            </div>
                        )}
                        <div className="fc-smart-message-content">
                            <pre className="fc-smart-message-tool-result">
                                {(() => { try { return JSON.stringify(toolResult || content, null, 2); } catch { return '[序列化失败]'; } })()}
                            </pre>
                        </div>
                    </>
                );

            case 'system':
                return (
                    <div className="fc-smart-message-content">
                        <div className="fc-smart-message-text fc-smart-message-system-text">{content}</div>
                    </div>
                );

            default:
                return (
                    <div className="fc-smart-message-content">
                        <div className="fc-smart-message-text">{content}</div>
                    </div>
                );
        }
    };

    return (
        <div className={getMessageClass()} style={style} data-message-id={id}>
            <div className="fc-smart-message-content-wrapper">
                {renderContent()}
            </div>

            {shouldShowCopyButton() && (
                <button
                    className="fc-smart-message-copy-btn"
                    onClick={handleCopy}
                    title="复制内容"
                >
                    {copied ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor"/>
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
};

export default SmartMessage;