// app/src/demos/RelationGraphDemo.tsx
// Demonstrates RelationGraph with a mock layout function.
// The mock layout function arranges nodes in a simple grid — this is NOT a real
// layout algorithm.  In production the host would supply a Tauri invoke or HTTP
// call that runs a real graph-layout backend.

import { useMemo, useRef, useState } from 'react';
import { Button, RelationGraph } from 'flowcloudai-ui';
import type {
    LayoutFunction,
    LayoutNode,
    LayoutRequest,
    LayoutResponse,
    RelationEdgeInput,
    RelationGraphRef,
    RelationLayoutState,
    RelationNodeInput,
} from 'flowcloudai-ui';

// ─── EntryBrief-style node (mirrors the Rust struct) ─────────────────────────
interface EntryNode extends RelationNodeInput {
    id:           string;
    title:        string;
    type?:        string;
    summary?:     string;
    cover?:       string;
    category_id?: string;
}

// ─── Mock layout function (grid arrangement) ─────────────────────────────────
// This simulates a backend that takes a LayoutRequest and returns positions.
// Replace this with `invoke('layout', request)` or `fetch('/api/layout', ...)`.

const mockGridLayout: LayoutFunction = async (
    request: LayoutRequest,
): Promise<LayoutResponse> => {
    // Simulate async round-trip (e.g. IPC or HTTP)
    await new Promise(resolve => setTimeout(resolve, 600));

    if (request.nodes.length === 0) {
        return { positions: {}, bounds: { x: 0, y: 0, width: 0, height: 0 } };
    }

    const cols = Math.max(1, Math.ceil(Math.sqrt(request.nodes.length)));
    const hGap = 200;
    const vGap = 120;

    const positions: Record<string, { x: number; y: number }> = {};
    request.nodes.forEach((node: LayoutNode, i: number) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions[node.id] = {
            x: col * hGap,
            y: row * vGap,
        };
    });

    const rows = Math.ceil(request.nodes.length / cols);
    return {
        positions,
        bounds: {
            x: 0,
            y: 0,
            width: cols * hGap,
            height: rows * vGap,
        },
    };
};

// ─── Dataset fixtures ─────────────────────────────────────────────────────────

const SCENARIO_SMALL: { nodes: RelationNodeInput[]; edges: RelationEdgeInput[] } = {
    nodes: [
        { id: 'alice',   label: 'Alice' },
        { id: 'bob',     label: 'Bob' },
        { id: 'carol',   label: 'Carol' },
        { id: 'dave',    label: 'Dave' },
    ],
    edges: [
        { source: 'alice', target: 'bob',   label: '同事',   kind: 'two_way' },
        { source: 'bob',   target: 'alice',                  kind: 'two_way' },   // reverse of above
        { source: 'alice', target: 'carol', label: '朋友' },
        { source: 'bob',   target: 'dave',  label: '上级' },
        { source: 'carol', target: 'dave',  label: '认识' },
    ],
};

const SCENARIO_LARGE: { nodes: RelationNodeInput[]; edges: RelationEdgeInput[] } = {
    nodes: Array.from({ length: 12 }, (_, i) => ({
        id: `node-${i}`,
        label: `节点 ${i + 1}`,
    })),
    edges: [
        { source: 'node-0',  target: 'node-1'  },
        { source: 'node-1',  target: 'node-2'  },
        { source: 'node-2',  target: 'node-3'  },
        { source: 'node-3',  target: 'node-0'  },
        { source: 'node-4',  target: 'node-5'  },
        { source: 'node-5',  target: 'node-4',  kind: 'two_way' },  // bidirectional pair
        { source: 'node-4',  target: 'node-6'  },
        { source: 'node-7',  target: 'node-8'  },
        { source: 'node-8',  target: 'node-9'  },
        { source: 'node-9',  target: 'node-10' },
        { source: 'node-10', target: 'node-11' },
        { source: 'node-11', target: 'node-7'  },
        { source: 'node-0',  target: 'node-4'  },
        { source: 'node-4',  target: 'node-7'  },
    ],
};

const SCENARIO_EMPTY: { nodes: RelationNodeInput[]; edges: RelationEdgeInput[] } = {
    nodes: [],
    edges: [],
};

const SCENARIO_SINGLE: { nodes: RelationNodeInput[]; edges: RelationEdgeInput[] } = {
    nodes: [{ id: 'solo', label: '孤立节点' }],
    edges: [],
};

type ScenarioKey = 'small' | 'large' | 'empty' | 'single';

const SCENARIOS: Record<ScenarioKey, { label: string; data: typeof SCENARIO_SMALL }> = {
    small:  { label: '小图（双向边）', data: SCENARIO_SMALL  },
    large:  { label: '多分量图',       data: SCENARIO_LARGE  },
    single: { label: '单节点',         data: SCENARIO_SINGLE },
    empty:  { label: '空图',           data: SCENARIO_EMPTY  },
};

