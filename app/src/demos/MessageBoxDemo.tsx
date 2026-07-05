import {useEffect, useRef, useState} from 'react'
import {MessageBox, type MessageBoxBlock} from 'flowcloudai-ui/MessageBox'

const markdownSamples = [
    {
        id: 'md-text',
        content: [
            '# 一级标题',
            '## 二级标题',
            '### 三级标题',
            '',
            '普通段落包含 **加粗**、*斜体*、***粗斜体***、~~删除线~~、`行内代码`。',
            '这一行后面有两个空格  ',
            '下一行用于检查软换行和段落间距。',
            '',
            '---',
            '',
            'HTML 会按安全文本处理：<mark>不会直接当作真实标签执行</mark>。',
        ].join('\n'),
    },
    {
        id: 'md-lists',
        content: [
            '## 列表、任务和引用',
            '',
            '- 无序列表 A',
            '- 无序列表 B',
            '  - 嵌套项目 B-1',
            '  - 嵌套项目 B-2',
            '',
            '1. 有序列表第一项',
            '2. 有序列表第二项',
            '   1. 嵌套编号',
            '',
            '- [x] 已完成任务',
            '- [ ] 待完成任务',
            '',
            '> 一级引用',
            '> > 嵌套引用',
            '> ',
            '> 引用里也可以有 **强调** 和 `代码`。',
        ].join('\n'),
    },
    {
        id: 'md-table',
        content: [
            '## 表格',
            '',
            '| 语法 | 状态 | 说明 |',
            '| --- | :---: | ---: |',
            '| 标题 | 通过 | 左对齐 |',
            '| 表格 | 通过 | 右对齐 |',
            '| `inline code` | 通过 | 12 |',
        ].join('\n'),
    },
    {
        id: 'md-code',
        content: [
            '## 代码块',
            '',
            '```tsx',
            'import {MessageBox} from "flowcloudai-ui/MessageBox"',
            '',
            'export function Preview() {',
            '    return <MessageBox role="assistant" markdown content="**你好**" />',
            '}',
            '```',
            '',
            '```json',
            '{',
            '  "markdown": true,',
            '  "formats": ["table", "code", "footnote"]',
            '}',
            '```',
        ].join('\n'),
    },
    {
        id: 'md-links',
        content: [
            '## 链接、图片和脚注',
            '',
            '[普通链接](https://example.com)',
            '',
            '<https://example.com/autolink>',
            '',
            '![占位图](https://placehold.co/320x120/png?text=FlowCloudAI)',
            '',
            '这句话带有脚注。[^note]',
            '',
            '[^note]: 这是 GFM 脚注内容，用于检查脚注样式。',
        ].join('\n'),
    },
]

