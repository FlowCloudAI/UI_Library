import React, {useEffect, useState} from 'react';
import Markdown from 'react-markdown';
import {PrismLight as SyntaxHighlighter} from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash.js';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c.js';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp.js';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp.js';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css.js';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go.js';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java.js';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript.js';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json.js';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx.js';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown.js';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python.js';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust.js';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql.js';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx.js';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript.js';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml.js';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import './MessageBox.css';

// ========================================
// 类型定义
// ========================================

export interface ToolCallInfo {
  index: number
  name: string
  args?: string
  result?: string
  isError?: boolean
}

export type MessageBoxBlock =
    | { id?: string; type: 'reasoning'; content: string; seconds?: number; streaming?: boolean }
    | { id?: string; type: 'tool'; tool: ToolCallInfo; detail?: 'simple' | 'verbose' }
    | { id?: string; type: 'tool_use'; tools: ToolCallInfo[]; detail?: 'simple' | 'verbose' }
    | { id?: string; type: 'content'; content: string; markdown?: boolean; streaming?: boolean }
    | { id?: string; type: 'children'; children: React.ReactNode };

export type MessageBoxContextDisplay = 'full' | 'compact';

export interface MessageBoxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onCopy' | 'role'> {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  streaming?: boolean;
  markdown?: boolean;
  children?: React.ReactNode;
  maxWidth?: string;
  // 行高，覆盖默认 1.815
  lineHeight?: number | string;
  // 深度思考
  reasoning?: string;
  reasoningSeconds?: number;
  reasoningStreaming?: boolean;
  // 工具调用
  toolCalls?: ToolCallInfo[];
  toolCallDetail?: 'simple' | 'verbose';
  // 按顺序渲染的块（优先级高于独立字段）
  blocks?: MessageBoxBlock[];
  // 过程上下文展示方式：compact 会在完成后折叠最终回答前的过程块
  contextDisplay?: MessageBoxContextDisplay;
  // 角色扮演模式（仅对 assistant 生效）
  rolePlaying?: boolean;
  // 分支信息
  nodeId?: number;
  branchIndex?: number;
  branchTotal?: number;
  onSwitchBranch?: (direction: 'prev' | 'next') => void;
  // 工具栏回调
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onPlay?: () => void;
}

// ========================================
// 子组件：闪烁光标
// ========================================

const Cursor: React.FC = () => (
    <span className="message-box-cursor"/>
);

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.alias('bash', ['sh', 'shell', 'zsh']);
SyntaxHighlighter.alias('cpp', ['c++']);
SyntaxHighlighter.alias('csharp', ['cs']);
SyntaxHighlighter.alias('javascript', ['js', 'mjs', 'cjs']);
SyntaxHighlighter.alias('markdown', ['md']);
SyntaxHighlighter.alias('typescript', ['ts']);
SyntaxHighlighter.alias('yaml', ['yml']);

const supportedCodeLanguages = new Set([
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'go',
  'java',
  'javascript',
  'json',
  'jsx',
  'markdown',
  'python',
  'rust',
  'sql',
  'tsx',
  'typescript',
  'yaml'
]);

const codeLanguageAliases: Record<string, string> = {
  'c++': 'cpp',
  cjs: 'javascript',
  cs: 'csharp',
  js: 'javascript',
  mjs: 'javascript',
  md: 'markdown',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  yml: 'yaml',
  zsh: 'bash'
};

const getCodeText = (children: React.ReactNode): string => (
    React.Children.toArray(children)
        .map(child => typeof child === 'string' || typeof child === 'number' ? String(child) : '')
        .join('')
);

const getCodeLanguage = (className?: string): string | undefined => {
  const match = /language-(\S+)/.exec(className ?? '');
  const rawLanguage = match?.[1]?.toLowerCase();
  if (!rawLanguage) return undefined;

  const normalizedLanguage = codeLanguageAliases[rawLanguage] ?? rawLanguage;
  return supportedCodeLanguages.has(normalizedLanguage) ? normalizedLanguage : undefined;
};

