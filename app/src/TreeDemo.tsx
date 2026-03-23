// TreeDemo.tsx
import { useState } from 'react'
import { Tree, flatToTree } from 'flowcloudai-ui'

let _nextId = 100
const genId = () => String(++_nextId)

interface FlatRow {
    id: string
    parent_id: string | null
    name: string
    sort_order: number
}

const INITIAL_ROWS: FlatRow[] = [
    { id: '1',  parent_id: null, name: '世界设定',  sort_order: 0 },
    { id: '2',  parent_id: '1',  name: '地理',      sort_order: 0 },
    { id: '3',  parent_id: '1',  name: '历史',      sort_order: 1 },
    { id: '4',  parent_id: '2',  name: '大陆',      sort_order: 0 },
    { id: '5',  parent_id: '2',  name: '海洋',      sort_order: 1 },
    { id: '6',  parent_id: '4',  name: '北方大陆',  sort_order: 0 },
    { id: '7',  parent_id: '4',  name: '南方大陆',  sort_order: 1 },
    { id: '8',  parent_id: null, name: '人物',      sort_order: 1 },
    { id: '9',  parent_id: '8',  name: '主角阵营',  sort_order: 0 },
    { id: '10', parent_id: '8',  name: '反派阵营',  sort_order: 1 },
    { id: '11', parent_id: null, name: '魔法体系',  sort_order: 2 },
]

export function TreeDemo() {
    const [rows, setRows]               = useState<FlatRow[]>(INITIAL_ROWS)
    const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined)
    const [log, setLog]                 = useState<string[]>([])

    const addLog = (msg: string) =>
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 12))

    const { roots } = flatToTree(
        rows.map(r => ({ id: r.id, parent_id: r.parent_id, name: r.name, sort_order: r.sort_order }))
    )

    // ── Callbacks ─────────────────────────────────────────────────────────────

    const handleRename = async (key: string, newName: string) => {
        setRows(prev => prev.map(r => r.id === key ? { ...r, name: newName } : r))
        addLog(`重命名 [${key}] → "${newName}"`)
    }

    const handleCreate = async (parentKey: string | null): Promise<string> => {
        const newId = genId()
        const siblings = rows.filter(r => r.parent_id === parentKey)
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(r => r.sort_order)) : -1
        setRows(prev => [...prev, { id: newId, parent_id: parentKey, name: '新建分类', sort_order: maxOrder + 1 }])
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
                    .map(r => r.parent_id === key ? { ...r, parent_id: target.parent_id } : r)
                    .filter(r => r.id !== key)
                addLog(`移交删除 [${key}]，子节点提升至 parent=${target.parent_id ?? '根'}`)
                return updated
            }
        })
    }

    // Drop on target = become target's last child
    const handleMove = async (key: string, newParentKey: string) => {
        setRows(prev => {
            const siblings = prev.filter(r => r.parent_id === newParentKey && r.id !== key)
            const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(r => r.sort_order)) : -1
            addLog(`移动 [${key}] → parent=${newParentKey}`)
            return prev.map(r =>
                r.id === key ? { ...r, parent_id: newParentKey, sort_order: maxOrder + 1 } : r
            )
        })
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{
                width: 350,
                border: '1px solid var(--fc-color-border, #e2e8f0)',
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                <Tree
                    treeData={roots}
                    selectedKey={selectedKey}
                    scrollHeight="360px"
                    onSelect={key => { setSelectedKey(key); addLog(`选中 [${key}]`) }}
                    onRename={handleRename}
                    onCreate={handleCreate}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    searchable
                />
            </div>

            <div style={{
                flex: 1,
                minWidth: 220,
                border: '1px solid var(--fc-color-border, #e2e8f0)',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 13,
            }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>操作日志</div>
                {log.length === 0 && (
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>
                        试试展开、新建、重命名、拖拽或删除分类
                    </div>
                )}
                {log.map((entry, i) => (
                    <div key={i} style={{
                        padding: '4px 0',
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
    )
}