export default function MessageBoxDemo() {
    const [messages] = useState<Array<{
        id: string
        role: 'user' | 'assistant' | 'system'
        content: string
        markdown?: boolean
    }>>([
        {
            id: 'msg-1',
            role: 'assistant',
            content: '你好！我是流云 AI 助手，有什么可以帮助你的吗？'
        },
        {
            id: 'msg-2',
            role: 'user',
            content: '请帮我解释一下 React 的虚拟列表是什么？还有代码示例吗？'
        },
        {
            id: 'msg-3',
            role: 'assistant',
            markdown: true,
            content: `虚拟列表（Virtual List）是一种**性能优化技术**，用于高效渲染大量数据的列表。
## 核心原理

只渲染**视口内可见**的项目，而非全部数据，显著减少 DOM 节点数量。

## 主要优势

- 内存占用低
- 渲染速度快
- 支持百万级数据

## 简单示例

\`\`\`tsx
import { FixedSizeList } from 'react-window'

const items = Array.from({ length: 100000 }, (_, i) => ({
  id: i,
  label: \`Item \${i}\`
}))

<FixedSizeList
  height={320}
  itemCount={items.length}
  itemSize={40}
  width="100%"
>
  {({ index, style }) => <div style={style}>{items[index].label}</div>}
</FixedSizeList>
\`\`\`

> 💡 大列表建议优先使用成熟虚拟滚动库；组件库内的虚拟列表仅供 Tree 内部使用。`
        },
    ])

    // ── 深度思考演示 ───────────────────────────────────────────────────────────
    const [reasoningText, setReasoningText] = useState('')
    const [reasoningDone, setReasoningDone] = useState(false)
    const [reasoningSeconds, setReasoningSeconds] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const thinking = `用户问的是虚拟列表相关内容……
让我先思考核心原理：DOM 节点数量与性能的关系。
浏览器每次重排（reflow）都需要遍历所有可见节点，节点越多越慢。
虚拟列表只保留窗口内的节点，通常是 10~30 个，无论数据多大性能恒定。
关键技术点：

1. 计算可见范围 startIndex / endIndex
2. 用 paddingTop / paddingBottom 撑开滚动容器
3. 监听 scroll 事件动态更新范围`

        let idx = 0
        let secs = 0

        timerRef.current = setInterval(() => {
            secs += 1
            setReasoningSeconds(secs)
            if (idx < thinking.length) {
                idx = Math.min(idx + 8, thinking.length)
                setReasoningText(thinking.slice(0, idx))
            } else {
                clearInterval(timerRef.current!)
                setReasoningDone(true)
            }
        }, 80)

        return () => clearInterval(timerRef.current!)
    }, [])

    // ── 工具调用演示 ───────────────────────────────────────────────────────────
    const toolCallsSimple = [
        {index: 0, name: 'web_search', result: '搜索完成'},
        {index: 1, name: 'read_file', args: '{"path":"/data/config.json"}', result: '{"version":"1.2.0"}'},
        {index: 2, name: 'pending_tool'}, // 尚未收到 result，显示 spinner
    ]

    const toolCallsVerbose = [
        {
            index: 0,
            name: 'fetching_data', // 调用中，尚无 result
        },
        {
            index: 2,
            name: 'web_search',
            args: JSON.stringify({query: 'React virtual list performance', limit: 5}, null, 2),
            result: JSON.stringify([
                {title: 'React Window - GitHub', url: 'https://github.com/bvaughn/react-window'},
                {title: 'Virtualized lists in React', url: 'https://web.dev/virtualize-long-lists-react-window'},
            ], null, 2),
        },
        {
            index: 3,
            name: 'run_code',
            args: JSON.stringify({language: 'python', code: 'import sys\nprint(sys.version)'}, null, 2),
            result: '3.11.4 (main, Jul  5 2023, 13:45:01)',
        },
        {
            index: 4,
            name: 'broken_tool',
            args: JSON.stringify({input: 'test'}, null, 2),
            result: 'Error: connection timeout after 30s',
            isError: true,
        },
    ]

    // ── 流式正文演示 ───────────────────────────────────────────────────────────
    const [streamingContent, setStreamingContent] = useState('')
    const [isStreaming, setIsStreaming] = useState(false)

    useEffect(() => {
        const fullContent = `好的，这是一个**流式 Markdown** 输出示例：
1. 文字会**逐字**出现
2. 支持 \`代码\`、*斜体* 等格式
3. 渲染实时更新`
        let currentIndex = 0
        setIsStreaming(true)

        const interval = setInterval(() => {
            if (currentIndex < fullContent.length) {
                currentIndex += 2
                setStreamingContent(fullContent.slice(0, currentIndex))
            } else {
                clearInterval(interval)
                setIsStreaming(false)
            }
        }, 50)

        return () => clearInterval(interval)
    }, [])

    // ── blocks 顺序渲染演示 ────────────────────────────────────────────────────
    const [blockMessages, setBlockMessages] = useState<MessageBoxBlock[]>([])
    const blockStepRef = useRef(0)

    useEffect(() => {
        const sequence: MessageBoxBlock[] = [
            {type: 'reasoning', content: '用户需要计算复杂表达式，我先拆解步骤…', streaming: false, seconds: 2},
            {type: 'tool', tool: {index: 0, name: 'calculator', args: '{"expr":"1+1"}', result: '2'}},
            {type: 'content', content: '第一步结果是 **2**。', markdown: true},
            {type: 'tool',
                tool: {
                    index: 1,
                    name: 'risky_tool',
                    args: '{"input":"x"}',
                    result: 'Error: invalid input',
                    isError: true
                }
            },
            {type: 'tool', tool: {index: 2, name: 'calculator', args: '{"expr":"2*3"}', result: '6'}},
            {type: 'content', content: '虽然中间工具出错，但第二步结果是 6，最终答案为 `6`。', markdown: true},
        ]

        blockStepRef.current = 0
        setBlockMessages([])
        const interval = setInterval(() => {
            if (blockStepRef.current < sequence.length) {
                const current = sequence[blockStepRef.current]
                setBlockMessages(prev => [...prev, current])
                blockStepRef.current += 1
            } else {
                clearInterval(interval)
            }
        }, 600)

        return () => clearInterval(interval)
    }, [])

    // ── 复杂 blocks 顺序渲染演示：思考 → 工具 → 思考 → 内容 → 工具 → 思考 → 内容 ──
    const [complexBlockMessages, setComplexBlockMessages] = useState<MessageBoxBlock[]>([])
    const complexBlockStepRef = useRef(0)

    useEffect(() => {
        const sequence: MessageBoxBlock[] = [
            {
                type: 'reasoning',
                content: '用户要求分析 2024 年全球 AI 发展趋势，我需要先整理主要方向：大语言模型演进、多模态能力、AI Agent 爆发、代码生成工具普及，以及硬件基础设施变化。',
                streaming: false,
                seconds: 3,
            },
            {
                type: 'tool',
                tool: {
                    index: 0,
                    name: 'web_search',
                    args: JSON.stringify({query: '2024 global AI development trends report'}, null, 2),
                    result: JSON.stringify([
                        {
                            title: 'The State of AI Report 2024',
                            summary: 'Multimodal models and AI agents dominated the landscape.'
                        },
                        {
                            title: 'Global AI Market Analysis',
                            summary: 'Enterprise adoption of coding assistants reached 62%.'
                        },
                    ], null, 2),
                },
            },
            {
                type: 'reasoning',
                content: '搜索结果显示了几个关键趋势：1) 多模态模型成为技术主流；2) AI Agent 在下半年爆发式增长；3) 代码生成工具的企业采纳率达到 62%。我还需要获取更具体的市场规模数据来支撑结论。',
                streaming: false,
                seconds: 4,
            },
            {
                type: 'content',
                content: '根据初步信息检索，2024 年全球 AI 发展的**三大核心趋势**已经清晰：\n\n1. **多模态融合** — 文本、图像、音频、视频的端到端模型成为头部厂商竞争焦点\n2. **Agent 化应用** — 从"对话"走向"行动"，具备规划、记忆和工具调用能力的 Agent 快速落地\n3. **代码智能普及** — 企业开发者对 AI 编程助手的采纳率突破 60%',
                markdown: true,
            },
            {
                type: 'tool',
                tool: {
                    index: 1,
                    name: 'fetch_market_data',
                    args: JSON.stringify({metric: 'generative_ai_market_size', year: 2024}, null, 2),
                    result: JSON.stringify({market_size_usd: 67000000000, yoy_growth: '+47%'}, null, 2),
                },
            },
            {
                type: 'reasoning',
                content: '市场数据确认了高速增长：生成式 AI 市场规模达到 670 亿美元，同比增长 47%。这说明技术落地已经跨越早期采用阶段，进入主流市场。让我综合所有信息，给出最终结论。',
                streaming: false,
                seconds: 2,
            },
            {
                type: 'content',
                content: '## 综合分析结论\n\n2024 年是全球 AI 从**"对话工具"**向**"智能体"**转型的关键年份。`多模态`和`Agent`技术的成熟，正在重塑生产力工具的形态。\n\n- 生成式 AI 市场规模已达 **670 亿美元**，增速 **47%**\n- 超过 **62%** 的企业开发者已使用代码生成助手\n- 预计到 2025 年，超过 **50%** 的企业将部署至少一种 AI Agent 解决方案\n\n> 📈 数据来源：2024 State of AI Report & Global Market Analysis',
                markdown: true,
            },
        ]

        complexBlockStepRef.current = 0
        setComplexBlockMessages([])
        const interval = setInterval(() => {
            if (complexBlockStepRef.current < sequence.length) {
                const current = sequence[complexBlockStepRef.current]
                setComplexBlockMessages(prev => [...prev, current])
                complexBlockStepRef.current += 1
            } else {
                clearInterval(interval)
            }
        }, 700)

        return () => clearInterval(interval)
    }, [])

    // ── tool_use 容器 block 演示：同类型工具合并 ──
    const [toolUseBlocks, setToolUseBlocks] = useState<MessageBoxBlock[]>([])
    const toolUseStepRef = useRef(0)

    useEffect(() => {
        const sequence: MessageBoxBlock[] = [
            {
                type: 'reasoning',
                content: '我需要同时搜索多个方向来获取全面的信息。',
                streaming: false,
                seconds: 1,
            },
            {
                type: 'tool_use',
                tools: [
                    {
                        index: 0,
                        name: 'web_search',
                        args: JSON.stringify({query: '2024 AI trends'}, null, 2),
                        result: JSON.stringify([{
                            title: 'AI Trends 2024',
                            summary: 'Multimodal and agentic AI dominate.'
                        }], null, 2),
                    },
                    {
                        index: 1,
                        name: 'web_search',
                        args: JSON.stringify({query: '2024 AI market size'}),
                        result: JSON.stringify([{
                            title: 'AI Market 2024',
                            summary: 'Generative AI market reached $67B.'
                        }], null, 2),
                    },
                    {
                        index: 2,
                        name: 'web_search',
                        args: JSON.stringify({query: '2024 AI agents adoption'}),
                        result: JSON.stringify([{
                            title: 'AI Agents 2024',
                            summary: 'Enterprise adoption exceeding 50%.'
                        }], null, 2),
                    },
                ],
                detail: 'verbose',
            },
            {
                type: 'content',
                content: '搜索结果显示：多模态AI成为主流，市场规模达670亿美元，企业AI Agent采用率超过50%。',
                markdown: false,
            },
        ]

        toolUseStepRef.current = 0
        setToolUseBlocks([])
        const interval = setInterval(() => {
            if (toolUseStepRef.current < sequence.length) {
                const current = sequence[toolUseStepRef.current]
                setToolUseBlocks(prev => [...prev, current])
                toolUseStepRef.current += 1
            } else {
                clearInterval(interval)
            }
        }, 700)

        return () => clearInterval(interval)
    }, [])

    // ── 紧凑过程上下文演示 ───────────────────────────────────────────────────
    const compactContextBlocks: MessageBoxBlock[] = [
        {
            type: 'reasoning',
            content: '用户需要了解项目结构，我先确认词条、标签和关联关系，再组织最终回答。',
            seconds: 2,
        },
        {
            type: 'content',
            content: '我会先查看项目词条，再补充标签定义，避免只凭局部信息回答。',
            markdown: false,
        },
        {
            type: 'tool',
            tool: {
                index: 0,
                name: 'list_entries',
                args: JSON.stringify({project: 'demo'}, null, 2),
                result: JSON.stringify([{title: '世界设定'}, {title: '角色档案'}], null, 2),
            },
            detail: 'verbose',
        },
        {
            type: 'content',
            content: '词条列表显示项目重点集中在世界设定和角色档案，我继续查看标签定义。',
            markdown: false,
        },
        {
            type: 'tool',
            tool: {
                index: 1,
                name: 'get_tags',
                args: JSON.stringify({project: 'demo'}, null, 2),
                result: JSON.stringify(['势力', '角色', '地点'], null, 2),
            },
            detail: 'verbose',
        },
        {
            type: 'content',
            content: '这个项目主要围绕世界设定、角色档案和地点信息组织内容。标签体系以“势力、角色、地点”为主，适合继续补充角色关系和地点归属，下一步建议先完善核心势力与角色之间的关联。',
            markdown: true,
        },
    ]

    const riskyCompactContextBlocks: MessageBoxBlock[] = [
        {
            type: 'content',
            content: '过程信息：我查到项目里有“世界设定、角色档案、地点索引”三类核心词条，其中角色档案数量最多；标签里“势力”和“地点”使用频率最高，说明后续整理时应该优先补全角色和势力之间的关系。',
            markdown: false,
        },
        {
            type: 'tool',
            tool: {
                index: 0,
                name: 'get_project_summary',
                result: '项目摘要已获取',
            },
        },
        {
            type: 'content',
            content: '我已经了解完了。',
            markdown: false,
        },
    ]

    return (
        <>
            <div className="demo-section">
                <div style={{maxWidth: '900px'}}>
                    <div className="message-box">
                        {/* 普通消息 */}
                        {messages.map((message) => (
                            <MessageBox
                                key={message.id}
                                role={message.role}
                                content={message.content}
                                markdown={message.markdown}
                            />
                        ))}

                        <MessageBox
                            role="user"
                            content="展示 Markdown 渲染覆盖样例"
                        />
                        {markdownSamples.map((sample) => (
                            <MessageBox
                                key={sample.id}
                                role="assistant"
                                content={sample.content}
                                markdown
                            />
                        ))}

                        {/* 深度思考（流式） */}
                        <MessageBox
                            role="assistant"
                            content={reasoningDone ? '虚拟列表的核心是只渲染视口内的节点，用 padding 撑开容器模拟完整高度，再监听 scroll 动态替换节点。' : ''}
                            reasoning={reasoningText}
                            reasoningSeconds={reasoningSeconds}
                            reasoningStreaming={!reasoningDone}
                            streaming={!reasoningDone && reasoningText.length > 0}
                        />

                        {/* 系统信息 */}
                        <MessageBox
                            role="system"
                            content='系统提示词'
                            reasoningSeconds={reasoningSeconds}
                            reasoningStreaming={!reasoningDone}
                            streaming={!reasoningDone && reasoningText.length > 0}
                        />

                        {/* 工具调用 simple 模式 */}
                        <MessageBox
                            role="user"
                            content="帮我搜索一下并读取配置文件"
                        />
                        <MessageBox
                            role="assistant"
                            content="我已搜索网页并读取了配置文件，这是结果摘要。"
                            toolCalls={toolCallsSimple}
                            toolCallDetail="simple"
                        />

                        {/* 工具调用 verbose 模式（含错误） */}
                        <MessageBox
                            role="user"
                            content="帮我搜索资料、运行代码，还有调用一个会出错的工具"
                        />
                        <MessageBox
                            role="assistant"
                            content={`搜索已完成，代码执行成功。\n\n注意：\`broken_tool\` 调用失败，请检查网络连接后重试。`}
                            markdown
                            toolCalls={toolCallsVerbose}
                            toolCallDetail="verbose"
                        />

                        {/* 角色扮演包裹框（含工具调用数据，但不渲染工具 UI） */}
                        <MessageBox
                            role="user"
                            content="你现在扮演一位苏格拉底风格的哲学老师"
                        />
                        <MessageBox
                            role="assistant"
                            content="好的，我来扮演苏格拉底。那么，请告诉我——什么是正义？你真的认为你知道吗？
我们可以通过对话来一步步揭示这个问题的本质。"
                            rolePlaying={true}
                            toolCalls={[
                                {
                                    index: 0,
                                    name: 'get_persona',
                                    args: '{"name":"Socrates"}',
                                    result: '{"style":"dialectic"}'
                                },
                                {index: 1, name: 'load_context', result: '加载完成'},
                            ]}
                            toolCallDetail="verbose"
                        />
                        <MessageBox
                            role="assistant"
                            markdown
                            content="你说得对！我注意到工具列表中确实有两个带‘dev’的开发版工具：

## 🔧 两个开发版工具

### 1. `get_entries_dev`
- **功能**：按项目或分类的名称/ID 获取词条轻量列表
- **返回信息**：词条标题、ID 和类型
- **过滤选项**：可按词条类型名称/ID/key 过滤
- **参数**：`key`, `kind`

### 2. `get_entry_dev`
- **功能**：按词条名称/ID 获取高密度词条上下文
- **返回信息**：默认返回全量，可用 `info` 选择字段
  - `TITLE`：标题
  - `TYPE`：类型
  - `SUM`：摘要
  - `TAG`：标签
  - `CONTENT`：正文
  - `RELATIONS`：关联关系
- **参数**：`key`, `info`（数组）

---

你想测试哪个工具的哪方面功能呢？比如：
- 📋 获取项目中的词条列表？
- 📖 获取特定词条的详细信息？
- 🔍 按类型过滤词条？
- 🎯 测试不同的 `info` 字段组合？

请告诉我你想怎么测试，我来帮你执行！### 🔬 测试 3️⃣：仅获取 RELATIONS（关联关系）+ CONTENT（正文）
"
                        />
                        {/* 角色扮演 blocks 模式（tool block 被静默跳过） */}
                        <MessageBox
                            role="assistant"
                            rolePlaying={true}
                            blocks={[
                                {
                                    type: 'tool',
                                    tool: {
                                        index: 0,
                                        name: 'lookup_philosophy',
                                        args: '{"topic":"justice"}',
                                        result: '柏拉图：正义是各司其职'
                                    }
                                },
                                {
                                    type: 'content',
                                    content: '我听到你的问题了。但在我回答之前，你能告诉我你心中的正义是什么样的吗？',
                                    markdown: false
                                },
                            ]}
                        />

                        {/* 流式正文 */}
                        {streamingContent && (
                            <MessageBox
                                role="assistant"
                                content={streamingContent}
                                streaming={isStreaming}
                                markdown
                            />
                        )}

                        {/* blocks 顺序渲染：思考 → 工具 → content → 再工具 */}
                        <MessageBox
                            role="user"
                            content="帮我算一下 (1+1)*3 的步骤"
                        />
                        <MessageBox
                            role="assistant"
                            blocks={blockMessages}
                        />

                        {/* blocks 复杂顺序渲染：思考 → 工具 → 思考 → 内容 → 工具 → 思考 → 内容 */}
                        <MessageBox
                            role="user"
                            content="帮我分析一下 2024 年全球 AI 发展趋势"
                        />
                        <MessageBox
                            role="assistant"
                            blocks={complexBlockMessages}
                        />

                        {/* tool_use 容器 block：同类工具合并，双层折叠 */}
                        <MessageBox
                            role="user"
                            content="帮我搜索一下 AI 发展趋势、市场规模和 Agent 采用率"
                        />
                        <MessageBox
                            role="assistant"
                            blocks={toolUseBlocks}
                        />

                        {/* 紧凑过程上下文：完整保留过程，默认只突出最终回答 */}
                        <MessageBox
                            role="user"
                            content="了解这个项目，并给出整理建议"
                        />
                        <MessageBox
                            role="assistant"
                            blocks={compactContextBlocks}
                            contextDisplay="compact"
                        />

                        {/* 风险降级：最终回答太短时，过程上下文默认展开 */}
                        <MessageBox
                            role="user"
                            content="如果重要信息出现在过程中，会不会被隐藏？"
                        />
                        <MessageBox
                            role="assistant"
                            blocks={riskyCompactContextBlocks}
                            contextDisplay="compact"
                        />
                    </div>
                </div>
            </div>
        </>
    )
}