// ========================================
// 子组件：代码块（带复制按钮）
// ========================================

const CodeBlock: React.FC<React.PropsWithChildren<{ className?: string }>> = ({children, className}) => {
  const [copied, setCopied] = useState(false);
  const rawCode = getCodeText(children);
  const code = rawCode.replace(/\n$/, '');
  const language = getCodeLanguage(className);
  const isBlock = Boolean(className?.includes('language-')) || rawCode.includes('\n');

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isBlock) {
    return <code className={className}>{children}</code>;
  }

  return (
      <div className="message-box-code-block">
        <button className="message-box-code-copy" onClick={handleCopy} type="button">
          {copied ? '✓ 已复制' : '复制'}
        </button>
        {language ? (
            <SyntaxHighlighter
                className={className}
                language={language}
                PreTag="pre"
                CodeTag="span"
                useInlineStyles={false}
            >
              {code}
            </SyntaxHighlighter>
        ) : (
            <pre className={className}>{code}</pre>
        )}
      </div>
  );
};

// ========================================
// 子组件：深度思考区域
// ========================================

const ReasoningSection: React.FC<{
  reasoning: string;
  reasoningSeconds?: number;
  reasoningStreaming: boolean;
}> = ({reasoning, reasoningStreaming}) => {
  const [expanded, setExpanded] = useState(reasoningStreaming);

  useEffect(() => {
    if (reasoningStreaming) setExpanded(true);
  }, [reasoningStreaming]);

  const label = reasoningStreaming ? '正在思考' : '已思考';

  return (
      <div className="message-box-reasoning">
        <button
            className="message-box-reasoning-header"
            onClick={() => setExpanded(v => !v)}
            type="button"
        >
          {reasoningStreaming
              ? <span className="message-box-reasoning-spinner"/>
              : <span className="message-box-reasoning-brain">◎</span>
          }
          <span className="message-box-reasoning-label">{label}</span>
          <span className={`message-box-reasoning-chevron${expanded ? ' expanded' : ''}`}/>
        </button>
        {expanded && (
            <div className="message-box-reasoning-content">
              {reasoning}
              {reasoningStreaming && <Cursor/>}
            </div>
        )}
      </div>
  );
};

// ========================================
// 子组件：工具调用状态文本
// ========================================

const getToolStatusText = (tool: ToolCallInfo): string => {
  if (tool.result === undefined) {
      return '正在调用';
  }
  if (tool.isError) {
      return '调用失败';
  }
    return '调用完成';
};

// ========================================
// 子组件：工具调用条目
// ========================================

const ToolCallItem: React.FC<{
  tool: ToolCallInfo;
  detail: 'simple' | 'verbose';
}> = ({tool, detail}) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = tool.args !== undefined || tool.result !== undefined;

  if (detail === 'simple') {
    return (
        <div className={`message-box-tool-item${tool.isError ? ' message-box-tool-item--error' : ''}`}>
          <span className="message-box-tool-name">{tool.name}</span>
            <span className="message-box-tool-status-text">{getToolStatusText(tool)}</span>
        </div>
    );
  }

  return (
      <div
          className={`message-box-tool-item message-box-tool-item--verbose${tool.isError ? ' message-box-tool-item--error' : ''}`}>
        <button
            className="message-box-tool-header"
            onClick={() => hasDetail && setExpanded(v => !v)}
            style={hasDetail ? undefined : {cursor: 'default'}}
            type="button"
        >
          <span className="message-box-tool-name">{tool.name}</span>
            <span className="message-box-tool-status-text">{getToolStatusText(tool)}</span>
          {hasDetail && <span className={`message-box-tool-chevron${expanded ? ' expanded' : ''}`}/>}
        </button>
        {expanded && hasDetail && (
            <div className="message-box-tool-detail">
              {tool.args !== undefined && (
                  <div className="message-box-tool-section">
                    <div className="message-box-tool-section-label">参数</div>
                    <pre className="message-box-tool-pre">{tool.args}</pre>
                  </div>
              )}
              {tool.result !== undefined && (
                  <div className="message-box-tool-section">
                    <div className="message-box-tool-section-label">
                      {tool.isError ? '错误信息' : '结果'}
                    </div>
                    <pre className={`message-box-tool-pre${tool.isError ? ' message-box-tool-pre--error' : ''}`}>
                {tool.result}
              </pre>
                  </div>
              )}
            </div>
        )}
      </div>
  );
};

