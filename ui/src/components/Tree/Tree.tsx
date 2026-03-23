// Tree.tsx
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { RollingBox } from '../Box/RollingBox'
import { DeleteDialog } from './DeleteDialog'
import type { DeleteMode } from './DeleteDialog'
import { CategoryTreeNode, isDescendantOf } from './flatToTree'
import './Tree.css'

// ── Context ───────────────────────────────────────────────────────────────────

interface TreeContextValue {
    expandedKeys: Set<string>
    selectedKey: string | null
    editingKey: string | null
    dropTargetKey: string | null
    dragKey: string | null
    treeData: CategoryTreeNode[]
    toggleExpand: (key: string) => void
    select: (key: string) => void
    startEdit: (key: string) => void
    commitEdit: (key: string, newTitle: string) => Promise<void>
    cancelEdit: () => void
    requestCreate: (parentKey: string | null) => Promise<void>
    requestDelete: (node: CategoryTreeNode) => void
}

const TreeContext = createContext<TreeContextValue>(null!)

// ── CollapsePanel ─────────────────────────────────────────────────────────────

function CollapsePanel({ open, children }: { open: boolean; children: React.ReactNode }) {
    const innerRef = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState(0)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const el = innerRef.current
        if (!el) return
        const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
        ro.observe(el)
        setHeight(el.offsetHeight)
        requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
        return () => ro.disconnect()
    }, [])

    return (
        <div style={{
            height: open ? height : 0,
            overflow: 'hidden',
            transition: ready ? 'height 0.12s ease-out' : 'none',
        }}>
            <div ref={innerRef}>{children}</div>
        </div>
    )
}

// ── TreeNodeItem ──────────────────────────────────────────────────────────────

function TreeNodeItem({ node, level }: { node: CategoryTreeNode; level: number }) {
    const ctx = useContext(TreeContext)

    const isExpanded   = ctx.expandedKeys.has(node.key)
    const isEditing    = ctx.editingKey === node.key
    const isDropTarget = ctx.dropTargetKey === node.key
    const isDragSource = ctx.dragKey === node.key
    const hasChildren  = node.children.length > 0
    const indent       = level * 20 + 12

    const [localEdit, setLocalEdit] = useState('')
    useEffect(() => {
        if (isEditing) setLocalEdit(node.title)
    }, [isEditing, node.title])

    // DnD
    const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
        useDraggable({ id: node.key, disabled: isEditing })
    const { setNodeRef: setDropRef } = useDroppable({ id: node.key })
    const setRef = useCallback((el: HTMLDivElement | null) => {
        setDragRef(el); setDropRef(el)
    }, [setDragRef, setDropRef])

    // Edit
    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation()
        if (e.key === 'Enter')  ctx.commitEdit(node.key, localEdit)
        if (e.key === 'Escape') ctx.cancelEdit()
    }

    return (
        <div className={`fc-tree__node ${isDragging ? 'is-dragging' : ''}`}>
            <div
                ref={setRef}
                className={[
                    'fc-tree__item',
                    isDragSource && 'fc-tree__item--drag-source',
                    isDropTarget && 'fc-tree__item--drop-into',
                ].filter(Boolean).join(' ')}
                style={{ paddingLeft: isDropTarget ? indent + 8 : indent }}
            >
                {/* Drag handle */}
                <span
                    className="fc-tree__drag-handle"
                    title="拖拽移动"
                    {...attributes}
                    {...listeners}
                    onMouseDown={e => e.stopPropagation()}
                >⠿</span>

                {/* Expand toggle */}
                <span
                    className={[
                        'fc-tree__switcher',
                        !hasChildren && 'fc-tree__switcher--hidden',
                        isExpanded   && 'fc-tree__switcher--open',
                    ].filter(Boolean).join(' ')}
                    onClick={() => hasChildren && ctx.toggleExpand(node.key)}
                >
                    {hasChildren ? '▶' : ''}
                </span>

                {/* Title / inline edit */}
                {isEditing ? (
                    <input
                        autoFocus
                        className="fc-tree__edit-input"
                        value={localEdit}
                        onChange={e => setLocalEdit(e.target.value)}
                        onBlur={() => ctx.commitEdit(node.key, localEdit)}
                        onKeyDown={handleEditKeyDown}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <span
                        className="fc-tree__title"
                        onClick={() => ctx.select(node.key)}
                        onDoubleClick={() => ctx.startEdit(node.key)}
                    >
                        {node.title}
                    </span>
                )}

                {/* Hover actions */}
                {!isEditing && (
                    <span className="fc-tree__actions">
                        <button
                            className="fc-tree__action"
                            title="新建子分类"
                            onClick={e => { e.stopPropagation(); ctx.requestCreate(node.key) }}
                        >+</button>
                        <button
                            className="fc-tree__action"
                            title="重命名（双击也可）"
                            onClick={e => { e.stopPropagation(); ctx.startEdit(node.key) }}
                        >✏</button>
                        <button
                            className="fc-tree__action fc-tree__action--danger"
                            title="删除"
                            onClick={e => { e.stopPropagation(); ctx.requestDelete(node) }}
                        >🗑</button>
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && (
                <CollapsePanel open={isExpanded}>
                    {node.children.map(child => (
                        <TreeNodeItem key={child.key} node={child} level={level + 1} />
                    ))}
                </CollapsePanel>
            )}
        </div>
    )
}

// ── Tree ──────────────────────────────────────────────────────────────────────

