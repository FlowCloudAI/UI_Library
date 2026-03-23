// Tree.tsx
import React, {
    createContext,
    memo,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {
    DndContext,
    DragEndEvent,
    DragMoveEvent,
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

export type DropPosition = 'before' | 'after' | 'into'

// ── Contexts (split: stable actions / tree state / high-freq dnd state) ─────

interface TreeActionsValue {
    toggleExpand: (key: string) => void
    select: (key: string) => void
    startEdit: (key: string) => void
    commitEdit: (key: string, newTitle: string) => Promise<void>
    cancelEdit: () => void
    requestCreate: (parentKey: string | null) => Promise<void>
    requestDelete: (node: CategoryTreeNode) => void
}

interface TreeStateValue {
    expandedKeys: Set<string>
    selectedKey: string | null
    editingKey: string | null
}

interface DndStateValue {
    dropTargetKey: string | null
    dropPosition: DropPosition | null
    dragKey: string | null
}

const TreeActionsCtx = createContext<TreeActionsValue>(null!)
const TreeStateCtx   = createContext<TreeStateValue>(null!)
const DndStateCtx    = createContext<DndStateValue>(null!)

// ── CollapsePanel ─────────────────────────────────────────────────────────────

const CollapsePanel = memo(function CollapsePanel(
    { open, children }: { open: boolean; children: React.ReactNode }
) {
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
})

// ── DndSlot (isolates dnd-kit hooks — only this wrapper re-renders on dnd) ──

const DndSlot = memo(function DndSlot({
                                          nodeKey,
                                          disabled,
                                          children,
                                      }: {
    nodeKey: string
    disabled: boolean
    children: (bag: {
        setRef: (el: HTMLDivElement | null) => void
        handleProps: Record<string, unknown>
        isDragging: boolean
        isDragSource: boolean
        dropPosition: DropPosition | null
    }) => React.ReactNode
}) {
    const dndState = useContext(DndStateCtx)

    const isDropTarget = dndState.dropTargetKey === nodeKey
    const dropPosition = isDropTarget ? dndState.dropPosition : null
    const isDragSource = dndState.dragKey === nodeKey

    const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
        useDraggable({ id: nodeKey, disabled })
    const { setNodeRef: setDropRef } = useDroppable({ id: nodeKey, disabled })

    const setRef = useCallback((el: HTMLDivElement | null) => {
        setDragRef(el); setDropRef(el)
    }, [setDragRef, setDropRef])

    const handleProps = useMemo(
        () => ({ ...attributes, ...listeners }),
        [attributes, listeners]
    )

    return <>{children({ setRef, handleProps, isDragging, isDragSource, dropPosition })}</>
})

// ── TreeNodeItem (memo — skips re-render unless own props change) ────────────

interface TreeNodeItemProps {
    node: CategoryTreeNode
    level: number
    hidden?: boolean
}

const TreeNodeItem = memo(function TreeNodeItem({ node, level, hidden = false }: TreeNodeItemProps) {
    const actions = useContext(TreeActionsCtx)   // stable — never triggers re-render
    const state   = useContext(TreeStateCtx)     // changes on expand/select/edit

    const isExpanded  = state.expandedKeys.has(node.key)
    const isEditing   = state.editingKey === node.key
    const hasChildren = node.children.length > 0
    const indent      = level * 20 + 12

    const [localEdit, setLocalEdit] = useState('')
    useEffect(() => {
        if (isEditing) setLocalEdit(node.title)
    }, [isEditing, node.title])

    const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation()
        if (e.key === 'Enter')  actions.commitEdit(node.key, localEdit).then()
        if (e.key === 'Escape') actions.cancelEdit()
    }, [actions, node.key, localEdit])

    return (
        <DndSlot nodeKey={node.key} disabled={isEditing || hidden}>
            {({ setRef, handleProps, isDragging, isDragSource, dropPosition }) => (
                <div className={`fc-tree__node ${isDragging ? 'is-dragging' : ''}`}>
                    <div
                        ref={setRef}
                        className={[
                            'fc-tree__item',
                            isDragSource              && 'fc-tree__item--drag-source',
                            dropPosition === 'into'   && 'fc-tree__item--drop-into',
                            dropPosition === 'before'  && 'fc-tree__item--drop-before',
                            dropPosition === 'after'   && 'fc-tree__item--drop-after',
                        ].filter(Boolean).join(' ')}
                        style={{
                            paddingLeft: dropPosition === 'into' ? indent + 8 : indent,
                            '--fc-indent': `${indent}px`,
                        } as React.CSSProperties}
                    >
                        {/* Drag handle */}
                        <span
                            className="fc-tree__drag-handle"
                            title="拖拽移动"
                            {...handleProps}
                            onMouseDown={e => e.stopPropagation()}
                        >⠿</span>

                        {/* Expand toggle */}
                        <span
                            className={[
                                'fc-tree__switcher',
                                !hasChildren && 'fc-tree__switcher--hidden',
                                isExpanded   && 'fc-tree__switcher--open',
                            ].filter(Boolean).join(' ')}
                            onClick={() => hasChildren && actions.toggleExpand(node.key)}
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
                                onBlur={() => actions.commitEdit(node.key, localEdit)}
                                onKeyDown={handleEditKeyDown}
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span
                                className="fc-tree__title"
                                onClick={() => {
                                    actions.select(node.key)
                                    if (hasChildren) actions.toggleExpand(node.key)
                                }}
                                onDoubleClick={() => actions.startEdit(node.key)}
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
                                    onClick={e => { e.stopPropagation(); actions.requestCreate(node.key).then() }}
                                >+</button>
                                <button
                                    className="fc-tree__action"
                                    title="重命名（双击也可）"
                                    onClick={e => { e.stopPropagation(); actions.startEdit(node.key) }}
                                >✏</button>
                                <button
                                    className="fc-tree__action fc-tree__action--danger"
                                    title="删除"
                                    onClick={e => { e.stopPropagation(); actions.requestDelete(node) }}
                                >🗑</button>
                            </span>
                        )}
                    </div>

                    {/* Children */}
                    {hasChildren && (
                        <CollapsePanel open={isExpanded}>
                            {node.children.map(child => (
                                <TreeNodeItem key={child.key} node={child} level={level + 1} hidden={hidden || !isExpanded} />
                            ))}
                        </CollapsePanel>
                    )}
                </div>
            )}
        </DndSlot>
    )
})

