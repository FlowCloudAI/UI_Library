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
import { DeleteDialog } from './DeleteDialog'
import type { DeleteMode } from './DeleteDialog'
import {
    CategoryTreeNode,
    findNodeInfo,
    isDescendantOf,
} from './flatToTree'
import './Tree.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type DropPosition = 'before' | 'after' | 'into'

interface DropIndicator {
    key: string
    position: DropPosition
}

interface TreeContextValue {
    // State
    expandedKeys: Set<string>
    selectedKey: string | null
    editingKey: string | null
    dropIndicator: DropIndicator | null
    dragKey: string | null
    treeData: CategoryTreeNode[]
    nodeRefs: React.MutableRefObject<Record<string, HTMLElement | null>>

    // Actions
    toggleExpand: (key: string) => void
    select: (key: string) => void
    /** Begin inline rename. editValue is managed inside TreeNodeItem. */
    startEdit: (key: string) => void
    /** Called by TreeNodeItem after user commits (Enter / blur). */
    commitEdit: (key: string, newTitle: string) => Promise<void>
    cancelEdit: () => void
    requestCreate: (parentKey: string | null) => Promise<void>
    requestDelete: (node: CategoryTreeNode) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const TreeContext = createContext<TreeContextValue>(null!)

// ── DnD helpers ───────────────────────────────────────────────────────────────

function computeDropResult(
    roots: CategoryTreeNode[],
    draggedKey: string,
    targetKey: string,
    position: DropPosition
): { newParentKey: string | null; beforeKey: string | null } | null {
    if (draggedKey === targetKey) return null
    // Prevent dropping into own descendant
    if (position === 'into' && isDescendantOf(roots, draggedKey, targetKey)) return null
    // Also skip no-op same-position drops
    const draggedInfo = findNodeInfo(roots, draggedKey)
    const targetInfo = findNodeInfo(roots, targetKey)
    if (!targetInfo) return null

    if (position === 'into') {
        return { newParentKey: targetKey, beforeKey: null }
    }

    const newParentKey = targetInfo.parent?.key ?? null

    if (position === 'before') {
        return { newParentKey, beforeKey: targetKey }
    }

    // 'after' → beforeKey = next sibling of target (null = append at end)
    const nextSibling = targetInfo.siblings[targetInfo.index + 1]
    // Skip if dragged node is already exactly "after" target (same parent, adjacent)
    if (
        draggedInfo &&
        draggedInfo.parent?.key === newParentKey &&
        nextSibling?.key === draggedKey
    )
        return null

    return { newParentKey, beforeKey: nextSibling?.key ?? null }
}

// ── CollapsePanel ─────────────────────────────────────────────────────────────
// Uses ResizeObserver to measure actual content height → precise CSS transition.

function CollapsePanel({
                           open,
                           children,
                       }: {
    open: boolean
    children: React.ReactNode
}) {
    const innerRef = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState(0)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const el = innerRef.current
        if (!el) return
        const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
        ro.observe(el)
        setHeight(el.offsetHeight)
        // Delay enabling transition so initial render skips animation
        requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
        return () => ro.disconnect()
    }, [])

    return (
        <div
            className="fc-tree__collapse"
            style={{
                height: open ? height : 0,
                overflow: 'hidden',
                transition: ready ? 'height 0.2s ease' : 'none',
            }}
        >
            <div ref={innerRef}>{children}</div>
        </div>
    )
}

// ── TreeNodeItem ──────────────────────────────────────────────────────────────

interface TreeNodeItemProps {
    node: CategoryTreeNode
    level: number
}