export interface TreeProps {
    treeData: CategoryTreeNode[]
    onRename?: (key: string, newName: string) => Promise<void>
    onCreate?: (parentKey: string | null) => Promise<string>
    onDelete?: (key: string, mode: DeleteMode) => Promise<void>
    onMove?: (key: string, newParentKey: string) => Promise<void>
    onSelect?: (key: string) => void
    selectedKey?: string
    searchable?: boolean
    scrollHeight?: string
    className?: string
}

export function Tree({
                         treeData,
                         onRename,
                         onCreate,
                         onDelete,
                         onMove,
                         onSelect,
                         selectedKey,
                         searchable = false,
                         scrollHeight = '400px',
                         className = '',
                     }: TreeProps) {
    const [expandedKeys, setExpandedKeys]     = useState<Set<string>>(new Set())
    const [editingKey, setEditingKey]         = useState<string | null>(null)
    const [dropTargetKey, setDropTargetKey]   = useState<string | null>(null)
    const [dragKey, setDragKey]               = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget]     = useState<CategoryTreeNode | null>(null)
    const [searchValue, setSearchValue]       = useState('')

    const dropTargetRef = useRef<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    // ── Actions ───────────────────────────────────────────────────────────────

    const toggleExpand = useCallback((key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }, [])

    const select     = useCallback((key: string) => onSelect?.(key), [onSelect])
    const startEdit  = useCallback((key: string) => setEditingKey(key), [])
    const cancelEdit = useCallback(() => setEditingKey(null), [])

    const commitEdit = useCallback(async (key: string, newTitle: string) => {
        setEditingKey(null)
        const trimmed = newTitle.trim()
        if (trimmed && onRename) await onRename(key, trimmed)
    }, [onRename])

    const requestCreate = useCallback(async (parentKey: string | null) => {
        if (!onCreate) return
        const newKey = await onCreate(parentKey)
        if (parentKey) setExpandedKeys(prev => new Set([...prev, parentKey]))
        setEditingKey(newKey)
    }, [onCreate])

    const requestDelete = useCallback((node: CategoryTreeNode) => {
        setDeleteTarget(node)
    }, [])

    // ── DnD ───────────────────────────────────────────────────────────────────

    const setDrop = (key: string | null) => {
        setDropTargetKey(key)
        dropTargetRef.current = key
    }

    const handleDragStart = ({ active }: DragStartEvent) => {
        setDragKey(active.id as string)
        setDrop(null)
    }

    const handleDragOver = ({ over, active }: DragOverEvent) => {
        if (!over || over.id === active.id) { setDrop(null); return }
        const targetKey = over.id as string
        if (isDescendantOf(treeData, active.id as string, targetKey)) { setDrop(null); return }
        setDrop(targetKey)
    }

    const handleDragEnd = ({ active }: DragEndEvent) => {
        const target = dropTargetRef.current
        setDragKey(null)
        setDrop(null)
        if (!target || active.id === target) return
        onMove?.(active.id as string, target)
    }

    const handleDragCancel = () => { setDragKey(null); setDrop(null) }

    // ── Search ────────────────────────────────────────────────────────────────

    const filterTree = (nodes: CategoryTreeNode[], kw: string): CategoryTreeNode[] => {
        if (!kw) return nodes
        return nodes.reduce<CategoryTreeNode[]>((acc, node) => {
            const match = node.title.toLowerCase().includes(kw.toLowerCase())
            const filteredChildren = filterTree(node.children, kw)
            if (match || filteredChildren.length > 0)
                acc.push({ ...node, children: filteredChildren })
            return acc
        }, [])
    }

    const displayData = searchValue ? filterTree(treeData, searchValue) : treeData

    // ── Context value ─────────────────────────────────────────────────────────

    const ctxValue: TreeContextValue = {
        expandedKeys,
        selectedKey: selectedKey ?? null,
        editingKey,
        dropTargetKey,
        dragKey,
        treeData,
        toggleExpand,
        select,
        startEdit,
        commitEdit,
        cancelEdit,
        requestCreate,
        requestDelete,
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <TreeContext.Provider value={ctxValue}>
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className={`fc-tree ${className}`}>

                    {searchable && (
                        <div className="fc-tree__search">
                            <input
                                type="text"
                                value={searchValue}
                                onChange={e => setSearchValue(e.target.value)}
                                placeholder="搜索分类…"
                                className="fc-tree__search-input"
                            />
                            {searchValue && (
                                <button className="fc-tree__search-clear" onClick={() => setSearchValue('')}>
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    <RollingBox showThumb="show" style={{ height: scrollHeight }}>
                        <div className="fc-tree__list">
                            {displayData.length === 0 && (
                                <div className="fc-tree__empty">
                                    {searchValue ? '无匹配分类' : '暂无分类'}
                                </div>
                            )}
                            {displayData.map(node => (
                                <TreeNodeItem key={node.key} node={node} level={0} />
                            ))}
                        </div>
                    </RollingBox>

                    {onCreate && (
                        <div className="fc-tree__add-root">
                            <button
                                className="fc-tree__add-root-btn"
                                onClick={() => requestCreate(null)}
                            >
                                + 新建顶级分类
                            </button>
                        </div>
                    )}
                </div>

                <DeleteDialog
                    node={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onDelete={async (key, mode) => {
                        await onDelete?.(key, mode)
                        setDeleteTarget(null)
                    }}
                />
            </DndContext>
        </TreeContext.Provider>
    )
}