// ── Tree ──────────────────────────────────────────────────────────────────────

export interface TreeProps {
    treeData: CategoryTreeNode[]
    onRename?: (key: string, newName: string) => Promise<void>
    onCreate?: (parentKey: string | null) => Promise<string>
    onDelete?: (key: string, mode: DeleteMode) => Promise<void>
    onMove?: (key: string, targetKey: string, position: DropPosition) => Promise<void>
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
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
    const [editingKey, setEditingKey]     = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(null)
    const [searchValue, setSearchValue]   = useState('')

    // DnD state — single object so one setState = one render
    const [dndState, setDndState] = useState<DndStateValue>({
        dropTargetKey: null,
        dropPosition: null,
        dragKey: null,
    })

    const dropRef     = useRef<{ key: string | null; pos: DropPosition | null }>({ key: null, pos: null })
    const pointerYRef = useRef(0)

    useEffect(() => {
        const handler = (e: PointerEvent) => { pointerYRef.current = e.clientY }
        window.addEventListener('pointermove', handler)
        return () => window.removeEventListener('pointermove', handler)
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    // ── Actions (stable — deps rarely change) ────────────────────────────────

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

    // ── DnD handlers ─────────────────────────────────────────────────────────

    // Use refs to avoid recreating callbacks when treeData / expandedKeys change
    const treeDataRef  = useRef(treeData)
    const expandedRef  = useRef(expandedKeys)
    treeDataRef.current  = treeData
    expandedRef.current  = expandedKeys

    const handleDragStart = useCallback(({ active }: DragStartEvent) => {
        dropRef.current = { key: null, pos: null }
        setDndState({ dropTargetKey: null, dropPosition: null, dragKey: active.id as string })
    }, [])

    const handleDragMove = useCallback(({ over, active }: DragMoveEvent) => {
        if (!over || over.id === active.id) {
            if (dropRef.current.key !== null) {
                dropRef.current = { key: null, pos: null }
                setDndState(prev => ({ ...prev, dropTargetKey: null, dropPosition: null }))
            }
            return
        }

        const targetKey = over.id as string
        if (isDescendantOf(treeDataRef.current, active.id as string, targetKey)) {
            if (dropRef.current.key !== null) {
                dropRef.current = { key: null, pos: null }
                setDndState(prev => ({ ...prev, dropTargetKey: null, dropPosition: null }))
            }
            return
        }

        const rect  = over.rect
        const y     = pointerYRef.current
        const ratio = Math.max(0, Math.min(1, (y - rect.top) / rect.height))

        let position: DropPosition
        if (ratio < 0.2) position = 'before'
        else if (ratio > 0.8) position = 'after'
        else position = 'into'

        // Bail out — same target + same zone → skip setState entirely
        if (dropRef.current.key === targetKey && dropRef.current.pos === position) return

        dropRef.current = { key: targetKey, pos: position }
        setDndState(prev => ({ ...prev, dropTargetKey: targetKey, dropPosition: position }))
    }, [])

    const handleDragEnd = useCallback(({ active }: DragEndEvent) => {
        const { key: target, pos: position } = dropRef.current
        dropRef.current = { key: null, pos: null }
        setDndState({ dropTargetKey: null, dropPosition: null, dragKey: null })
        if (!target || !position || active.id === target) return
        onMove?.(active.id as string, target, position)
    }, [onMove])

    const handleDragCancel = useCallback(() => {
        dropRef.current = { key: null, pos: null }
        setDndState({ dropTargetKey: null, dropPosition: null, dragKey: null })
    }, [])

    // ── Search (memoised) ────────────────────────────────────────────────────

    const displayData = useMemo(() => {
        if (!searchValue) return treeData
        const kw = searchValue.toLowerCase()
        const filter = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
            nodes.reduce<CategoryTreeNode[]>((acc, node) => {
                const match = node.title.toLowerCase().includes(kw)
                const filteredChildren = filter(node.children)
                if (match || filteredChildren.length > 0)
                    acc.push({ ...node, children: filteredChildren })
                return acc
            }, [])
        return filter(treeData)
    }, [treeData, searchValue])

    // ── Context values (memoised separately) ─────────────────────────────────

    const actionsValue = useMemo<TreeActionsValue>(() => ({
        toggleExpand, select, startEdit, commitEdit, cancelEdit, requestCreate, requestDelete,
    }), [toggleExpand, select, startEdit, commitEdit, cancelEdit, requestCreate, requestDelete])

    const stateValue = useMemo<TreeStateValue>(() => ({
        expandedKeys,
        selectedKey: selectedKey ?? null,
        editingKey,
    }), [expandedKeys, selectedKey, editingKey])

    // dndState identity only changes when values actually change (single setState)

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <TreeActionsCtx.Provider value={actionsValue}>
            <TreeStateCtx.Provider value={stateValue}>
                <DndStateCtx.Provider value={dndState}>
                    <DndContext
                        sensors={sensors}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
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
                </DndStateCtx.Provider>
            </TreeStateCtx.Provider>
        </TreeActionsCtx.Provider>
    )
}