import React, { useRef, useEffect, useState, useCallback } from 'react';
import './MessageBox.css';

// ========================================
// 类型定义
// ========================================

export type ContentBlock =
    | { id: string; type: 'text'; content: string; isStreaming?: boolean }
    | { id: string; type: 'reasoning'; content: string; isStreaming?: boolean; astCache?: any }
    | { id: string; type: 'tool_call'; index: number; name: string; arguments: string; isStreaming?: boolean }
    | { id: string; type: 'tool_result'; index: number; content: any; isError?: boolean };

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  blocks: ContentBlock[];
  status: 'streaming' | 'completed' | 'error';
  createdAt: number;
}

export interface MessageBoxProps {
  message: Message;

  // 流式状态控制
  streamingCursor?: boolean;

  // 虚拟列表支持
  isVisible?: boolean;
  onHeightChange?: (height: number) => void;

  // 交互回调
  onReasoningToggle?: (expanded: boolean) => void;
  onCopy?: () => void;
  onToolCallExpand?: (index: number) => void;

  // 样式
  className?: string;
  style?: React.CSSProperties;
}

// ========================================
// 子组件：闪烁光标
// ========================================

const Cursor: React.FC = () => (
    <span className="chat-cursor">▋</span>
);

// ========================================
// 子组件：推理区域
// ========================================

interface ReasoningSectionProps {
  content: string;
  isStreaming?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

const ReasoningSection: React.FC<ReasoningSectionProps> = ({
                                                             content,
                                                             isStreaming,
                                                             expanded = false,
                                                             onToggle
                                                           }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const hasContent = content && content.length > 0;
  const showToggleButton = hasContent || isStreaming;

  const getToggleText = () => {
    if (isStreaming) {
      return '思考中...';
    }
    return isExpanded ? '收起思考过程' : '展开思考过程';
  };

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  if (!showToggleButton) {
    return null;
  }

  return (
      <div className="reasoning-section">
        <button
            className={`reasoning-toggle ${isExpanded ? 'expanded' : ''}`}
            onClick={handleToggle}
            type="button"
        >
          <span className="toggle-text">{getToggleText()}</span>
          {isStreaming && (
              <span className="streaming-dots">
            <span className="dot dot-1"></span>
            <span className="dot dot-2"></span>
            <span className="dot dot-3"></span>
          </span>
          )}
          {!isStreaming && (
              <svg
                  className="toggle-icon"
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
              >
                <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
              </svg>
          )}
        </button>

        {isExpanded && !isStreaming && hasContent && (
            <div className="reasoning-content">
              {content}
            </div>
        )}
      </div>
  );
};

// ========================================
// 子组件：工具调用卡片
// ========================================

interface ToolCallCardProps {
  toolCall: Extract<ContentBlock, { type: 'tool_call' }>;
  toolResult?: Extract<ContentBlock, { type: 'tool_result' }>;
  expanded?: boolean;
  onExpand?: () => void;
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({
                                                     toolCall,
                                                     toolResult,
                                                     expanded = false,
                                                     onExpand
                                                   }) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpand?.();
  };