// ========================================
// 子组件：工具调用组（双层折叠）
// ========================================

const ToolUseSection: React.FC<{
    tools: ToolCallInfo[];
    detail: 'simple' | 'verbose';
}> = ({tools, detail}) => {
    const hasCalling = tools.some(t => t.result === undefined);
    const [expanded, setExpanded] = useState(hasCalling);

    useEffect(() => {
        if (hasCalling) setExpanded(true);
    }, [hasCalling]);

    if (tools.length === 0) return null;

    const errorCount = tools.filter(t => t.isError).length;
    const name = tools[0].name;
    const homogeneous = tools.every(t => t.name === name);
    const displayName = homogeneous ? name : '多个工具';
    const count = tools.length;

    let statusText: string;
    if (hasCalling) {
        statusText = '正在调用';
    } else if (errorCount > 0) {
        statusText = '调用失败';
    } else {
        statusText = '调用完成';
    }

    return (
        <div className="message-box-tool-use">
            <button
                className="message-box-tool-use-header"
                onClick={() => setExpanded(v => !v)}
                type="button"
            >
                <span className="message-box-tool-name">{displayName}</span>
                <span className="message-box-tool-count">×{count}</span>
                <span className="message-box-tool-status-text">{statusText}</span>
                <span className={`message-box-tool-use-chevron${expanded ? ' expanded' : ''}`}/>
            </button>
            {expanded && (
                <div className="message-box-tool-use-items">
                    {tools.map(tool => (
                        <ToolCallItem key={tool.index} tool={tool} detail={detail}/>
                    ))}
                </div>
            )}
        </div>
    );
};

// ========================================
// 工具栏图标
// ========================================

const sz = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const IconCopy = () => <svg {...sz}>
  <rect x="9" y="9" width="13" height="13" rx="2"/>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>;
const IconCheck = () => <svg {...sz} strokeWidth={2.5}>
  <polyline points="20 6 9 17 4 12"/>
</svg>;
const IconEdit = () => <svg {...sz}>
  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>;
const IconRetry = () => <svg {...sz}>
  <polyline points="1 4 1 10 7 10"/>
  <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
</svg>;
const IconPlay = () => <svg {...sz}>
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
</svg>;

const markdownRemarkPlugins = [remarkGfm, remarkBreaks];

const stopToolbarEvent = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
};

const isAnswerBlock = (block: MessageBoxBlock) => (
    block.type === 'content' || block.type === 'children'
);

const isActiveBlock = (block: MessageBoxBlock) => {
    if (block.type === 'reasoning' || block.type === 'content') {
        return block.streaming === true;
    }
    if (block.type === 'tool') {
        return block.tool.result === undefined;
    }
    if (block.type === 'tool_use') {
        return block.tools.some(tool => tool.result === undefined);
    }
    return false;
};

const getContentLength = (blocks: MessageBoxBlock[]) => (
    blocks.reduce((total, block) => (
        block.type === 'content' ? total + block.content.trim().length : total
    ), 0)
);

const getContentText = (blocks: MessageBoxBlock[]) => (
    blocks
        .filter((block): block is Extract<MessageBoxBlock, { type: 'content' }> => block.type === 'content')
        .map(block => block.content.trim())
        .filter(Boolean)
        .join('\n')
);

const looksLikeWeakFinalAnswer = (text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length === 0 || normalized.length >= 80) return false;
    return /^(好的|我已|我已经|已经|了解|我了解|完成|这是|以上|接下来)/.test(normalized);
};