function TreeNodeItem({ node, level }: TreeNodeItemProps) {
    const ctx = useContext(TreeContext)

    const isExpanded = ctx.expandedKeys.has(node.key)
    const isEditing = ctx.editingKey === node.key
    const hasChildren = node.children.length > 0
    const indicator = ctx.dropIndicator
    const isDragSource = ctx.dragKey === node.key

    // Local edit value — avoids putting keystroke state in the shared context
    const [localEdit, setLocalEdit] = useState('')
    useEffect(() => {
        if (isEditing) setLocalEdit(node.title)
    }, [isEditing, node.title])

    // ── DnD ────────────────────────────────────────────────────────────────────

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({ id: node.key, disabled: isEditing })

    const { setNodeRef: setDropRef } = useDroppable({ id: node.key })

    // Merge drag ref, drop ref, and nodeRefs map
    const setRef = useCallback(
        (el: HTMLDivElement | null) => {
            setDragRef(el)
            setDropRef(el)
            ctx.nodeRefs.current[node.key] = el
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [node.key, setDragRef, setDropRef]
    )

    // ── Edit handlers ───────────────────────────────────────────────────────────

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation()
        if (e.key === 'Enter') ctx.commitEdit(node.key, localEdit)
        if (e.key === 'Escape') ctx.cancelEdit()
    }

    // ── Render ──────────────────────────────────────────────────────────────────

    const isBefore = indicator?.key === node.key && indicator.position === 'before'
    const isAfter  = indicator?.key === node.key && indicator.position === 'after'
    const isInto   = indicator?.key === node.key && indicator.position === 'into'

    const indent = level * 20 + 12 // px

    return (
        <div className={`fc-tree__node ${isDragging ? 'is-dragging' : ''}`}>

            {/* ── Drop indicator: before ── */}
            {isBefore && (
                <div className="fc-tree__drop-line" style={{ marginLeft: indent }} />
            )}

            {/* ── Main row ── */}
            <div
                ref={setRef}
                className={[
                    'fc-tree__item',
                    isDragSource && 'fc-tree__item--drag-source',
                    isInto && 'fc-tree__item--drop-into',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={{ paddingLeft: indent }}
            >
                {/* Drag handle — the only element that initiates drag */}
                <span
                    className="fc-tree__drag-handle"
                    title="拖拽排序"
                    {...attributes}
                    {...listeners}
                    onMouseDown={e => e.stopPropagation()} // prevent row click during drag start
                >
          ⠿
        </span>

                {/* Expand toggle */}
                <span
                    className={[
                        'fc-tree__switcher',
                        !hasChildren && 'fc-tree__switcher--hidden',
                        isExpanded && 'fc-tree__switcher--open',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    onClick={() => hasChildren && ctx.toggleExpand(node.key)}
                >
          {hasChildren ? '▶' : ''}
        </span>

                {/* Title or inline edit input */}
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

                {/* Hover action buttons */}
                {!isEditing && (
                    <span className="fc-tree__actions">
            <button
                className="fc-tree__action"
                title="新建子分类"
                onClick={e => {
                    e.stopPropagation()
                    ctx.requestCreate(node.key)
                }}
            >
              +
            </button>
            <button
                className="fc-tree__action"
                title="重命名（双击也可）"
                onClick={e => {
                    e.stopPropagation()
                    ctx.startEdit(node.key)
                }}
            >
              ✏
            </button>
            <button
                className="fc-tree__action fc-tree__action--danger"
                title="删除"
                onClick={e => {
                    e.stopPropagation()
                    ctx.requestDelete(node)
                }}
            >
              🗑
            </button>
          </span>
                )}
            </div>

            {/* ── Drop indicator: after ── */}
            {isAfter && (
                <div className="fc-tree__drop-line" style={{ marginLeft: indent }} />
            )}

            {/* ── Children (animated) ── */}
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

    /** Callbacks — the Tree never touches the DB directly. */
    onRename?: (key: string, newName: string) => Promise<void>
    /**
     * Should create the node in DB and return its new key.
     * Tree will auto-enter rename mode for the new node once it appears in treeData.
     */
    onCreate?: (parentKey: string | null) => Promise<string>
    onDelete?: (key: string, mode: DeleteMode) => Promise<void>
    /**
     * beforeKey = insert before this sibling (null = append at end of parent).
     * Parent computes new sort_order values from this information.
     */
    onMove?: (
        key: string,
        newParentKey: string | null,
        beforeKey: string | null
    ) => Promise<void>
    onSelect?: (key: string) => void

    /** Controlled selection */
    selectedKey?: string
    searchable?: boolean
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
                         className = '',
                     }: TreeProps) {
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
    const [editingKey, setEditingKey]     = useState<string | null>(null)
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
    const [dragKey, setDragKey]           = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<CategoryTreeNode | null>(null)
    const [searchValue, setSearchValue]   = useState('')

    const nodeRefs   = useRef<Record<string, HTMLElement | null>>({})
    const cursorYRef = useRef(0)

    // Track cursor position globally during drag (used in onDragOver)
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            cursorYRef.current = e.clientY
        }
        window.addEventListener('mousemove', handler, { passive: true })
        return () => window.removeEventListener('mousemove', handler)
    }, [])

    // Pointer sensor with a distance threshold to prevent accidental drags on click
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    // ── Actions ─────────────────────────────────────────────────────────────────

    const toggleExpand = useCallback((key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }, [])

    const select = useCallback(
        (key: string) => {
            onSelect?.(key)
        },
        [onSelect]
    )

    const startEdit = useCallback((key: string) => {
        setEditingKey(key)
    }, [])

    const cancelEdit = useCallback(() => {
        setEditingKey(null)
    }, [])

    const commitEdit = useCallback(
        async (key: string, newTitle: string) => {
            setEditingKey(null)
            const trimmed = newTitle.trim()
            if (trimmed && onRename) {
                await onRename(key, trimmed)
            }
        },
        [onRename]
    )

    const requestCreate = useCallback(
        async (parentKey: string | null) => {
            if (!onCreate) return
            const newKey = await onCreate(parentKey)
            // Expand parent so the new node is visible
            if (parentKey) {
                setExpandedKeys(prev => new Set([...prev, parentKey]))
            }
            // Enter rename mode — TreeNodeItem will auto-focus when editingKey matches
            setEditingKey(newKey)
        },
        [onCreate]
    )

    const requestDelete = useCallback((node: CategoryTreeNode) => {
        setDeleteTarget(node)
    }, [])

    // ── DnD event handlers ───────────────────────────────────────────────────────

    const handleDragStart = (event: DragStartEvent) => {
        setDragKey(event.active.id as string)
        setDropIndicator(null)
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { over, active } = event
        if (!over || over.id === active.id) {
            setDropIndicator(null)
            return
        }

        const targetKey = over.id as string
        const el = nodeRefs.current[targetKey]
        if (!el) return

        const rect = el.getBoundingClientRect()
        const relY = (cursorYRef.current - rect.top) / rect.height
        const position: DropPosition =
            relY < 0.33 ? 'before' : relY > 0.67 ? 'after' : 'into'

        // Block dropping into a descendant
        if (position === 'into' && isDescendantOf(treeData, active.id as string, targetKey)) {
            setDropIndicator(null)
            return
        }

        setDropIndicator({ key: targetKey, position })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active } = event
        setDragKey(null)

        if (!dropIndicator) {
            setDropIndicator(null)
            return
        }

        const result = computeDropResult(
            treeData,
            active.id as string,
            dropIndicator.key,
            dropIndicator.position
        )
        setDropIndicator(null)

        if (result) {
            onMove?.(active.id as string, result.newParentKey, result.beforeKey)
        }
    }

    const handleDragCancel = () => {
        setDragKey(null)
        setDropIndicator(null)
    }

    // ── Search filter ────────────────────────────────────────────────────────────

    const filterTree = (nodes: CategoryTreeNode[], kw: string): CategoryTreeNode[] => {
        if (!kw) return nodes
        return nodes.reduce<CategoryTreeNode[]>((acc, node) => {
            const match = node.title.toLowerCase().includes(kw.toLowerCase())
            const filteredChildren = filterTree(node.children, kw)
            if (match || filteredChildren.length > 0) {
                acc.push({ ...node, children: filteredChildren })
            }
            return acc
        }, [])
    }

    const displayData = searchValue ? filterTree(treeData, searchValue) : treeData

    // ── Context value ────────────────────────────────────────────────────────────

    const ctxValue: TreeContextValue = {
        expandedKeys,
        selectedKey: selectedKey ?? null,
        editingKey,
        dropIndicator,
        dragKey,
        treeData,
        nodeRefs,
        toggleExpand,
        select,
        startEdit,
        commitEdit,
        cancelEdit,
        requestCreate,
        requestDelete,
    }

    // ── Render ───────────────────────────────────────────────────────────────────

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
                    {/* Search bar */}
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
                                <button
                                    className="fc-tree__search-clear"
                                    onClick={() => setSearchValue('')}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    {/* Tree nodes */}
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

                    {/* Add root category */}
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

                {/* Delete dialog (portal-like, rendered inside DndContext to avoid z-index issues) */}
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