  return (
      <div className="chat-tool-call-card">
        <button
            className="chat-tool-call-header"
            onClick={handleExpand}
            aria-expanded={isExpanded}
        >
          <span className="chat-tool-call-icon">🔧</span>
          <span className="chat-tool-call-name">{toolCall.name}</span>
          <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`chat-tool-call-icon-arrow ${isExpanded ? 'rotated' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {isExpanded && (
            <div className="chat-tool-call-body">
              <div className="chat-tool-call-section">
                <div className="chat-tool-call-label">参数：</div>
                <pre className="chat-tool-call-args">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(toolCall.arguments), null, 2);
                } catch {
                  return toolCall.arguments;
                }
              })()}
            </pre>
              </div>

              {toolResult && (
                  <div className="chat-tool-call-section">
                    <div className="chat-tool-call-label">结果：</div>
                    <pre className={`chat-tool-call-result ${toolResult.isError ? 'error' : ''}`}>
                {(() => {
                  try {
                    return JSON.stringify(toolResult.content, null, 2);
                  } catch {
                    return '[序列化失败]';
                  }
                })()}
              </pre>
                  </div>
              )}
            </div>
        )}
      </div>
  );
};

// ========================================
// 主组件：MessageBox
// ========================================

export const MessageBox: React.FC<MessageBoxProps> = React.memo(({
                                                                   message,
                                                                   streamingCursor = false,
                                                                   isVisible = true,
                                                                   onHeightChange,
                                                                   onReasoningToggle,
                                                                   onCopy,
                                                                   onToolCallExpand,
                                                                   className = '',
                                                                   style = {}
                                                                 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // 高度测量：使用 ResizeObserver
  useEffect(() => {
    if (!containerRef.current || !isVisible) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height;
      if (Math.abs(height - measuredHeight) > 1) {
        setMeasuredHeight(height);
        // 防抖高度上报
        const timeoutId = setTimeout(() => {
          onHeightChange?.(height);
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVisible, measuredHeight, onHeightChange]);

  // 视口外降级渲染
  if (!isVisible) {
    return (
        <div
            className="message-box-skeleton"
            style={{ height: measuredHeight || 60 }}
        />
    );
  }

  // 复制处理 - 只复制 text 和 reasoning 内容
  const handleCopy = useCallback(async () => {
    const textContent = message.blocks
        .filter(block => block.type === 'text' || block.type === 'reasoning')
        .map(block => block.content)
        .join('\n\n');

    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [message.blocks, onCopy]);

  // 渲染不同的 ContentBlock
  const renderBlock = (block: ContentBlock) => {
    switch (block.type) {
      case 'text':
        return (
            <div key={block.id} className="chat-text-block">
              <div className="chat-message-text">{block.content}</div>
              {block.isStreaming && streamingCursor && <Cursor />}
            </div>
        );

      case 'reasoning':
        return (
            <ReasoningSection
                key={block.id}
                content={block.content}
                isStreaming={block.isStreaming}
                onToggle={onReasoningToggle}
            />
        );

      case 'tool_call': {
        // 查找对应的 tool_result
        const toolResult = message.blocks.find(
            b => b.type === 'tool_result' && b.index === block.index
        ) as Extract<ContentBlock, { type: 'tool_result' }> | undefined;

        return (
            <ToolCallCard
                key={block.id}
                toolCall={block}
                toolResult={toolResult}
                onExpand={() => onToolCallExpand?.(block.index)}
            />
        );
      }

      case 'tool_result':
        // tool_result 已在 tool_call 中渲染，这里跳过
        return null;

      default:
        return null;
    }
  };

  // 根据消息类型确定样式类名
  const getMessageClass = () => {
    switch (message.type) {
      case 'user':
        return 'chat-message--user';
      case 'assistant':
        return 'chat-message--assistant';
      case 'system':
        return 'chat-message--system';
      default:
        return '';
    }
  };

  const getBubbleClass = () => {
    switch (message.type) {
      case 'user':
        return 'chat-message-bubble--user';
      case 'assistant':
        return 'chat-message-bubble--assistant';
      case 'system':
        return 'chat-message-bubble--system';
      default:
        return '';
    }
  };

  // 判断是否显示复制按钮
  // 规则：user/assistant 类型，且有 text 或 reasoning 内容（纯 tool 消息不显示）
  const hasCopyableContent = message.blocks.some(b => b.type === 'text' || b.type === 'reasoning');
  const shouldShowCopyButton = (message.type === 'user' || message.type === 'assistant') && hasCopyableContent;

  return (
      <div
          ref={containerRef}
          className={`chat-message ${getMessageClass()} ${className}`}
          style={style}
      >
        <div className={`chat-message-bubble ${getBubbleClass()}`}>
          {message.blocks.map(renderBlock)}

          {message.status === 'error' && (
              <span className="chat-message-status error">发送失败</span>
          )}
        </div>

        {/* 复制按钮 - 只有可复制内容时才显示 */}
        {shouldShowCopyButton && (
            <button
                className={`chat-copy-btn chat-copy-btn--${message.type === 'user' ? 'right' : 'left'} ${copied ? 'is-copied' : ''}`}
                onClick={handleCopy}
                title={copied ? '已复制' : '复制内容'}
                aria-label={copied ? '已复制' : '复制内容'}
            >
              {copied ? (
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
        )}
      </div>
  );
});

MessageBox.displayName = 'MessageBox';

export default MessageBox;