const shouldExpandProcessContext = (contextBlocks: MessageBoxBlock[], answerBlocks: MessageBoxBlock[]) => {
    const answerText = getContentText(answerBlocks);
    const answerLength = answerText.length;
    const contextContentLength = getContentLength(contextBlocks);
    const hasLongContextContent = contextContentLength >= Math.max(120, answerLength * 2);

    return answerLength === 0 || (answerLength < 80 && hasLongContextContent) || looksLikeWeakFinalAnswer(answerText);
};

const splitCompactBlocks = (blocks: MessageBoxBlock[]) => {
    let answerStart = blocks.length;
    while (answerStart > 0 && isAnswerBlock(blocks[answerStart - 1])) {
        answerStart -= 1;
    }

    if (answerStart === 0 || answerStart === blocks.length) return null;

    const contextBlocks = blocks.slice(0, answerStart);
    const answerBlocks = blocks.slice(answerStart);
    if (contextBlocks.length <= 1 || answerBlocks.length === 0) return null;

    return {
        contextBlocks,
        answerBlocks,
        defaultExpanded: shouldExpandProcessContext(contextBlocks, answerBlocks),
    };
};

const formatWorkDuration = (seconds: number) => {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const restSeconds = totalSeconds % 60;
    const parts = [];

    if (hours > 0) parts.push(`${hours}h`);
    if (hours > 0 || minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${restSeconds}s`);
    return parts.join(' ');
};

const summarizeProcessContext = (blocks: MessageBoxBlock[]) => {
    let errorToolCount = 0;
    let workSeconds = 0;

    for (const block of blocks) {
        if (block.type === 'reasoning' && block.seconds !== undefined) {
            workSeconds += Math.max(0, block.seconds);
        }
        if (block.type === 'tool') {
            if (block.tool.isError) errorToolCount += 1;
        }
        if (block.type === 'tool_use') {
            errorToolCount += block.tools.filter(tool => tool.isError).length;
        }
    }

    return {
        label: `已工作 ${formatWorkDuration(workSeconds)}`,
        errorToolCount,
    };
};

const ProcessContextSection: React.FC<{
    blocks: MessageBoxBlock[];
    defaultExpanded: boolean;
    renderBlock: (block: MessageBoxBlock, index: number, keyPrefix: string) => React.ReactNode;
}> = ({blocks, defaultExpanded, renderBlock}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    useEffect(() => {
        if (defaultExpanded) setExpanded(true);
    }, [defaultExpanded]);

    const summary = summarizeProcessContext(blocks);

    return (
        <div className={`message-box-process-context${expanded ? ' is-expanded' : ''}`}>
            <button
                className="message-box-process-header"
                onClick={() => setExpanded(v => !v)}
                type="button"
            >
                <span className="message-box-process-label">{summary.label}</span>
                <span className={`message-box-process-chevron${expanded ? ' expanded' : ''}`}/>
                {summary.errorToolCount > 0 && (
                    <span className="message-box-process-warning">
                        包含 {summary.errorToolCount} 个失败工具
                    </span>
                )}
                {defaultExpanded && (
                    <span className="message-box-process-warning">
                        可能包含中间结论
                    </span>
                )}
            </button>
            {expanded && (
                <div className="message-box-process-content">
                    {blocks.map((block, idx) => renderBlock(block, idx, 'process'))}
                </div>
            )}
        </div>
    );
};

// ========================================
// 主组件：MessageBox
// ========================================

export const MessageBox: React.FC<MessageBoxProps> = ({
  role,
                                                        content = '',
  streaming = false,
                                                        markdown = false,
  children,
                                                        className = '',
                                                        style,
                                                        maxWidth = '80%',
                                                        lineHeight,
                                                        reasoning,
                                                        reasoningSeconds,
                                                        reasoningStreaming = false,
                                                        toolCalls,
                                                        toolCallDetail = 'simple',
                                                        blocks,
                                                        contextDisplay = 'full',
                                                        rolePlaying,
                                                        nodeId,
                                                        branchIndex,
                                                        branchTotal,
                                                        onSwitchBranch,
                                                        onCopy,
                                                        onEdit,
                                                        onRegenerate,
                                                        onPlay,
                                                        ...props
}) => {
  const [contentCopied, setContentCopied] = useState(false);

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

  const handleCopy = () => {
    const copyText = blocks
        ? blocks.filter((b): b is Extract<MessageBoxBlock, {
          type: 'content'
        }> => b.type === 'content').map(b => b.content).join('\n')
        : content;
    if (onCopy) {
      onCopy();
    } else if (copyText) {
      navigator.clipboard?.writeText(copyText);
    } else {
      return;
    }
    setContentCopied(true);
    setTimeout(() => setContentCopied(false), 2000);
  };

  const hasNewline = content.includes('\n');
  const showReasoning = reasoning !== undefined || reasoningStreaming;
    const showTools = toolCalls && toolCalls.length > 0 && !rolePlaying;
  const showContent = content.length > 0 || streaming;
  // assistant 默认撑满父容器，不受 maxWidth 约束
  const widthStyle: React.CSSProperties | undefined = role !== 'assistant' && hasNewline ? {maxWidth} : undefined;
  const rootStyle: React.CSSProperties | undefined = widthStyle || style ? {...widthStyle, ...style} : undefined;
  const bubbleStyle: React.CSSProperties | undefined = lineHeight !== undefined ? {lineHeight} : undefined;

  const renderBlock = (block: MessageBoxBlock, idx: number, keyPrefix: string) => {
      const key = block.id ?? `${keyPrefix}-${block.type}-${idx}`;
      switch (block.type) {
        case 'reasoning':
          return (
              <ReasoningSection
                  key={key}
                  reasoning={block.content}
                  reasoningSeconds={block.seconds}
                  reasoningStreaming={block.streaming ?? false}
              />
          );
        case 'tool':
            if (rolePlaying) return null;
          return (
              <div key={key} className="message-box-tools">
                <ToolCallItem tool={block.tool} detail={block.detail ?? 'simple'}/>
              </div>
          );
          case 'tool_use':
              if (rolePlaying) return null;
              return (
                  <div key={key} className="message-box-tools">
                      <ToolUseSection tools={block.tools} detail={block.detail ?? 'simple'}/>
                  </div>
          );
        case 'content':
          return (
              <div key={key} className="message-box-text">
                {block.markdown ? (
                    <>
                      <div className="message-box-markdown">
                        <Markdown remarkPlugins={markdownRemarkPlugins} components={{
                          pre: ({children}) => <>{children}</>,
                          code: CodeBlock
                        }}>
                          {block.content}
                        </Markdown>
                      </div>
                      {block.streaming && <Cursor/>}
                    </>
                ) : (
                    <>
                      {block.content}
                      {block.streaming && <Cursor/>}
                    </>
                )}
              </div>
          );
        case 'children':
          return (
              <div key={key} className="message-box-item-children">
                {block.children}
              </div>
          );
        default:
          return null;
      }
  };

  const renderBlocks = (targetBlocks: MessageBoxBlock[], keyPrefix: string) => {
    if (targetBlocks.length === 0) return null;
    return targetBlocks.map((block, idx) => renderBlock(block, idx, keyPrefix));
  };

  const canCompactBlocks = contextDisplay === 'compact'
      && !streaming
      && !rolePlaying
      && blocks !== undefined
      && blocks.length > 0
      && !blocks.some(isActiveBlock);
  const compactBlocks = canCompactBlocks ? splitCompactBlocks(blocks) : null;
  const blockContent = compactBlocks ? (
      <>
        <ProcessContextSection
            blocks={compactBlocks.contextBlocks}
            defaultExpanded={compactBlocks.defaultExpanded}
            renderBlock={renderBlock}
        />
        {renderBlocks(compactBlocks.answerBlocks, 'answer')}
      </>
  ) : (
      blocks ? renderBlocks(blocks, 'block') : null
  );

  const bubble = blocks && blocks.length > 0 ? (
      <div className="message-box-bubble" style={bubbleStyle}>
        {blockContent}
      </div>
  ) : (
      <div className="message-box-bubble" style={bubbleStyle}>
        {/* 深度思考区域 */}
        {showReasoning && (
            <ReasoningSection
                reasoning={reasoning ?? ''}
                reasoningSeconds={reasoningSeconds}
                reasoningStreaming={reasoningStreaming}
            />
        )}

        {/* 工具调用列表 */}
        {showTools && (
            <div className="message-box-tools">
              {toolCalls!.map(tool => (
                  <ToolCallItem key={tool.index} tool={tool} detail={toolCallDetail}/>
              ))}
            </div>
        )}

        {/* 正文内容 */}
        {showContent && (
            <div className="message-box-text">
              {markdown ? (
                  <>
                    <div className="message-box-markdown">
                      <Markdown remarkPlugins={markdownRemarkPlugins} components={{
                        pre: ({children}) => <>{children}</>,
                        code: CodeBlock
                      }}>{content}</Markdown>
                    </div>
                    {streaming && <Cursor/>}
                  </>
              ) : (
                  <>
                    {content}
                    {streaming && <Cursor/>}
                  </>
              )}
            </div>
        )}

        {/* 额外内容（附件等） */}
        {children && (
            <div className="message-box-item-children">
              {children}
            </div>
        )}
      </div>
  );

  const showBranchNav = branchTotal !== undefined && branchTotal > 1 && onSwitchBranch && nodeId !== undefined;

  const toolbar = role === 'system' ? null : (
      <div className="message-box-actions">
        {showBranchNav && (
            <span className="message-box-branch-nav">
              <button
                  className="message-box-action message-box-branch-btn"
                  data-tooltip="上一个分支"
                  disabled={branchIndex === 1}
                  onMouseDown={stopToolbarEvent}
                  onClick={(event) => {
                      stopToolbarEvent(event);
                      onSwitchBranch?.('prev');
                  }}
                  type="button"
              >◀</button>
              <span className="message-box-branch-label">{branchIndex}/{branchTotal}</span>
              <button
                  className="message-box-action message-box-branch-btn"
                  data-tooltip="下一个分支"
                  disabled={branchIndex === branchTotal}
                  onMouseDown={stopToolbarEvent}
                  onClick={(event) => {
                      stopToolbarEvent(event);
                      onSwitchBranch?.('next');
                  }}
                  type="button"
              >▶</button>
            </span>
        )}
        <button
            className={`message-box-action${contentCopied ? ' message-box-action--active' : ''}`}
            data-tooltip={contentCopied ? '已复制' : '复制'}
            onMouseDown={stopToolbarEvent}
            onClick={(event) => {
                stopToolbarEvent(event);
                handleCopy();
            }}
            type="button"
        >
          {contentCopied ? <IconCheck/> : <IconCopy/>}
        </button>
        {role === 'user' && (
            <button
                className="message-box-action"
                data-tooltip="编辑"
                onMouseDown={stopToolbarEvent}
                onClick={(event) => {
                    stopToolbarEvent(event);
                    onEdit?.();
                }}
                type="button"
            >
              <IconEdit/>
            </button>
        )}
        {role === 'assistant' && (
            <button
                className="message-box-action"
                data-tooltip="重说"
                onMouseDown={stopToolbarEvent}
                onClick={(event) => {
                    stopToolbarEvent(event);
                    onRegenerate?.();
                }}
                type="button"
            >
              <IconRetry/>
            </button>
        )}
        {role === 'assistant' && rolePlaying && (
            <button
                className="message-box-action"
                data-tooltip="播放"
                onMouseDown={stopToolbarEvent}
                onClick={(event) => {
                    stopToolbarEvent(event);
                    onPlay?.();
                }}
                type="button"
            >
              <IconPlay/>
            </button>
        )}
    </div>
  );

  return (
      <div
          {...props}
          className={`message-box-item ${getRoleClass()} ${className}`}
          style={rootStyle}
      >
        <div className="message-box-content">
          {role === 'assistant' && rolePlaying ? (
              <div className="message-box-role-frame">
                {bubble}
              </div>
          ) : bubble}
          {toolbar}
        </div>
    </div>
  );
};

MessageBox.displayName = 'MessageBox';
