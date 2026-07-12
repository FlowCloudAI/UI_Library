import {type CSSProperties, type MouseEvent as ReactMouseEvent, useMemo, useState} from 'react'
import {
    type CategoryTreeNode,
    DeleteDialog,
    type DeleteMode,
    type DropPosition,
    flatToTree,
    Tree,
    type TreeActionItem,
    type TreeTokens,
    type TreeNodeActionHelpers,
    type TreeNodeRenderState,
    type TreeViewportRowsPayload,
    type TreeVisibleRow,
} from 'flowcloudai-ui/Tree'

const NAV_MIN = 180
const NAV_MAX = 600
const NAV_DEFAULT = 280

let _nextId = 328
const genId = () => String(++_nextId);

interface FlatRow {
    id: string
    parent_id: string | null
    name: string
    sort_order: number
}

export function TreeDemo() {
    const [rows, setRows] = useState<FlatRow[]>(INITIAL_ROWS)
    const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined)
    const [log, setLog] = useState<string[]>([])
    const [navWidth, setNavWidth] = useState(NAV_DEFAULT)
    const [expandedKeys, setExpandedKeys] = useState<string[]>(['1', '2', '89'])
    const [searchValue, setSearchValue] = useState('')
    const [indentSize, setIndentSize] = useState(20)
    const [indentationLine, setIndentationLine] = useState(true)
    const [hideRoot, setHideRoot] = useState(false)
    const [actionDisplayMode, setActionDisplayMode] = useState<'auto' | 'inline' | 'overflow'>('auto')
    const [customColors, setCustomColors] = useState(true)
    const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(null)
    const [visibleRows, setVisibleRows] = useState<TreeVisibleRow[]>([])
    const [viewportRows, setViewportRows] = useState<TreeViewportRowsPayload>({
        startIndex: 0,
        endIndexExclusive: 0,
        rows: [],
    })

    const handleDividerMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        const startX = e.clientX
        const startWidth = navWidth
        const onMove = (ev: MouseEvent) => {
            const next = Math.min(NAV_MAX, Math.max(NAV_MIN, startWidth + ev.clientX - startX))
            setNavWidth(next)
        }
        const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }

    const addLog = (msg: string) =>
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 12))

    const {roots} = flatToTree(
        rows.map(r => ({id: r.id, parent_id: r.parent_id, name: r.name, sort_order: r.sort_order}))
    )

    const rootKeys = useMemo(() => roots.map((node: CategoryTreeNode) => node.key), [roots])
    const topVisibleKeys = useMemo(
        () => hideRoot ? roots.flatMap(node => node.children.map(child => child.key)) : rootKeys,
        [hideRoot, rootKeys, roots]
    )
    const customColorTokens = useMemo<TreeTokens | undefined>(() => {
        if (!customColors) return undefined
        return {
            text: '#dbe4ff',
            textMuted: '#8ea0c9',
            bgHover: '#16213d',
            bgSelected: '#1d2d57',
            border: '#2a3a68',
            borderFocus: '#6ea8fe',
            primary: '#6ea8fe',
            primarySubtle: '#18294a',
            danger: '#ff6b81',
            actionHoverBg: '#243765',
            dropIndicator: '#8ab4ff',
        }
    }, [customColors])

    // ── 回调 ─────────────────────────────────────────────────────────────

    const handleRename = async (key: string, newName: string) => {
        setRows(prev => prev.map(r => r.id === key ? {...r, name: newName} : r))
        addLog(`重命名 [${key}] → "${newName}"`)
    }

    const handleCreate = async (parentKey: string | null): Promise<string> => {
        const newId = genId()
        const siblings = rows.filter(r => r.parent_id === parentKey)
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(r => r.sort_order)) : -1
        setRows(prev => [...prev, {id: newId, parent_id: parentKey, name: '新建分类', sort_order: maxOrder + 1}])
        addLog(`新建 id=${newId}，父=${parentKey ?? '根'}`)
        return newId
    }

    const handleDelete = async (key: string, mode: 'lift' | 'cascade') => {
        setRows(prev => {
            if (mode === 'cascade') {
                const toDelete = new Set<string>()
                const collect = (id: string) => {
                    toDelete.add(id)
                    prev.filter(r => r.parent_id === id).forEach(r => collect(r.id))
                }
                collect(key)
                addLog(`彻底删除 [${key}]，共 ${toDelete.size} 个节点`)
                return prev.filter(r => !toDelete.has(r.id))
            } else {
                const target = prev.find(r => r.id === key)
                if (!target) return prev
                const updated = prev
                    .map(r => r.parent_id === key ? {...r, parent_id: target.parent_id} : r)
                    .filter(r => r.id !== key)
                addLog(`移交删除 [${key}]，子节点提升至 parent=${target.parent_id ?? '根'}`)
                return updated
            }
        })
    }

    const handleDeleteRequest = (node: CategoryTreeNode) => {
        addLog(`请求删除 [${node.key}] "${node.title}"`)
        setDeleteTarget(node)
    }

    // 拖放到目标上 = 成为目标的最后一个子节点
    const handleMove = async (key: string, targetKey: string, position: DropPosition) => {
        const prev = rows
        const target = prev.find(r => r.id === targetKey)
        const dragged = prev.find(r => r.id === key)
        if (!target || !dragged) return

        let newParentId: string | null
        let orderMap: Map<string, number>

        if (position === 'into') {
            newParentId = targetKey
            const siblings = prev.filter(r => r.parent_id === targetKey && r.id !== key)
            const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(r => r.sort_order)) : -1
            orderMap = new Map([[key, maxOrder + 1]])
        } else {
            newParentId = target.parent_id
            const siblings = prev
                .filter(r => r.parent_id === newParentId && r.id !== key)
                .sort((a, b) => a.sort_order - b.sort_order)

            const targetIndex = siblings.findIndex(r => r.id === targetKey)
            const insertIndex = position === 'before' ? targetIndex : targetIndex + 1

            const reordered = [...siblings]
            reordered.splice(insertIndex, 0, dragged)

            orderMap = new Map<string, number>()
            reordered.forEach((r, i) => orderMap.set(r.id, i))
        }

        // const parentChanged = dragged.parent_id !== newParentId

        // ── 乐观更新 ─────────────────────────────────────────────────────────
        setRows(prev => prev.map(r => {
            if (r.id === key) {
                return {...r, parent_id: newParentId, sort_order: orderMap.get(key)!}
            }
            if (orderMap.has(r.id)) {
                return {...r, sort_order: orderMap.get(r.id)!}
            }
            return r
        }))

        // ── API 调用 ──────────────────────────────────────────────────────────
        try {
            const promises: Promise<unknown>[] = []

            /* parent_id 变化 → category_update
            if (parentChanged) {
                promises.push(category_update(key, {
                    parent_id: newParentId,
                    sort_order: orderMap.get(key)!,
                }))
            }
            */

            /*
            // 收集 sort_order 变化的兄弟节点（不含被拖节点如果已由 update 处理）
            const reorderList = [...orderMap.entries()]
                .filter(([id, order]) => {
                    if (parentChanged && id === key) return false // update 已处理
                    const original = prev.find(r => r.id === id)
                    return original && original.sort_order !== order
                })
                .map(([id, sort_order]) => ({id, sort_order}))
            */

            /*
            if (reorderList.length > 0) {
                promises.push(category_reorder({ items: reorderList }))
            }
             */

            await Promise.all(promises)
        } catch (e) {
            // 回滚
            setRows(prev)
            // TODO: 提示用户
        }
    }

    const renderTreeTitle = (node: CategoryTreeNode, state: TreeNodeRenderState) => (
        <span style={{display: 'inline-flex', alignItems: 'center', gap: 'var(--fc-space-sm)', minWidth: 0}}>
            <span style={{
                width: 8,
                height: 8,
                flexShrink: 0,
                borderRadius: 999,
                background: state.isSelected ? 'var(--fc-color-primary, #60a5fa)' : 'var(--fc-color-text-tertiary, #94a3b8)',
            }}/>
            <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                {node.title}
            </span>
            {state.hasChildren && (
                <span style={{
                    flexShrink: 0,
                    padding: '0 6px',
                    borderRadius: 999,
                    fontSize: 11,
                    lineHeight: '18px',
                    background: 'color-mix(in srgb, var(--fc-color-primary, #60a5fa) 12%, transparent)',
                    color: 'var(--fc-color-text-secondary, #94a3b8)',
                }}>
                    {node.children.length}
                </span>
            )}
        </span>
    )

    const getNodeActions = (
        _node: CategoryTreeNode,
        state: TreeNodeRenderState,
        helpers: TreeNodeActionHelpers
    ): TreeActionItem[] => {
        const actions: TreeActionItem[] = []

        if (state.canRename) {
            actions.push({
                key: 'rename',
                label: '重命名',
                title: '重命名（双击也可）',
                icon: '✏',
                onClick: helpers.startEdit,
            })
        }

        if (state.canCreate || state.canDelete) {
            actions.push({type: 'divider', key: 'divider-ops'})
        }

        if (state.canCreate) {
            actions.push({
                key: 'create',
                label: '添加子项',
                title: '新建子分类',
                icon: '+',
                onClick: helpers.requestCreate,
            })
        }

        if (state.canDelete) {
            actions.push({
                key: 'delete',
                label: '删除',
                icon: '🗑',
                danger: true,
                onClick: helpers.requestDelete,
            })
        }

        return actions
    }

    // ── 渲染 ────────────────────────────────────────────────────────────────

    return (
        <div className="demo-section">
            <h4>分类树（拖拽排序 / 重命名 / 增删）</h4>
            <div style={{
                display: 'flex',
                gap: 'var(--fc-space-md)',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 12,
                padding: 'var(--fc-space-md)',
                border: '1px solid var(--fc-color-border, #e2e8f0)',
                borderRadius: 8,
                background: 'var(--fc-color-bg-secondary, #f8fafc)',
            }}>
                <label style={{display: 'inline-flex', alignItems: 'center', gap: 'var(--fc-space-sm)', fontSize: 12}}>
                    外部搜索
                    <input
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        placeholder="受控搜索"
                        style={{
                            width: 180,
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--fc-color-border, #cbd5e1)',
                            background: 'var(--fc-color-bg, #fff)',
                            color: 'var(--fc-color-text, #0f172a)',
                        }}
                    />
                </label>
                <label style={{display: 'inline-flex', alignItems: 'center', gap: 'var(--fc-space-sm)', fontSize: 12}}>
                    缩进
                    <input
                        type="range"
                        min={12}
                        max={32}
                        value={indentSize}
                        onChange={e => setIndentSize(Number(e.target.value))}
                    />
                    <span>{indentSize}px</span>
                </label>
                <label style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12}}>
                    <input
                        type="checkbox"
                        checked={indentationLine}
                        onChange={e => setIndentationLine(e.target.checked)}
                    />
                    缩进线
                </label>
                <label style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12}}>
                    <input
                        type="checkbox"
                        checked={hideRoot}
                        onChange={e => setHideRoot(e.target.checked)}
                    />
                    隐藏根节点
                </label>
                <label style={{display: 'inline-flex', alignItems: 'center', gap: 'var(--fc-space-sm)', fontSize: 12}}>
                    动作模式
                    <select
                        value={actionDisplayMode}
                        onChange={e => setActionDisplayMode(e.target.value as 'auto' | 'inline' | 'overflow')}
                        style={{
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--fc-color-border, #cbd5e1)',
                            background: 'var(--fc-color-bg, #fff)',
                            color: 'var(--fc-color-text, #0f172a)',
                        }}
                    >
                        <option value="auto">auto</option>
                        <option value="inline">inline</option>
                        <option value="overflow">overflow</option>
                    </select>
                </label>
                <button
                    onClick={() => setExpandedKeys(topVisibleKeys)}
                    style={demoButtonStyle}
                >
                    展开顶层
                </button>
                <button
                    onClick={() => setExpandedKeys([])}
                    style={demoButtonStyle}
                >
                    全部收起
                </button>
                <label style={{display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12}}>
                    <input
                        type="checkbox"
                        checked={customColors}
                        onChange={e => setCustomColors(e.target.checked)}
                    />
                    启用颜色 tokens
                </label>
                <span style={{fontSize: 12, color: 'var(--fc-color-text-secondary, #64748b)'}}>
                    当前示例未传 scrollHeight，Tree 默认填充左侧容器高度
                </span>
            </div>
            <div style={{
                display: 'flex',
                height: 600,
                minHeight: 0,
                overflow: 'hidden',
                border: '1px solid var(--fc-color-border, #e2e8f0)',
                borderRadius: 8
            }}>

                {/* 导航区 */}
                <div style={{
                    width: navWidth,
                    flexShrink: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    display: 'flex',
                }}>
                    <Tree
                        treeData={roots}
                        selectedKey={selectedKey}
                        expandedKeys={expandedKeys}
                        onExpandedKeysChange={setExpandedKeys}
                        searchValue={searchValue}
                        onSearchChange={setSearchValue}
                        searchPlaceholder="搜索分类 / 人物 / 物品"
                        renderTitle={renderTreeTitle}
                        getNodeActions={getNodeActions}
                        canRename={(node) => node.raw.parent_id !== null}
                        canDelete={(node) => node.raw.parent_id !== null}
                        canCreate={(node) => node === null || node.raw.parent_id !== null}
                        canDrag={(node) => node.raw.parent_id !== null}
                        canDrop={(source, target, position: string) => {
                            if (source.raw.parent_id === null && position === 'into') return false
                            return !(source.raw.parent_id === null && target.raw.parent_id !== null);

                        }}
                        hideRoot={hideRoot}
                        indentSize={indentSize}
                        indentationLine={indentationLine}
                        actionDisplayMode={actionDisplayMode}
                        actionCollapseThreshold={240}
                        tokens={customColorTokens}
                        onSelectedKeyChange={(key) => {
                            setSelectedKey(key)
                            addLog(`选中 [${key}]`)
                        }}
                        onRename={handleRename}
                        onCreate={handleCreate}
                        onDeleteRequest={handleDeleteRequest}
                        onMove={handleMove}
                        onVisibleRowsChange={setVisibleRows}
                        onViewportRowsChange={setViewportRows}
                        searchable
                        collapseDuration={0.2}
                    />
                </div>

                {/* 分隔手柄 */}
                <div
                    onMouseDown={handleDividerMouseDown}
                    style={{
                        width: 5,
                        flexShrink: 0,
                        cursor: 'col-resize',
                        background: 'var(--fc-color-border, #e2e8f0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 150ms',
                        userSelect: 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--fc-color-primary, #6366f1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--fc-color-border, #e2e8f0)')}
                >
                    <div style={{
                        width: 3,
                        height: 32,
                        borderRadius: 9999,
                        background: 'currentColor',
                        opacity: 0.4,
                        pointerEvents: 'none',
                    }}/>
                </div>

                {/* 内容区 */}
                <div style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'auto',
                    padding: 'var(--fc-space-md) var(--fc-space-lg)',
                    fontSize: 13,
                    borderLeft: 'none',
                }}>
                    <div style={{
                        marginBottom: 12,
                        padding: 'var(--fc-space-md)',
                        border: '1px solid var(--fc-color-border, #e2e8f0)',
                        borderRadius: 8,
                        background: 'var(--fc-color-bg-secondary, #f8fafc)',
                    }}>
                        <div style={{fontWeight: 600, marginBottom: 8}}>可见行回调</div>
                        <div style={{fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6}}>
                            结构可见：{visibleRows.length} 行
                        </div>
                        <div style={{fontSize: 12, color: 'var(--fc-color-text-secondary)', marginBottom: 6}}>
                            真实视口：{viewportRows.startIndex} - {viewportRows.endIndexExclusive}
                            <span style={{marginLeft: 8}}>（{viewportRows.rows.length} 行）</span>
                        </div>
                        <div style={{
                            fontSize: 12,
                            color: 'var(--fc-color-text-secondary)',
                            fontFamily: 'monospace',
                            lineHeight: 1.6,
                            wordBreak: 'break-all',
                        }}>
                            视口 keys：{viewportRows.rows.slice(0, 10).map(row => row.key).join(', ') || '无'}
                        </div>
                    </div>
                    <div style={{fontWeight: 600, marginBottom: 8}}>操作日志</div>
                    {log.length === 0 && (
                        <div style={{color: '#94a3b8', fontSize: 12}}>
                            试试展开、新建、重命名、拖拽或删除分类
                        </div>
                    )}
                    {log.map((entry, i) => (
                        <div key={i} style={{
                            padding: 'var(--fc-space-xs) 0',
                            borderBottom: '1px solid var(--fc-color-border, #f1f5f9)',
                            color: i === 0 ? 'var(--fc-color-text)' : '#94a3b8',
                            fontSize: 12,
                            fontFamily: 'monospace',
                        }}>
                            {entry}
                        </div>
                    ))}
                </div>
            </div>

            <DeleteDialog
                node={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onDelete={async (key: string, mode: DeleteMode) => {
                    await handleDelete(key, mode)
                    setDeleteTarget(null)
                }}
            />
        </div>
    )
}

