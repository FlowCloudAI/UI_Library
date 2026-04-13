import React from 'react';
import './MessageBox.css';

// ========================================
// 类型定义
// ========================================

export interface MessageBlock {
  id: string;
  type: 'text' | 'reasoning' | 'tool_call' | 'tool_result';
  content?: string | any;
  isStreaming?: boolean;
  index?: number;
  name?: string;
  arguments?: string;
  isError?: boolean;
}

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  blocks: MessageBlock[];
  status: 'streaming' | 'completed';
  createdAt: number;
}

export interface MessageBoxProps {
  message: Message;
  isVisible?: boolean;
  streamingCursor?: boolean;
  onReasoningToggle?: (expanded: boolean) => void;
  onToolCallExpand?: (index: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

// ========================================
// 主组件：MessageBox
// ========================================

/**
 * MessageBox 组件 - 用于显示聊天消息
 * @public
 */
// eslint-disable-next-line no-unused-vars
export const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  isVisible = true,
  streamingCursor = false,
  onReasoningToggle,
  onToolCallExpand,
  className = '',
  style = {}
}) => {
  if (!isVisible) return null;

  return (
    <div className={`message-box ${className}`} style={style}>
      {message.blocks.map((block) => (
        <div key={block.id} className="message-block">
          {block.type === 'text' && (
            <div className="message-text">
              {block.content}
              {streamingCursor && block.isStreaming && <span className="message-box-cursor">▋</span>}
            </div>
          )}
          {block.type === 'reasoning' && (
            <div className="message-reasoning">
              <div className="reasoning-header" onClick={() => onReasoningToggle?.(true)}>
                💭 思考过程
              </div>
              <div className="reasoning-content">{block.content}</div>
            </div>
          )}
          {block.type === 'tool_call' && (
            <div className="message-tool-call" onClick={() => onToolCallExpand?.(block.index || 0)}>
              🔧 {block.name}({block.arguments})
            </div>
          )}
          {block.type === 'tool_result' && (
            <div className={`message-tool-result ${block.isError ? 'error' : ''}`}>
              {JSON.stringify(block.content)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
