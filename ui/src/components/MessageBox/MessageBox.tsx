import React from 'react';
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

const MessageBox: React.FC<MessageBoxProps> & {
  Item: typeof MessageBoxItem;
} = ({
  children,
  className = '',
  style = {}
}) => {
  return (
    <div className={`message-box ${className}`} style={style}>
      {children}
    </div>
  );
};

MessageBox.Item = MessageBoxItem;
MessageBox.displayName = 'MessageBox';

export default MessageBox;