// ─── EntryBrief 假数据 ────────────────────────────────────────────────────────

const ENTRY_NODES: EntryNode[] = [
    { id: 'e1', title: '项目计划', type: '文档',  summary: '2026 Q2 路线图',          cover: 'https://api.dicebear.com/9.x/shapes/svg?seed=e1' },
    { id: 'e2', title: '需求评审', type: '会议',  summary: '与产品对齐核心功能',       cover: 'https://api.dicebear.com/9.x/shapes/svg?seed=e2' },
    { id: 'e3', title: 'UI 设计',  type: '设计',  summary: '组件库视觉规范',           cover: 'https://api.dicebear.com/9.x/shapes/svg?seed=e3' },
    { id: 'e4', title: '前端实现', type: '任务',  summary: 'RelationGraph 组件开发',   cover: 'https://api.dicebear.com/9.x/shapes/svg?seed=e4' },
    { id: 'e5', title: '后端接口', type: '任务',  summary: 'Tauri layout invoke',      cover: 'https://api.dicebear.com/9.x/shapes/svg?seed=e5' },
    { id: 'e6', title: '测试报告', type: '文档',  summary: 'E2E 自动化测试结果',       cover: 'https://api.dicebear.com/9.x/shapes/svg?seed=e6' },
];

const ENTRY_EDGES: RelationEdgeInput[] = [
    { source: 'e1', target: 'e2', kind: 'one_way', label: '触发' },
    { source: 'e2', target: 'e3', kind: 'one_way', label: '产出' },
    { source: 'e2', target: 'e4', kind: 'one_way', label: '产出' },
    { source: 'e2', target: 'e5', kind: 'one_way', label: '产出' },
    { source: 'e3', target: 'e4', kind: 'two_way', label: '对齐' },
    { source: 'e4', target: 'e3', kind: 'two_way' },
    { source: 'e4', target: 'e6', kind: 'one_way', label: '输入' },
    { source: 'e5', target: 'e6', kind: 'one_way', label: '输入' },
];

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function RelationGraphDemo() {
    const graphRef = useRef<RelationGraphRef>(null);
    const [scenario, setScenario] = useState<ScenarioKey>('small');
    const [exportPadding, setExportPadding] = useState('32');
    const [exportScale, setExportScale] = useState('2');
    const [exporting, setExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState<string>('');
    const [status, setStatus] = useState<RelationLayoutState>({
        layoutReady: false,
        layoutLoading: false,
        layoutError: null,
    });

    const { nodes, edges } = useMemo(
        () => SCENARIOS[scenario].data,
        [scenario],
    );

    const runExport = async (format: 'png' | 'jpeg') => {
        if (!graphRef.current) return;

        try {
            setExporting(true);
            setExportMessage('');

            const result = await graphRef.current.downloadImage({
                format,
                padding: Number(exportPadding) || 32,
                scale: Number(exportScale) || 2,
                backgroundColor: '#ffffff',
                fileName: `relation-graph-${scenario}`,
            });

            setExportMessage(
                `已导出 ${result.fileName}，AABB: x=${Math.round(result.bounds.x)}, y=${Math.round(result.bounds.y)}, width=${Math.round(result.bounds.width)}, height=${Math.round(result.bounds.height)}`,
            );
        } catch (error) {
            setExportMessage(error instanceof Error ? error.message : String(error));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="demo-section" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4>关系图谱（RelationGraph）</h4>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {(Object.keys(SCENARIOS) as ScenarioKey[]).map(key => (
                    <button
                        key={key}
                        onClick={() => setScenario(key)}
                        style={{
                            padding: '4px 14px',
                            borderRadius: 6,
                            border: '1.5px solid',
                            borderColor: scenario === key ? 'var(--fc-color-primary)' : 'var(--fc-color-border)',
                            background: scenario === key ? 'var(--fc-color-primary-subtle)' : 'transparent',
                            color: scenario === key ? 'var(--fc-color-primary)' : 'var(--fc-color-text)',
                            cursor: 'pointer',
                            fontFamily: 'var(--fc-font-family)',
                            fontSize: 'var(--fc-font-size-sm)',
                        }}
                    >
                        {SCENARIOS[key].label}
                    </button>
                ))}

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fc-font-size-xs)' }}>
                    <span>导出留白</span>
                    <input
                        type="number"
                        min={0}
                        step={4}
                        value={exportPadding}
                        onChange={e => setExportPadding(e.target.value)}
                        style={{
                            width: 84,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--fc-color-border)',
                            background: 'var(--fc-color-bg-elevated)',
                            color: 'var(--fc-color-text)',
                        }}
                    />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fc-font-size-xs)' }}>
                    <span>清晰度</span>
                    <input
                        type="number"
                        min={1}
                        max={4}
                        step={0.5}
                        value={exportScale}
                        onChange={e => setExportScale(e.target.value)}
                        style={{
                            width: 72,
                            padding: '4px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--fc-color-border)',
                            background: 'var(--fc-color-bg-elevated)',
                            color: 'var(--fc-color-text)',
                        }}
                    />
                </label>

                <Button
                    size="sm"
                    onClick={() => void runExport('png')}
                    disabled={exporting || status.layoutLoading || !status.layoutReady}
                >
                    导出 PNG
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runExport('jpeg')}
                    disabled={exporting || status.layoutLoading || !status.layoutReady}
                >
                    导出 JPEG
                </Button>

                {/* Layout status badge */}
                <span
                    style={{
                        marginLeft: 'auto',
                        fontSize: 'var(--fc-font-size-xs)',
                        color: status.layoutError
                            ? 'var(--fc-color-danger)'
                            : status.layoutLoading
                                ? 'var(--fc-color-text-secondary)'
                                : status.layoutReady
                                    ? 'var(--fc-color-success)'
                                    : 'var(--fc-color-text-tertiary)',
                    }}
                >
                    {status.layoutError
                        ? `错误: ${status.layoutError.message}`
                        : status.layoutLoading
                            ? '布局中…'
                            : status.layoutReady
                                ? '布局完成'
                                : '等待中'}
                </span>
            </div>

            <p style={{ fontSize: 'var(--fc-font-size-xs)', color: 'var(--fc-color-text-secondary)', margin: 0 }}>
                导出会自动读取当前所有节点的 AABB，并按上面的留白和清晰度参数生成图片。
            </p>
            {exportMessage && (
                <p style={{ fontSize: 'var(--fc-font-size-xs)', color: 'var(--fc-color-text-secondary)', margin: 0 }}>
                    {exportMessage}
                </p>
            )}

            {/* Graph canvas */}
            <div style={{ height: 500, borderRadius: 8, overflow: 'hidden' }}>
                <RelationGraph
                    ref={graphRef}
                    nodes={nodes}
                    edges={edges}
                    layoutFn={mockGridLayout}
                    fitPadding={0.12}
                    fitDuration={400}
                    onLayoutStateChange={setStatus}
                    width="100%"
                    height="100%"
                />
            </div>

            <p style={{ fontSize: 'var(--fc-font-size-xs)', color: 'var(--fc-color-text-tertiary)', margin: 0 }}>
                当前使用网格布局模拟函数。在宿主项目中替换 <code>layoutFn</code> 为真实后端调用（如 Tauri <code>invoke</code> 或 HTTP 请求）即可。
            </p>

            {/* ── renderNode 示例 ── */}
            <h4 style={{ marginTop: 8, marginBottom: 0 }}>自定义节点（renderNode）</h4>
            <p style={{ fontSize: 'var(--fc-font-size-xs)', color: 'var(--fc-color-text-secondary)', margin: 0 }}>
                使用 EntryBrief 结构的假数据，由调用方完全控制节点外观。
            </p>
            <div style={{ height: 500, borderRadius: 8, overflow: 'hidden' }}>
                <RelationGraph
                    nodes={ENTRY_NODES}
                    edges={ENTRY_EDGES}
                    layoutFn={mockGridLayout}
                    renderNode={(data: RelationNodeInput, selected: boolean) => {
                        const d = data as EntryNode;
                        return (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px',
                                background: selected
                                    ? 'var(--fc-color-primary-subtle)'
                                    : 'var(--fc-color-bg-elevated)',
                                border: `1.5px solid ${selected ? 'var(--fc-color-primary)' : 'var(--fc-color-border)'}`,
                                borderRadius: 8,
                                boxShadow: 'var(--fc-shadow-sm)',
                                minWidth: 160,
                                fontFamily: 'var(--fc-font-family)',
                            }}>
                                {d.cover && (
                                    <img src={d.cover} alt="" style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        objectFit: 'cover', flexShrink: 0,
                                    }} />
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 'var(--fc-font-size-sm)',
                                        fontWeight: 500,
                                        color: 'var(--fc-color-text)',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {d.title}
                                    </div>
                                    {d.summary && (
                                        <div style={{
                                            fontSize: 'var(--fc-font-size-xs)',
                                            color: 'var(--fc-color-text-secondary)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {d.summary}
                                        </div>
                                    )}
                                </div>
                                {d.type && (
                                    <span style={{
                                        fontSize: 'var(--fc-font-size-xs)',
                                        padding: '1px 6px',
                                        borderRadius: 'var(--fc-radius-full)',
                                        background: 'var(--fc-color-primary-subtle)',
                                        color: 'var(--fc-color-primary)',
                                        flexShrink: 0,
                                        marginLeft: 'auto',
                                    }}>
                                        {d.type}
                                    </span>
                                )}
                            </div>
                        );
                    }}
                    fitPadding={0.15}
                    width="100%"
                    height="100%"
                />
            </div>
        </div>
    );
}
