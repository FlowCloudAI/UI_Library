<<<<<<< HEAD
import React, {useCallback, useEffect, useRef, useState} from 'react';
=======
import React from 'react';
>>>>>>> f5cc4cd (修改messagebox组件让ai功能更好引用)
import './MessageBox.css';

// ========================================
// 类型定义
// ========================================

export interface MessageBoxItemProps {
  role: 'user' | 'assistant' | 'system';
  avatar?: React.ReactNode;
  content: string;
  streaming?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export interface MessageBoxProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// ========================================
// 子组件：闪烁光标
// ========================================

const Cursor: React.FC = () => (
  <span className="message-box-cursor">▋</span>
);

// ========================================
// 子组件：MessageBox.Item
// ========================================

const MessageBoxItem: React.FC<MessageBoxItemProps> = ({
  role,
  avatar,
  content,
  streaming = false,
  children,
  className = ''
}) => {
  // 根据角色确定样式类名
  const getRoleClass = () => {
    switch (role) {
      case 'user':
        return 'message-box-item--user';
      case 'assistant':
        return 'message-box-item--assistant';
      case 'system':
        return 'message-box-item--system';
      default:
        return '';
    }
  };

  // 判断是否显示头像
  const hasAvatar = avatar !== undefined && avatar !== null;

  return (
    <div className={`message-box-item ${getRoleClass()} ${className}`}>
      {/* 头像区域 */}
      {hasAvatar && (
        <div className="message-box-avatar">
          {avatar}
        </div>
      )}

      {/* 消息内容区域 */}
      <div className="message-box-content">
        <div className="message-box-bubble">
          <div className="message-box-text">
            {content}
            {streaming && <Cursor />}
          </div>

          {/* 额外内容（工具调用、附件等） */}
          {children && (
            <div className="message-box-item-children">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

MessageBoxItem.displayName = 'MessageBox.Item';

// ========================================
// 主组件：MessageBox
// ========================================

<<<<<<< HEAD
function MessageBox({
                      message,
                      streamingCursor = false,
                      isVisible = true,
                      onHeightChange,
                      onReasoningToggle,
                      onCopy,
                      className = '',
                      style = {}
                    }: MessageBoxProps) {
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

=======
const MessageBox: React.FC<MessageBoxProps> & {
  Item: typeof MessageBoxItem;
} = ({
  children,
  className = '',
  style = {}
}) => {
>>>>>>> f5cc4cd (修改messagebox组件让ai功能更好引用)
  return (
    <div className={`message-box ${className}`} style={style}>
      {children}
    </div>
  );
<<<<<<< HEAD
}
=======
};
>>>>>>> f5cc4cd (修改messagebox组件让ai功能更好引用)

MessageBox.Item = MessageBoxItem;
MessageBox.displayName = 'MessageBox';

<<<<<<< HEAD
export default React.memo(MessageBox);
export {MessageBox};
=======
export default MessageBox;
>>>>>>> f5cc4cd (修改messagebox组件让ai功能更好引用)
