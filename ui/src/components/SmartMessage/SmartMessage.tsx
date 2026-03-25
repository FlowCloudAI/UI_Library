import React, { useState, memo } from 'react';
import './SmartMessage.css';

// 消息类型定义
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// 消息接口
export interface SmartMessageProps {
    id: string;
    content: string;
    role: MessageRole;
    timestamp?: Date;
    status?: 'sending' | 'sent' | 'error';
    // 工具消息特有属性
    toolName?: string;
    toolResult?: any;
    // 回调
    onCopy?: (content: string, role: MessageRole) => void;
    // 自定义样式
    className?: string;
    style?: React.CSSProperties;
}

// 智能消息组件
export const SmartMessage: React.FC<SmartMessageProps> = memo(({
                                                                   id,
                                                                   content,
                                                                   role,
                                                                   timestamp,
                                                                   status,
                                                                   toolName,
                                                                   toolResult,
                                                                   onCopy,
                                                                   className = '',
                                                                   style = {},
                                                               }) => {
    const [copied, setCopied] = useState(false);

    // 格式化时间
    const formattedTime = timestamp
        ? new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : '';

    // 复制消息内容
    const handleCopy = async () => {
        try {
            let copyContent = content;

            // 如果是工具消息，格式化输出
            if (role === 'tool' && toolResult) {
                copyContent = `工具: ${toolName || '工具调用'}\n结果: ${JSON.stringify(toolResult, null, 2)}`;
            }

            await navigator.clipboard.writeText(copyContent);
            setCopied(true);
            onCopy?.(content, role);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    // 判断是否显示复制按钮
    const shouldShowCopyButton = () => {
        return role === 'user' || role === 'assistant';
    };

    // 获取消息容器类名
    const getContainerClassName = () => {
        const baseClass = 'smart-message';
        const roleClass = `smart-message-${role}`;
        const statusClass = status ? `smart-message-${status}` : '';
        return `${baseClass} ${roleClass} ${statusClass} ${className}`.trim();
    };

    // 获取消息内容类名
    const getContentClassName = () => {
        const baseClass = 'smart-message-content';
        const roleContentClass = `smart-message-content-${role}`;
        return `${baseClass} ${roleContentClass}`;
    };

    // 渲染系统消息
    const renderSystemMessage = () => (
        <div className="system-message-wrapper">
            <div className="system-message-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </div>
            <div className="system-message-text">{content}</div>
            {formattedTime && <div className="system-message-time">{formattedTime}</div>}
        </div>
    );

    // 渲染工具消息
    const renderToolMessage = () => (
        <div className="tool-message-wrapper">
            <div className="tool-message-header">
                <div className="tool-message-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.7 6.3L19 2L22 5L17.7 9.3L14.7 6.3Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M9.3 17.7L5 22L2 19L6.3 14.7L9.3 17.7Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 12L14.7 9.3M12 12L9.3 14.7M12 12L8 8M12 12L16 16" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                </div>
                <span className="tool-message-name">{toolName || '工具调用'}</span>
            </div>
            <div className="tool-message-content">
                <div className="tool-message-params">
                    <strong>参数:</strong>
                    <pre>{content}</pre>
                </div>
                {toolResult && (
                    <div className="tool-message-result">
                        <strong>结果:</strong>
                        <pre>{typeof toolResult === 'object' ? JSON.stringify(toolResult, null, 2) : toolResult}</pre>
                    </div>
                )}
            </div>
            {formattedTime && <div className="tool-message-time">{formattedTime}</div>}
        </div>
    );

    // 渲染用户/AI 消息
    const renderUserAssistantMessage = () => (
        <>
            <div className="message-header">
                <span className="message-sender">
                    {role === 'user' ? '我' : 'AI助手'}
                </span>
                {formattedTime && <span className="message-time">{formattedTime}</span>}
            </div>
            <div className={getContentClassName()}>
                <div className="message-text">{content}</div>
                {shouldShowCopyButton() && (
                    <button
                        className={`copy-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                        title={copied ? "已复制" : "复制内容"}
                    >
                        {copied ? (
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
                {status === 'sending' && <span className="message-status sending">发送中...</span>}
                {status === 'error' && <span className="message-status error">发送失败</span>}
            </div>
        </>
    );

    // 根据角色渲染不同的消息
    const renderMessage = () => {
        switch (role) {
            case 'system':
                return renderSystemMessage();
            case 'tool':
                return renderToolMessage();
            case 'user':
            case 'assistant':
            default:
                return renderUserAssistantMessage();
        }
    };

    return (
        <div className={getContainerClassName()} style={style} data-message-id={id}>
            {renderMessage()}
        </div>
    );
});

SmartMessage.displayName = 'SmartMessage';

export default SmartMessage;