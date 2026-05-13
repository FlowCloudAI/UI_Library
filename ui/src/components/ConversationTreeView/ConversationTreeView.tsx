import React, { useMemo } from 'react';
import './ConversationTreeView.css';

// ========================================
// 类型定义（对应 Rust ConversationNode）
// ========================================

export interface ConversationNodeMessage {
  role: string;
  content?: string | null;
  reasoning_content?: string | null;
  tool_call_id?: string | null;
  tool_calls?: unknown[] | null;
}

export interface ConversationNode {
  id: number;
  message: ConversationNodeMessage;
  parent: number | null;
  turn_id: number;
  timestamp: string;
}

export interface ConversationTreeViewProps {
  nodes: ConversationNode[];
  head: number | null;
  onCheckout: (nodeId: number) => void;
  className?: string;
}

// ========================================
// 辅助函数
// ========================================

interface TreeNode extends ConversationNode {
  children: number[];
}

function buildTree(nodes: ConversationNode[]): Map<number, TreeNode> {
  const map = new Map<number, TreeNode>();
  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }
  for (const n of nodes) {
    if (n.parent !== null && n.parent !== n.id) {
      const parent = map.get(n.parent);
      if (parent) parent.children.push(n.id);
    }
  }
  return map;
}

function pathToRoot(tree: Map<number, TreeNode>, nodeId: number | null): number[] {
  const path: number[] = [];
  let cur = nodeId;
  const visited = new Set<number>();
  while (cur !== null) {
    if (visited.has(cur)) break;
    visited.add(cur);
    path.unshift(cur);
    const node = tree.get(cur);
    cur = node?.parent ?? null;
  }
  return path;
}

function contentPreview(node: TreeNode): string {
  const content = node.message.content;
  if (!content) return `[${node.message.role}]`;
  const truncated = content.length > 40 ? content.slice(0, 40) + '…' : content;
  return truncated.replace(/\n/g, ' ');
}

// ========================================
// 主组件
// ========================================

export const ConversationTreeView: React.FC<ConversationTreeViewProps> = ({
  nodes,
  head,
  onCheckout,
  className = '',
}) => {
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const activePath = useMemo(() => pathToRoot(tree, head), [tree, head]);

  // 构建映射：节点 ID → 它在兄弟中的索引（用于分支计数）
  const branchInfo = useMemo(() => {
    const info = new Map<number, { index: number; total: number; siblings: number[] }>();
    for (const [, node] of tree) {
      if (node.parent !== null) {
        const parent = tree.get(node.parent);
        if (parent && parent.children.length > 1) {
          const siblings = parent.children;
          const index = siblings.indexOf(node.id);
          info.set(node.id, { index: index + 1, total: siblings.length, siblings });
        }
      }
    }
    return info;
  }, [tree]);

  if (nodes.length === 0) {
    return <div className={`fc-conv-tree ${className}`}>暂无对话历史</div>;
  }

  return (
    <div className={`fc-conv-tree ${className}`}>
      <div className="fc-conv-tree__header">对话分支</div>
      <div className="fc-conv-tree__list">
        {activePath.map((nodeId) => {
          const node = tree.get(nodeId);
          if (!node) return null;

          const branch = branchInfo.get(nodeId);
          const isHead = nodeId === head;
          const isUser = node.message.role === 'user';
          const isAssistant = node.message.role === 'assistant';

          return (
            <div key={nodeId} className="fc-conv-tree__turn">
              {/* 当前路径上的节点 */}
              <div
                className={`fc-conv-tree__item${isHead ? ' fc-conv-tree__item--head' : ''}${isUser ? ' fc-conv-tree__item--user' : ''}${isAssistant ? ' fc-conv-tree__item--assistant' : ''}`}
                onClick={() => onCheckout(nodeId)}
                title={contentPreview(node)}
              >
                <span className="fc-conv-tree__role">
                  {isUser ? '👤' : isAssistant ? '🤖' : '⚙'}
                </span>
                <span className="fc-conv-tree__preview">{contentPreview(node)}</span>
                {isHead && <span className="fc-conv-tree__head-marker">●</span>}
              </div>

              {/* 分支选项（兄弟节点） */}
              {branch && (
                <div className="fc-conv-tree__branches">
                  {branch.siblings.map((siblingId, idx) => {
                    const sibling = tree.get(siblingId);
                    if (!sibling) return null;
                    const isActiveBranch = siblingId === nodeId;
                    return (
                      <div
                        key={siblingId}
                        className={`fc-conv-tree__branch${isActiveBranch ? ' fc-conv-tree__branch--active' : ''}`}
                        onClick={() => onCheckout(siblingId)}
                      >
                        <span className="fc-conv-tree__branch-idx">{idx + 1}/{branch.total}</span>
                        <span className="fc-conv-tree__branch-preview">
                          {contentPreview(sibling)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

ConversationTreeView.displayName = 'ConversationTreeView';