const demoButtonStyle: CSSProperties = {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--fc-color-border, #cbd5e1)',
    background: 'var(--fc-color-bg, #fff)',
    color: 'var(--fc-color-text, #0f172a)',
    cursor: 'pointer',
}

export const INITIAL_ROWS: FlatRow[] = [
    // ========== 第一大类：世界设定 ==========
    {id: '1', parent_id: null, name: '世界设定', sort_order: 0},

    // 地理 (2~50)
    {id: '2', parent_id: '1', name: '地理', sort_order: 0},
    {id: '4', parent_id: '2', name: '大陆', sort_order: 0},
    {id: '5', parent_id: '2', name: '海洋', sort_order: 1},
    {id: '6', parent_id: '2', name: '天空', sort_order: 2},
    {id: '7', parent_id: '2', name: '地下世界', sort_order: 3},

    // 大陆细分
    {id: '8', parent_id: '4', name: '北方大陆', sort_order: 0},
    {id: '9', parent_id: '4', name: '南方大陆', sort_order: 1},
    {id: '10', parent_id: '4', name: '东方大陆', sort_order: 2},
    {id: '11', parent_id: '4', name: '西方大陆', sort_order: 3},
    {id: '12', parent_id: '4', name: '中央大陆', sort_order: 4},

    // 北方大陆地区
    {id: '13', parent_id: '8', name: '北境冻土', sort_order: 0},
    {id: '14', parent_id: '8', name: '霜原山脉', sort_order: 1},
    {id: '15', parent_id: '8', name: '寒风高原', sort_order: 2},
    {id: '16', parent_id: '8', name: '冰晶洞穴', sort_order: 3},

    // 北境冻土具体地点
    {id: '17', parent_id: '13', name: '极北灯塔', sort_order: 0},
    {id: '18', parent_id: '13', name: '冰封港口', sort_order: 1},
    {id: '19', parent_id: '13', name: '雪精村落', sort_order: 2},
    {id: '20', parent_id: '13', name: '冬眠熊穴', sort_order: 3},

    // 霜原山脉具体山峰
    {id: '21', parent_id: '14', name: '尖峰峻岭', sort_order: 0},
    {id: '22', parent_id: '14', name: '冰晶之巅', sort_order: 1},
    {id: '23', parent_id: '14', name: '风暴谷', sort_order: 2},
    {id: '24', parent_id: '14', name: '古龙巢穴', sort_order: 3},

    // 南方大陆地区
    {id: '25', parent_id: '9', name: '炎阳沙漠', sort_order: 0},
    {id: '26', parent_id: '9', name: '翡翠森林', sort_order: 1},
    {id: '27', parent_id: '9', name: '云雾山林', sort_order: 2},
    {id: '28', parent_id: '9', name: '腐沼地带', sort_order: 3},

    // 炎阳沙漠具体地点
    {id: '29', parent_id: '25', name: '金字塔群', sort_order: 0},
    {id: '30', parent_id: '25', name: '绿洲城镇', sort_order: 1},
    {id: '31', parent_id: '25', name: '尘暴平原', sort_order: 2},
    {id: '32', parent_id: '25', name: '古墓遗迹', sort_order: 3},

    // 翡翠森林具体地点
    {id: '33', parent_id: '26', name: '古树之城', sort_order: 0},
    {id: '34', parent_id: '26', name: '精灵王庭', sort_order: 1},
    {id: '35', parent_id: '26', name: '深林之心', sort_order: 2},
    {id: '36', parent_id: '26', name: '蘑菇圈', sort_order: 3},

    // 东方大陆地区
    {id: '37', parent_id: '10', name: '日出群岛', sort_order: 0},
    {id: '38', parent_id: '10', name: '樱花半岛', sort_order: 1},
    {id: '39', parent_id: '10', name: '茶山镇', sort_order: 2},
    {id: '40', parent_id: '10', name: '竹海秘境', sort_order: 3},

    // 日出群岛具体岛屿
    {id: '41', parent_id: '37', name: '本岛', sort_order: 0},
    {id: '42', parent_id: '37', name: '火山岛', sort_order: 1},
    {id: '43', parent_id: '37', name: '宝藏岛', sort_order: 2},

    // 西方大陆地区
    {id: '44', parent_id: '11', name: '黄金平原', sort_order: 0},
    {id: '45', parent_id: '11', name: '银月湖', sort_order: 1},
    {id: '46', parent_id: '11', name: '古堡废墟', sort_order: 2},
    {id: '47', parent_id: '11', name: '魔法学院', sort_order: 3},

    // 中央大陆地区
    {id: '48', parent_id: '12', name: '王都', sort_order: 0},
    {id: '49', parent_id: '12', name: '天空城', sort_order: 1},
    {id: '50', parent_id: '12', name: '魔法议会', sort_order: 2},

    // 海洋区域
    {id: '51', parent_id: '5', name: '无尽之海', sort_order: 0},
    {id: '52', parent_id: '5', name: '风暴洋', sort_order: 1},
    {id: '53', parent_id: '5', name: '幽暗之海', sort_order: 2},

    // 无尽之海岛屿
    {id: '54', parent_id: '51', name: '海妖群岛', sort_order: 0},
    {id: '55', parent_id: '51', name: '龙渊海沟', sort_order: 1},
    {id: '56', parent_id: '51', name: '珍珠环礁', sort_order: 2},
    {id: '57', parent_id: '51', name: '海盗港口', sort_order: 3},

    // 天空领域
    {id: '58', parent_id: '6', name: '云之国度', sort_order: 0},
    {id: '59', parent_id: '6', name: '飞龙巢穴', sort_order: 1},
    {id: '60', parent_id: '6', name: '风元素界', sort_order: 2},

    // 地下世界领域
    {id: '61', parent_id: '7', name: '矮人王国', sort_order: 0},
    {id: '62', parent_id: '7', name: '蜘蛛洞穴', sort_order: 1},
    {id: '63', parent_id: '7', name: '岩浆地狱', sort_order: 2},
    {id: '64', parent_id: '7', name: '时间遗迹', sort_order: 3},

    // 历史 (65~95)
    {id: '65', parent_id: '1', name: '历史', sort_order: 1},
    {id: '66', parent_id: '65', name: '远古纪元', sort_order: 0},
    {id: '67', parent_id: '65', name: '英雄纪元', sort_order: 1},
    {id: '68', parent_id: '65', name: '现代纪元', sort_order: 2},
    {id: '69', parent_id: '65', name: '未来纪元', sort_order: 3},

    // 远古纪元时代
    {id: '70', parent_id: '66', name: '创世神话', sort_order: 0},
    {id: '71', parent_id: '66', name: '巨兽时代', sort_order: 1},
    {id: '72', parent_id: '66', name: '众神之战', sort_order: 2},
    {id: '73', parent_id: '66', name: '龙神衰落', sort_order: 3},

    // 创世神话事件
    {id: '74', parent_id: '70', name: '宇宙起源', sort_order: 0},
    {id: '75', parent_id: '70', name: '大地降生', sort_order: 1},
    {id: '76', parent_id: '70', name: '生命诞生', sort_order: 2},

    // 英雄纪元时代
    {id: '77', parent_id: '67', name: '圣战', sort_order: 0},
    {id: '78', parent_id: '67', name: '魔法复兴', sort_order: 1},
    {id: '79', parent_id: '67', name: '帝国崛起', sort_order: 2},
    {id: '80', parent_id: '67', name: '英雄传奇', sort_order: 3},

    // 圣战分战役
    {id: '81', parent_id: '77', name: '北境激战', sort_order: 0},
    {id: '82', parent_id: '77', name: '中土之战', sort_order: 1},
    {id: '83', parent_id: '77', name: '南海争霸', sort_order: 2},

    // 现代纪元时代
    {id: '84', parent_id: '68', name: '工业革命', sort_order: 0},
    {id: '85', parent_id: '68', name: '科技爆炸', sort_order: 1},
    {id: '86', parent_id: '68', name: '星际探索', sort_order: 2},

    // 未来纪元时代
    {id: '87', parent_id: '69', name: '次元融合', sort_order: 0},
    {id: '88', parent_id: '69', name: '终极对决', sort_order: 1},

    // ========== 第二大类：人物 ==========
    {id: '89', parent_id: null, name: '人物', sort_order: 1},

    // 主角阵营 (90~120)
    {id: '90', parent_id: '89', name: '主角阵营', sort_order: 0},
    {id: '91', parent_id: '90', name: '主角', sort_order: 0},
    {id: '92', parent_id: '90', name: '同伴A', sort_order: 1},
    {id: '93', parent_id: '90', name: '同伴B', sort_order: 2},
    {id: '94', parent_id: '90', name: '同伴C', sort_order: 3},
    {id: '95', parent_id: '90', name: '同伴D', sort_order: 4},
    {id: '96', parent_id: '90', name: '导师', sort_order: 5},

    // 主角信息
    {id: '97', parent_id: '91', name: '基本信息', sort_order: 0},
    {id: '98', parent_id: '91', name: '童年经历', sort_order: 1},
    {id: '99', parent_id: '91', name: '能力成长', sort_order: 2},
    {id: '100', parent_id: '91', name: '性格特征', sort_order: 3},
    {id: '101', parent_id: '91', name: '重要关系', sort_order: 4},

    // 基本信息详细
    {id: '102', parent_id: '97', name: '名字来源', sort_order: 0},
    {id: '103', parent_id: '97', name: '年龄与出生', sort_order: 1},
    {id: '104', parent_id: '97', name: '种族特性', sort_order: 2},
    {id: '105', parent_id: '97', name: '外貌描写', sort_order: 3},

    // 能力成长阶段
    {id: '106', parent_id: '99', name: '觉醒期', sort_order: 0},
    {id: '107', parent_id: '99', name: '成长期', sort_order: 1},
    {id: '108', parent_id: '99', name: '突破期', sort_order: 2},
    {id: '109', parent_id: '99', name: '巅峰期', sort_order: 3},

    // 同伴A信息
    {id: '110', parent_id: '92', name: '基本信息', sort_order: 0},
    {id: '111', parent_id: '92', name: '专长技能', sort_order: 1},
    {id: '112', parent_id: '92', name: '伙伴关系', sort_order: 2},

    // 同伴B信息
    {id: '113', parent_id: '93', name: '基本信息', sort_order: 0},
    {id: '114', parent_id: '93', name: '专长技能', sort_order: 1},
    {id: '115', parent_id: '93', name: '伙伴关系', sort_order: 2},

    // 导师信息
    {id: '116', parent_id: '96', name: '身份背景', sort_order: 0},
    {id: '117', parent_id: '96', name: '教导内容', sort_order: 1},
    {id: '118', parent_id: '96', name: '秘密身份', sort_order: 2},

    // 反派阵营 (119~160)
    {id: '119', parent_id: '89', name: '反派阵营', sort_order: 1},
    {id: '120', parent_id: '119', name: '魔王', sort_order: 0},
    {id: '121', parent_id: '119', name: '四天王', sort_order: 1},
    {id: '122', parent_id: '119', name: '邪教领袖', sort_order: 2},
    {id: '123', parent_id: '119', name: '堕落者', sort_order: 3},

    // 魔王信息
    {id: '124', parent_id: '120', name: '基本信息', sort_order: 0},
    {id: '125', parent_id: '120', name: '黑暗力量', sort_order: 1},
    {id: '126', parent_id: '120', name: '邪恶计划', sort_order: 2},
    {id: '127', parent_id: '120', name: '过去秘密', sort_order: 3},

    // 四天王成员
    {id: '128', parent_id: '121', name: '炎之天王', sort_order: 0},
    {id: '129', parent_id: '121', name: '冰之天王', sort_order: 1},
    {id: '130', parent_id: '121', name: '风之天王', sort_order: 2},
    {id: '131', parent_id: '121', name: '地之天王', sort_order: 3},

    // 炎之天王信息
    {id: '132', parent_id: '128', name: '基本信息', sort_order: 0},
    {id: '133', parent_id: '128', name: '能力设定', sort_order: 1},
    {id: '134', parent_id: '128', name: '性格弱点', sort_order: 2},

    // 邪教领袖信息
    {id: '135', parent_id: '122', name: '身份背景', sort_order: 0},
    {id: '136', parent_id: '122', name: '邪教组织', sort_order: 1},
    {id: '137', parent_id: '122', name: '信仰理念', sort_order: 2},

    // 中立势力 (138~170)
    {id: '138', parent_id: '89', name: '中立势力', sort_order: 2},
    {id: '139', parent_id: '138', name: '冒险者公会', sort_order: 0},
    {id: '140', parent_id: '138', name: '商会联盟', sort_order: 1},
    {id: '141', parent_id: '138', name: '佣兵团', sort_order: 2},
    {id: '142', parent_id: '138', name: '隐秘组织', sort_order: 3},

    // 冒险者公会人物
    {id: '143', parent_id: '139', name: '会长', sort_order: 0},
    {id: '144', parent_id: '139', name: '副会长', sort_order: 1},
    {id: '145', parent_id: '139', name: '精英成员', sort_order: 2},
    {id: '146', parent_id: '139', name: '新人冒险者', sort_order: 3},

    // 商会联盟人物
    {id: '147', parent_id: '140', name: '会主', sort_order: 0},
    {id: '148', parent_id: '140', name: '商人代表', sort_order: 1},
    {id: '149', parent_id: '140', name: '探险队长', sort_order: 2},

    // ========== 第三大类：魔法体系 ==========
    {id: '151', parent_id: null, name: '魔法体系', sort_order: 2},

    // 元素魔法 (152~180)
    {id: '152', parent_id: '151', name: '元素魔法', sort_order: 0},
    {id: '153', parent_id: '152', name: '火系', sort_order: 0},
    {id: '154', parent_id: '152', name: '水系', sort_order: 1},
    {id: '155', parent_id: '152', name: '风系', sort_order: 2},
    {id: '156', parent_id: '152', name: '土系', sort_order: 3},
    {id: '157', parent_id: '152', name: '雷电系', sort_order: 4},
    {id: '158', parent_id: '152', name: '冰系', sort_order: 5},

    // 火系技能
    {id: '159', parent_id: '153', name: '爆炎术', sort_order: 0},
    {id: '160', parent_id: '153', name: '火球术', sort_order: 1},
    {id: '161', parent_id: '153', name: '流星火雨', sort_order: 2},
    {id: '162', parent_id: '153', name: '地狱烈火', sort_order: 3},
    {id: '163', parent_id: '153', name: '火焰护盾', sort_order: 4},

    // 爆炎术详细
    {id: '164', parent_id: '159', name: '释放方式', sort_order: 0},
    {id: '165', parent_id: '159', name: '威力等级', sort_order: 1},
    {id: '166', parent_id: '159', name: '消耗魔力', sort_order: 2},

    // 水系技能
    {id: '167', parent_id: '154', name: '冰锥术', sort_order: 0},
    {id: '168', parent_id: '154', name: '治愈之雨', sort_order: 1},
    {id: '169', parent_id: '154', name: '冰封地面', sort_order: 2},
    {id: '170', parent_id: '154', name: '水牢术', sort_order: 3},
    {id: '171', parent_id: '154', name: '潮汐之力', sort_order: 4},

    // 风系技能
    {id: '172', parent_id: '155', name: '切割风刃', sort_order: 0},
    {id: '173', parent_id: '155', name: '旋风术', sort_order: 1},
    {id: '174', parent_id: '155', name: '加速术', sort_order: 2},
    {id: '175', parent_id: '155', name: '风之庇护', sort_order: 3},

    // 土系技能
    {id: '176', parent_id: '156', name: '石矛术', sort_order: 0},
    {id: '177', parent_id: '156', name: '地震术', sort_order: 1},
    {id: '178', parent_id: '156', name: '岩石防壁', sort_order: 2},

    // 雷电系技能
    {id: '179', parent_id: '157', name: '闪电箭', sort_order: 0},
    {id: '180', parent_id: '157', name: '雷电链', sort_order: 1},

    // 神圣魔法 (181~200)
    {id: '181', parent_id: '151', name: '神圣魔法', sort_order: 1},
    {id: '182', parent_id: '181', name: '祝福系', sort_order: 0},
    {id: '183', parent_id: '181', name: '治疗系', sort_order: 1},
    {id: '184', parent_id: '181', name: '驱魔系', sort_order: 2},
    {id: '185', parent_id: '181', name: '救赎系', sort_order: 3},

    // 祝福系技能
    {id: '186', parent_id: '182', name: '力量祝福', sort_order: 0},
    {id: '187', parent_id: '182', name: '敏捷祝福', sort_order: 1},
    {id: '188', parent_id: '182', name: '防御祝福', sort_order: 2},
    {id: '189', parent_id: '182', name: '智慧祝福', sort_order: 3},

    // 治疗系技能
    {id: '190', parent_id: '183', name: '小治疗术', sort_order: 0},
    {id: '191', parent_id: '183', name: '大治疗术', sort_order: 1},
    {id: '192', parent_id: '183', name: '群体治疗', sort_order: 2},
    {id: '193', parent_id: '183', name: '复活术', sort_order: 3},

    // 驱魔系技能
    {id: '194', parent_id: '184', name: '驱魔术', sort_order: 0},
    {id: '195', parent_id: '184', name: '圣光斩', sort_order: 1},
    {id: '196', parent_id: '184', name: '邪恶克星', sort_order: 2},

    // 黑魔法 (197~220)
    {id: '197', parent_id: '151', name: '黑魔法', sort_order: 2},
    {id: '198', parent_id: '197', name: '诅咒系', sort_order: 0},
    {id: '199', parent_id: '197', name: '灵魂系', sort_order: 1},
    {id: '200', parent_id: '197', name: '腐蚀系', sort_order: 2},
    {id: '201', parent_id: '197', name: '禁忌魔法', sort_order: 3},

    // 诅咒系技能
    {id: '202', parent_id: '198', name: '衰弱诅咒', sort_order: 0},
    {id: '203', parent_id: '198', name: '疯狂诅咒', sort_order: 1},
    {id: '204', parent_id: '198', name: '死亡诅咒', sort_order: 2},

    // 灵魂系技能
    {id: '205', parent_id: '199', name: '吸魂术', sort_order: 0},
    {id: '206', parent_id: '199', name: '灵魂囚禁', sort_order: 1},
    {id: '207', parent_id: '199', name: '亡灵召唤', sort_order: 2},

    // ========== 第四大类：物品 ==========
    {id: '208', parent_id: null, name: '物品', sort_order: 3},

    // 武器 (209~250)
    {id: '209', parent_id: '208', name: '武器', sort_order: 0},
    {id: '210', parent_id: '209', name: '剑', sort_order: 0},
    {id: '211', parent_id: '209', name: '弓', sort_order: 1},
    {id: '212', parent_id: '209', name: '法杖', sort_order: 2},
    {id: '213', parent_id: '209', name: '盾牌', sort_order: 3},
    {id: '214', parent_id: '209', name: '匕首', sort_order: 4},
    {id: '215', parent_id: '209', name: '长矛', sort_order: 5},

    // 剑的种类
    {id: '216', parent_id: '210', name: '长剑', sort_order: 0},
    {id: '217', parent_id: '210', name: '大剑', sort_order: 1},
    {id: '218', parent_id: '210', name: '短剑', sort_order: 2},
    {id: '219', parent_id: '210', name: '圣剑', sort_order: 3},
    {id: '220', parent_id: '210', name: '魔剑', sort_order: 4},

    // 长剑具体武器
    {id: '221', parent_id: '216', name: '铁长剑', sort_order: 0},
    {id: '222', parent_id: '216', name: '钢长剑', sort_order: 1},
    {id: '223', parent_id: '216', name: '精钢长剑', sort_order: 2},
    {id: '224', parent_id: '216', name: '秘银长剑', sort_order: 3},

    // 大剑具体武器
    {id: '225', parent_id: '217', name: '黑龙大剑', sort_order: 0},
    {id: '226', parent_id: '217', name: '圣光大剑', sort_order: 1},

    // 弓的种类
    {id: '227', parent_id: '211', name: '短弓', sort_order: 0},
    {id: '228', parent_id: '211', name: '长弓', sort_order: 1},
    {id: '229', parent_id: '211', name: '魔弓', sort_order: 2},

    // 法杖种类
    {id: '230', parent_id: '212', name: '火焰法杖', sort_order: 0},
    {id: '231', parent_id: '212', name: '冰霜法杖', sort_order: 1},
    {id: '232', parent_id: '212', name: '圣光法杖', sort_order: 2},
    {id: '233', parent_id: '212', name: '黑暗法杖', sort_order: 3},

    // 防具 (234~265)
    {id: '234', parent_id: '208', name: '防具', sort_order: 1},
    {id: '235', parent_id: '234', name: '铠甲', sort_order: 0},
    {id: '236', parent_id: '234', name: '长袍', sort_order: 1},
    {id: '237', parent_id: '234', name: '皮甲', sort_order: 2},
    {id: '238', parent_id: '234', name: '魔法袍', sort_order: 3},

    // 铠甲部位
    {id: '239', parent_id: '235', name: '头盔', sort_order: 0},
    {id: '240', parent_id: '235', name: '胸甲', sort_order: 1},
    {id: '241', parent_id: '235', name: '腿甲', sort_order: 2},
    {id: '242', parent_id: '235', name: '臂甲', sort_order: 3},

    // 头盔具体装备
    {id: '243', parent_id: '239', name: '铁头盔', sort_order: 0},
    {id: '244', parent_id: '239', name: '钢铁皇冠', sort_order: 1},

    // 长袍种类
    {id: '245', parent_id: '236', name: '学徒袍', sort_order: 0},
    {id: '246', parent_id: '236', name: '魔法师袍', sort_order: 1},
    {id: '247', parent_id: '236', name: '大魔导袍', sort_order: 2},

    // 消耗品 (248~280)
    {id: '248', parent_id: '208', name: '消耗品', sort_order: 2},
    {id: '249', parent_id: '248', name: '药剂', sort_order: 0},
    {id: '250', parent_id: '248', name: '卷轴', sort_order: 1},
    {id: '251', parent_id: '248', name: '炸弹', sort_order: 2},
    {id: '252', parent_id: '248', name: '食物', sort_order: 3},

    // 药剂类型
    {id: '253', parent_id: '249', name: '小血瓶', sort_order: 0},
    {id: '254', parent_id: '249', name: '大血瓶', sort_order: 1},
    {id: '255', parent_id: '249', name: '魔力瓶', sort_order: 2},
    {id: '256', parent_id: '249', name: '复活药', sort_order: 3},
    {id: '257', parent_id: '249', name: '增强药', sort_order: 4},

    // 卷轴类型
    {id: '258', parent_id: '250', name: '火焰卷轴', sort_order: 0},
    {id: '259', parent_id: '250', name: '冰冻卷轴', sort_order: 1},
    {id: '260', parent_id: '250', name: '传送卷轴', sort_order: 2},

    // ========== 第五大类：事件 ==========
    {id: '261', parent_id: null, name: '事件', sort_order: 4},

    // 主线 (262~275)
    {id: '262', parent_id: '261', name: '主线', sort_order: 0},
    {id: '263', parent_id: '262', name: '序章', sort_order: 0},
    {id: '264', parent_id: '262', name: '第一章', sort_order: 1},
    {id: '265', parent_id: '262', name: '第二章', sort_order: 2},
    {id: '266', parent_id: '262', name: '第三章', sort_order: 3},
    {id: '267', parent_id: '262', name: '第四章', sort_order: 4},
    {id: '268', parent_id: '262', name: '终章', sort_order: 5},

    // 序章事件
    {id: '269', parent_id: '263', name: '故乡战争', sort_order: 0},
    {id: '270', parent_id: '263', name: '踏上旅程', sort_order: 1},
    {id: '271', parent_id: '263', name: '第一次战斗', sort_order: 2},

    // 第一章事件
    {id: '272', parent_id: '264', name: '抵达城镇', sort_order: 0},
    {id: '273', parent_id: '264', name: '接取任务', sort_order: 1},
    {id: '274', parent_id: '264', name: '遭遇强敌', sort_order: 2},
    {id: '275', parent_id: '264', name: '力量觉醒', sort_order: 3},

    // 支线 (276~293)
    {id: '276', parent_id: '261', name: '支线', sort_order: 1},
    {id: '277', parent_id: '276', name: '寻宝任务', sort_order: 0},
    {id: '278', parent_id: '276', name: '狩猎任务', sort_order: 1},
    {id: '279', parent_id: '276', name: '救援任务', sort_order: 2},
    {id: '280', parent_id: '276', name: '调查任务', sort_order: 3},

    // 寻宝任务事件
    {id: '281', parent_id: '277', name: '古墓寻宝', sort_order: 0},
    {id: '282', parent_id: '277', name: '海底宝藏', sort_order: 1},
    {id: '283', parent_id: '277', name: '天空之城的秘密', sort_order: 2},

    // ========== 第六大类：组织 ==========
    {id: '284', parent_id: null, name: '组织', sort_order: 5},

    // 国家 (285~310)
    {id: '285', parent_id: '284', name: '国家', sort_order: 0},
    {id: '286', parent_id: '285', name: '艾泽拉王国', sort_order: 0},
    {id: '287', parent_id: '285', name: '霜月帝国', sort_order: 1},
    {id: '288', parent_id: '285', name: '太阳联邦', sort_order: 2},
    {id: '289', parent_id: '285', name: '灵魂共和国', sort_order: 3},

    // 艾泽拉王国部门
    {id: '290', parent_id: '286', name: '皇室', sort_order: 0},
    {id: '291', parent_id: '286', name: '贵族院', sort_order: 1},
    {id: '292', parent_id: '286', name: '骑士团', sort_order: 2},
    {id: '293', parent_id: '286', name: '魔法学院', sort_order: 3},

    // 皇室成员
    {id: '294', parent_id: '290', name: '国王', sort_order: 0},
    {id: '295', parent_id: '290', name: '王后', sort_order: 1},
    {id: '296', parent_id: '290', name: '王子', sort_order: 2},
    {id: '297', parent_id: '290', name: '公主', sort_order: 3},

    // 宗教 (298~315)
    {id: '298', parent_id: '284', name: '宗教', sort_order: 1},
    {id: '299', parent_id: '298', name: '光明教廷', sort_order: 0},
    {id: '300', parent_id: '298', name: '自然之环', sort_order: 1},
    {id: '301', parent_id: '298', name: '黑暗之子', sort_order: 2},

    // 光明教廷部门
    {id: '302', parent_id: '299', name: '教宗', sort_order: 0},
    {id: '303', parent_id: '299', name: '圣骑士团', sort_order: 1},
    {id: '304', parent_id: '299', name: '圣殿骑士', sort_order: 2},

    // 佣兵团 (305~328)
    {id: '305', parent_id: '284', name: '佣兵团', sort_order: 2},
    {id: '306', parent_id: '305', name: '狮鹫之翼', sort_order: 0},
    {id: '307', parent_id: '305', name: '暗影之刃', sort_order: 1},
    {id: '308', parent_id: '305', name: '龙骨军团', sort_order: 2},
    {id: '309', parent_id: '305', name: '魔狼帮会', sort_order: 3},

    // 狮鹫之翼信息
    {id: '310', parent_id: '306', name: '团长信息', sort_order: 0},
    {id: '311', parent_id: '306', name: '成员构成', sort_order: 1},
    {id: '312', parent_id: '306', name: '驻地位置', sort_order: 2},
    {id: '313', parent_id: '306', name: '主要任务', sort_order: 3},

    // 暗影之刃信息
    {id: '314', parent_id: '307', name: '团长信息', sort_order: 0},
    {id: '315', parent_id: '307', name: '成员构成', sort_order: 1},
    {id: '316', parent_id: '307', name: '驻地位置', sort_order: 2},

    // 龙骨军团信息
    {id: '317', parent_id: '308', name: '团长信息', sort_order: 0},
    {id: '318', parent_id: '308', name: '成员构成', sort_order: 1},

    // 魔狼帮会信息
    {id: '319', parent_id: '309', name: '首领信息', sort_order: 0},
    {id: '320', parent_id: '309', name: '成员构成', sort_order: 1},

    // 额外细节扩展
    {id: '321', parent_id: '98', name: '成长里程碑', sort_order: 5},
    {id: '322', parent_id: '104', name: '身高体重', sort_order: 4},
    {id: '323', parent_id: '104', name: '特殊标记', sort_order: 5},
    {id: '324', parent_id: '110', name: '背景故事', sort_order: 3},
    {id: '325', parent_id: '126', name: '复活计划', sort_order: 4},
    {id: '326', parent_id: '132', name: '弱点分析', sort_order: 3},
    {id: '327', parent_id: '175', name: '术式原理', sort_order: 4},
    {id: '328', parent_id: '186', name: '效果持续', sort_order: 4},
]
