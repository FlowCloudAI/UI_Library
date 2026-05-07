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
import { useContextMenu, type ContextMenuItem } from '../ContextMenu/ContextMenuContext'

import { CategoryTreeNode } from './flatToTree'
import './Tree.css'

export type DropPosition = 'before' | 'after' | 'into'
export type TreeActionDisplayMode = 'auto' | 'inline' | 'overflow'

export interface TreeColorTokens {
    text?: string
    textMuted?: string
    bgHover?: string
    bgSelected?: string
    border?: string
    borderFocus?: string
    primary?: string
    primarySubtle?: string
    danger?: string
    actionHoverBg?: string
    dropIndicator?: string
}

export interface TreeNodeRenderState {
    level: number
    hidden: boolean
    isExpanded: boolean
    isSelected: boolean
    isEditing: boolean
    hasChildren: boolean
    isCompactActions: boolean
    canDrag: boolean
    canRename: boolean
    canDelete: boolean
    canCreate: boolean
}

export interface TreeNodeActionHelpers {
    select: () => void
    toggleExpand: () => void
    expandSubtree: () => void
    collapseSubtree: () => void
    startEdit: () => void
    requestCreate: () => Promise<void>
    requestDelete: () => void
}

export type TreeActionItem =
    | {
        type?: 'action'
        key: string
        label: string
        icon?: React.ReactNode
        title?: string
        onClick: () => void | Promise<void>
        danger?: boolean
        disabled?: boolean
        showInline?: boolean
        showInMenu?: boolean
    }
    | {
        type: 'divider'
        key?: string
        showInMenu?: boolean
    }

// ── Context（拆分：稳定 actions / 树状态 / 高频拖拽状态）─────

interface TreeActionsValue {
    toggleExpand: (key: string) => void
    expandSubtree: (node: CategoryTreeNode) => void
    collapseSubtree: (node: CategoryTreeNode) => void
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

interface TreeOptionsValue {
    indentSize: number
    actionDisplayMode: TreeActionDisplayMode
    actionCollapseThreshold: number
    renderTitle?: (node: CategoryTreeNode, state: TreeNodeRenderState) => React.ReactNode
    getNodeActions?: (
        node: CategoryTreeNode,
        state: TreeNodeRenderState,
        helpers: TreeNodeActionHelpers
    ) => TreeActionItem[]
    canDrag?: (node: CategoryTreeNode) => boolean
    canDrop?: (source: CategoryTreeNode, target: CategoryTreeNode, position: DropPosition) => boolean
    canRename?: (node: CategoryTreeNode) => boolean
    canDelete?: (node: CategoryTreeNode) => boolean
    canCreate?: (node: CategoryTreeNode | null) => boolean
    dragEnabled: boolean
    renameEnabled: boolean
    deleteEnabled: boolean
    createEnabled: boolean
    collapseDuration: number
}

const TreeActionsCtx = createContext<TreeActionsValue>(null!)
const TreeStateCtx   = createContext<TreeStateValue>(null!)
const DndStateCtx    = createContext<DndStateValue>(null!)
const TreeOptionsCtx = createContext<TreeOptionsValue>(null!)

// ── 折叠面板 ─────────────────────────────────────────────────────────────

const CollapsePanel = memo(function CollapsePanel(
    { open, children }: { open: boolean; children: React.ReactNode }
) {
    const { collapseDuration } = useContext(TreeOptionsCtx)
    const innerRef = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState(0)
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const el = innerRef.current
        if (!el) return
        const ro = new ResizeObserver((entries) => {
            // 使用 entry 数据，避免读取 el.offsetHeight 触发同步 layout
            const h = entries[0]?.contentRect.height
            if (h !== undefined) setHeight(h)
        })
        ro.observe(el)
        setHeight(el.offsetHeight) // 挂载时一次性读取，可以接受
        requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)))
        return () => ro.disconnect()
    }, [])

    return (
        <div style={{
            height: open ? height : 0,
            overflow: 'hidden',
            transition: ready ? `height ${collapseDuration}s ease-out` : 'none',
        }}>
            <div ref={innerRef}>{children}</div>
        </div>
    )
})

// ── 拖拽插槽（隔离 dnd-kit hooks — 仅此包装器在拖拽时重新渲染）──

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

function collectExpandableKeys(node: CategoryTreeNode): string[] {
    const keys: string[] = []
    const visit = (current: CategoryTreeNode) => {
        if (current.children.length > 0) {
            keys.push(current.key)
            current.children.forEach(visit)
        }
    }
    visit(node)
    return keys
}

function isTreeActionDivider(item: TreeActionItem): item is Extract<TreeActionItem, { type: 'divider' }> {
    return item.type === 'divider'
}

function normaliseContextMenuItems(items: ContextMenuItem[]): ContextMenuItem[] {
    const result: ContextMenuItem[] = []

    for (const item of items) {
        if ('type' in item && item.type === 'divider') {
            if (result.length === 0) continue
            const last = result[result.length - 1]
            if ('type' in last && last.type === 'divider') continue
        }

        result.push(item)
    }

    while (result.length > 0) {
        const last = result[result.length - 1]
        if (!('type' in last) || last.type !== 'divider') break
        result.pop()
    }

    return result
}

// ── 树节点项（memo — 仅在自身 props 变化时重新渲染）────────────

interface TreeNodeItemProps {
    node: CategoryTreeNode
    level: number
    hidden?: boolean
}

interface TreeNodeItemCoreProps extends TreeNodeItemProps {
    isSelected: boolean
    isExpanded: boolean
    isEditing: boolean
}

// 核心：memo 化的重型组件 — 状态来自 props，因此 memo 可以拦截
const TreeNodeItemCore = memo(function TreeNodeItemCore({
    node, level, hidden = false, isSelected, isExpanded, isEditing,
}: TreeNodeItemCoreProps) {
    const actions = useContext(TreeActionsCtx)   // 稳定 — 从不触发重新渲染
    const options = useContext(TreeOptionsCtx)
    const { showContextMenu } = useContextMenu()

    const hasChildren = node.children.length > 0
    const indent      = level * options.indentSize + 12
    const canDragNode   = options.dragEnabled && (!options.canDrag || options.canDrag(node))
    const canRenameNode = options.renameEnabled && (!options.canRename || options.canRename(node))
    const canDeleteNode = options.deleteEnabled && (!options.canDelete || options.canDelete(node))
    const canCreateNode = options.createEnabled && (!options.canCreate || options.canCreate(node))

    const [localEdit, setLocalEdit] = useState('')
    const itemRef = useRef<HTMLDivElement | null>(null)
    const [isAutoCompact, setIsAutoCompact] = useState(false)

    useEffect(() => {
        if (isEditing) setLocalEdit(node.title)
    }, [isEditing, node.title])

    useEffect(() => {
        if (options.actionDisplayMode !== 'auto') {
            setIsAutoCompact(false)
            return
        }

        const el = itemRef.current
        if (!el) return

        // 初始化时一次性同步读取（挂载时可接受）
        const style = window.getComputedStyle(el)
        const initialWidth =
            el.clientWidth
            - Number.parseFloat(style.paddingLeft || '0')
            - Number.parseFloat(style.paddingRight || '0')
        setIsAutoCompact(initialWidth < options.actionCollapseThreshold)

        const observer = new ResizeObserver((entries) => {
            // 用 entry.contentRect.width 替代 getComputedStyle + clientWidth，
            // 避免 ResizeObserver 回调内触发同步强制 layout
            const w = entries[0]?.contentRect.width
            if (w !== undefined) setIsAutoCompact(w < options.actionCollapseThreshold)
        })
        observer.observe(el)

        return () => observer.disconnect()
    }, [indent, options.actionCollapseThreshold, options.actionDisplayMode])

    const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation()
        if (e.key === 'Enter')  actions.commitEdit(node.key, localEdit).then()
        if (e.key === 'Escape') actions.cancelEdit()
    }, [actions, node.key, localEdit])

    const requestedCompactActions = options.actionDisplayMode === 'overflow'
        || (options.actionDisplayMode === 'auto' && isAutoCompact)

    const renderState = useMemo<TreeNodeRenderState>(() => ({
        level,
        hidden,
        isExpanded,
        isSelected,
        isEditing,
        hasChildren,
        isCompactActions: requestedCompactActions,
        canDrag: canDragNode,
        canRename: canRenameNode,
        canDelete: canDeleteNode,
        canCreate: canCreateNode,
    }), [
        level,
        hidden,
        isExpanded,
        isSelected,
        isEditing,
        hasChildren,
        requestedCompactActions,
        canDragNode,
        canRenameNode,
        canDeleteNode,
        canCreateNode,
    ])

    const actionHelpers = useMemo<TreeNodeActionHelpers>(() => ({
        select: () => actions.select(node.key),
        toggleExpand: () => actions.toggleExpand(node.key),
        expandSubtree: () => actions.expandSubtree(node),
        collapseSubtree: () => actions.collapseSubtree(node),
        startEdit: () => actions.startEdit(node.key),
        requestCreate: () => actions.requestCreate(node.key),
        requestDelete: () => actions.requestDelete(node),
    }), [actions, node])

    const defaultNodeActions = useMemo<TreeActionItem[]>(() => {
        const next: TreeActionItem[] = []

        if (canRenameNode) {
            next.push({
                key: 'rename',
                label: '重命名',
                icon: '✏',
                title: '重命名（双击也可）',
                onClick: actionHelpers.startEdit,
            })
        }

        if (hasChildren) {
            next.push(
                {
                    key: 'expand',
                    label: '全部展开',
                    icon: '▾',
                    onClick: actionHelpers.expandSubtree,
                    disabled: !hasChildren,
                    showInline: false,
                },
                {
                    key: 'collapse',
                    label: '全部收起',
                    icon: '▸',
                    onClick: actionHelpers.collapseSubtree,
                    disabled: !hasChildren,
                    showInline: false,
                }
            )
        }

        const hasSecondaryGroup = canCreateNode || canDeleteNode
        if (hasSecondaryGroup && next.length > 0) {
            next.push({ type: 'divider', key: 'divider-main' })
        }

        if (canCreateNode) {
            next.push({
                key: 'create',
                label: '添加子项',
                icon: '+',
                title: '新建子分类',
                onClick: actionHelpers.requestCreate,
            })
        }

        if (canDeleteNode) {
            next.push({
                key: 'delete',
                label: '删除',
                icon: '🗑',
                onClick: actionHelpers.requestDelete,
                danger: true,
            })
        }

        return next
    }, [actionHelpers, canCreateNode, canDeleteNode, canRenameNode, hasChildren])

    const nodeActions = useMemo<TreeActionItem[]>(() => {
        return options.getNodeActions?.(node, renderState, actionHelpers) ?? defaultNodeActions
    }, [actionHelpers, defaultNodeActions, node, options, renderState])

    const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
        const menuItems = nodeActions
            .filter(item => item.showInMenu !== false)
            .map<ContextMenuItem>(item => {
                if (isTreeActionDivider(item)) return { type: 'divider' }
                return {
                    label: item.label,
                    icon: item.icon,
                    onClick: item.onClick,
                    danger: item.danger,
                    disabled: item.disabled,
                }
            })

        return normaliseContextMenuItems(menuItems)
    }, [nodeActions])

    const compactActions = requestedCompactActions && contextMenuItems.length > 0

    const inlineActions = useMemo(() => {
        if (compactActions) return []
        return nodeActions.filter(
            (item): item is Extract<TreeActionItem, { type?: 'action' }> =>
                !isTreeActionDivider(item) && item.showInline !== false
        )
    }, [compactActions, nodeActions])

    const handleItemClick = useCallback(() => {
        if (!isSelected) {
            actions.select(node.key)
            return
        }
        if (hasChildren) actions.toggleExpand(node.key)
    }, [actions, hasChildren, isSelected, node.key])

    const handleSwitcherClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (hasChildren) actions.toggleExpand(node.key)
    }, [actions, hasChildren, node.key])

    const openNodeMenu = useCallback((e: React.MouseEvent) => {
        if (contextMenuItems.length === 0) return
        actions.select(node.key)
        showContextMenu(e as unknown as MouseEvent, contextMenuItems)
    }, [actions, contextMenuItems, node.key, showContextMenu])

    const titleContent = options.renderTitle?.(node, renderState) ?? node.title

    return (
        <DndSlot nodeKey={node.key} disabled={isEditing || hidden || !canDragNode}>
            {({ setRef, handleProps, isDragging, isDragSource, dropPosition }) => (
                <div className={`fc-tree__node ${isDragging ? 'is-dragging' : ''}`}>
                    <div
                        ref={el => {
                            itemRef.current = el
                            setRef(el)
                        }}
                        className={[
                            'fc-tree__item',
                            isSelected               && 'fc-tree__item--selected',
                            isDragSource              && 'fc-tree__item--drag-source',
                            dropPosition === 'into'   && 'fc-tree__item--drop-into',
                            dropPosition === 'before'  && 'fc-tree__item--drop-before',
                            dropPosition === 'after'   && 'fc-tree__item--drop-after',
                        ].filter(Boolean).join(' ')}
                        style={{
                            paddingLeft: dropPosition === 'into' ? indent + 8 : indent,
                            '--fc-indent': `${indent}px`,
                        } as React.CSSProperties}
                        onClick={handleItemClick}
                        onContextMenu={isEditing || contextMenuItems.length === 0 ? undefined : openNodeMenu}
                    >
                        {/* 拖拽手柄 */}
                        <span
                            className={[
                                'fc-tree__drag-handle',
                                !canDragNode && 'fc-tree__drag-handle--disabled',
                            ].filter(Boolean).join(' ')}
                            title={canDragNode ? '拖拽移动' : undefined}
                            {...(canDragNode ? handleProps : {})}
                            onMouseDown={e => e.stopPropagation()}
                        >⠿</span>

                        {/* 展开/折叠 */}
                        <span
                            className={[
                                'fc-tree__switcher',
                                !hasChildren && 'fc-tree__switcher--hidden',
                                isExpanded   && 'fc-tree__switcher--open',
                            ].filter(Boolean).join(' ')}
                            onClick={handleSwitcherClick}
                        >
                            {hasChildren ? '▶' : ''}
                        </span>

                        {/* 标题 / 内联编辑 */}
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
                            <span className="fc-tree__title-slot">
                                <span
                                    className="fc-tree__title"
                                    onDoubleClick={canRenameNode ? (e) => {
                                        e.stopPropagation()
                                        actions.startEdit(node.key)
                                    } : undefined}
                                >
                                    {titleContent}
                                </span>
                            </span>
                        )}

                        {/* 悬停操作 */}
                        {!isEditing && (compactActions || inlineActions.length > 0) && (
                            <span className={[
                                'fc-tree__actions',
                                compactActions && 'fc-tree__actions--compact',
                            ].filter(Boolean).join(' ')}
                                  style={{
                                      '--fc-tree-actions-width': compactActions
                                          ? '22px'
                                          : `${Math.max(1, inlineActions.length) * 24}px`,
                                  } as React.CSSProperties}>
                                {inlineActions.length > 0 && (
                                    <span className="fc-tree__actions-inline">
                                        {inlineActions.map(action => (
                                            <button
                                                key={action.key}
                                                className={[
                                                    'fc-tree__action',
                                                    action.danger && 'fc-tree__action--danger',
                                                ].filter(Boolean).join(' ')}
                                                title={action.title ?? action.label}
                                                disabled={action.disabled}
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    void action.onClick()
                                                }}
                                            >
                                                {action.icon ?? action.label}
                                            </button>
                                        ))}
                                    </span>
                                )}
                                {compactActions && (
                                    <button
                                        className="fc-tree__action fc-tree__action--more"
                                        title="更多操作"
                                        onClick={e => openNodeMenu(e)}
                                    >⋯</button>
                                )}
                            </span>
                        )}
                    </div>

                    {/* 子节点 */}
                    {hasChildren && isExpanded && (
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

// 连接器：轻量，订阅 TreeStateCtx，将派生布尔值传递给 memo 化核心。
// 当 isSelected/isExpanded/isEditing 未变化时，仅 TreeNodeItemCore（重部件）重新渲染。
function TreeNodeItem({ node, level, hidden = false }: TreeNodeItemProps) {
    const state = useContext(TreeStateCtx)
    return (
        <TreeNodeItemCore
            node={node}
            level={level}
            hidden={hidden}
            isSelected={state.selectedKey === node.key}
            isExpanded={state.expandedKeys.has(node.key)}
            isEditing={state.editingKey === node.key}
        />
    )
}

// ── 树 ──────────────────────────────────────────────────────────────────────

export interface TreeProps {
    treeData: CategoryTreeNode[]
    onRename?: (key: string, newName: string) => Promise<void>
    onCreate?: (parentKey: string | null) => Promise<string>
    onDeleteRequest?: (node: CategoryTreeNode) => void
    onMove?: (key: string, targetKey: string, position: DropPosition) => Promise<void>
    onSelect?: (key: string) => void
    selectedKey?: string
    expandedKeys?: string[]
    defaultExpandedKeys?: string[]
    onExpandedKeysChange?: (keys: string[]) => void
    searchable?: boolean
    searchValue?: string
    defaultSearchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    renderTitle?: (node: CategoryTreeNode, state: TreeNodeRenderState) => React.ReactNode
    getNodeActions?: (
        node: CategoryTreeNode,
        state: TreeNodeRenderState,
        helpers: TreeNodeActionHelpers
    ) => TreeActionItem[]
    canDrag?: (node: CategoryTreeNode) => boolean
    canDrop?: (source: CategoryTreeNode, target: CategoryTreeNode, position: DropPosition) => boolean
    canRename?: (node: CategoryTreeNode) => boolean
    canDelete?: (node: CategoryTreeNode) => boolean
    canCreate?: (node: CategoryTreeNode | null) => boolean
    indentSize?: number
    actionDisplayMode?: TreeActionDisplayMode
    actionCollapseThreshold?: number
    colorTokens?: TreeColorTokens
    scrollHeight?: string
    className?: string
    /** 折叠/展开动画时长（秒），默认 0.12 */
    collapseDuration?: number
}

export function Tree({
                         treeData,
                         onRename,
                         onCreate,
                         onDeleteRequest,
                         onMove,
                         onSelect,
                         selectedKey,
                         expandedKeys: controlledExpandedKeys,
                         defaultExpandedKeys,
                         onExpandedKeysChange,
                         searchable = false,
                         searchValue: controlledSearchValue,
                         defaultSearchValue = '',
                         onSearchChange,
                         searchPlaceholder = '搜索分类…',
                         renderTitle,
                         getNodeActions,
                         canDrag,
                         canDrop,
                         canRename,
                         canDelete,
                         canCreate,
                         indentSize = 20,
                         actionDisplayMode = 'auto',
                         actionCollapseThreshold = 208,
                         colorTokens,
                         scrollHeight = '400px',
                         className = '',
                         collapseDuration = 0.12,
                     }: TreeProps) {
    const [uncontrolledExpandedKeys, setUncontrolledExpandedKeys] = useState<Set<string>>(
        () => new Set(defaultExpandedKeys ?? [])
    )
    const [editingKey, setEditingKey]     = useState<string | null>(null)
    const [uncontrolledSearchValue, setUncontrolledSearchValue] = useState(defaultSearchValue)

    // 拖拽状态 — 单个对象，一次 setState = 一次渲染
    const [dndState, setDndState] = useState<DndStateValue>({
        dropTargetKey: null,
        dropPosition: null,
        dragKey: null,
    })

    const dropRef     = useRef<{ key: string | null; pos: DropPosition | null }>({ key: null, pos: null })
    const pointerYRef = useRef(0)
    const dragEnabled = Boolean(onMove)
    const renameEnabled = Boolean(onRename)
    const deleteEnabled = Boolean(onDeleteRequest)
    const createEnabled = Boolean(onCreate)
    const currentExpandedKeys = useMemo(
        () => new Set(controlledExpandedKeys ?? uncontrolledExpandedKeys),
        [controlledExpandedKeys, uncontrolledExpandedKeys]
    )
    // Ref 让 setExpandedKeys 读取最新值而不作为依赖，因此
    // toggleExpand/expandSubtree/collapseSubtree → actionsValue 链条保持稳定。
    const expandedKeysRef = useRef(currentExpandedKeys)
    expandedKeysRef.current = currentExpandedKeys

    const currentSearchValue = controlledSearchValue ?? uncontrolledSearchValue
    const canCreateRoot = createEnabled && (!canCreate || canCreate(null))

    useEffect(() => {
        const handler = (e: PointerEvent) => { pointerYRef.current = e.clientY }
        window.addEventListener('pointermove', handler)
        return () => window.removeEventListener('pointermove', handler)
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    // ── 操作（稳定 — 依赖很少变化）────────────────────────────────

    const commitExpandedKeys = useCallback((next: Set<string>) => {
        if (controlledExpandedKeys === undefined) {
            setUncontrolledExpandedKeys(next)
        }
        onExpandedKeysChange?.(Array.from(next))
    }, [controlledExpandedKeys, onExpandedKeysChange])

    const setExpandedKeys = useCallback((recipe: (prev: Set<string>) => Set<string>) => {
        commitExpandedKeys(recipe(new Set(expandedKeysRef.current)))
    }, [commitExpandedKeys])

    const toggleExpand = useCallback((key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }, [setExpandedKeys])

    const expandSubtree = useCallback((node: CategoryTreeNode) => {
        const keys = collectExpandableKeys(node)
        if (keys.length === 0) return
        setExpandedKeys(prev => {
            const next = new Set(prev)
            keys.forEach(key => next.add(key))
            return next
        })
    }, [setExpandedKeys])

    const collapseSubtree = useCallback((node: CategoryTreeNode) => {
        const keys = collectExpandableKeys(node)
        if (keys.length === 0) return
        setExpandedKeys(prev => {
            const next = new Set(prev)
            keys.forEach(key => next.delete(key))
            return next
        })
    }, [setExpandedKeys])

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
    }, [onCreate, setExpandedKeys])

    const requestDelete = useCallback((node: CategoryTreeNode) => {
        onDeleteRequest?.(node)
    }, [onDeleteRequest])

    // ── 拖拽处理器 ─────────────────────────────────────────────────────────

    // 使用 refs 避免在 treeData/permissions 变化时重新创建回调
    const treeDataRef  = useRef(treeData)
    const canDropRef   = useRef(canDrop)
    treeDataRef.current  = treeData
    canDropRef.current   = canDrop

    // O(1) 节点和父链查找 — 仅在 treeData 变化时重建
    const { nodeMap: _nodeMap, parentMap: _parentMap } = useMemo(() => {
        const nodeMap   = new Map<string, CategoryTreeNode>()
        const parentMap = new Map<string, string | null>()
        const visit = (nodes: CategoryTreeNode[], pk: string | null) => {
            for (const n of nodes) {
                nodeMap.set(n.key, n)
                parentMap.set(n.key, pk)
                visit(n.children, n.key)
            }
        }
        visit(treeData, null)
        return { nodeMap, parentMap }
    }, [treeData])
    const nodeMapRef   = useRef(_nodeMap);   nodeMapRef.current   = _nodeMap
    const parentMapRef = useRef(_parentMap); parentMapRef.current = _parentMap

    const clearDropTarget = useCallback(() => {
        dropRef.current = { key: null, pos: null }
        setDndState(prev => (
            prev.dropTargetKey === null && prev.dropPosition === null
                ? prev
                : { ...prev, dropTargetKey: null, dropPosition: null }
        ))
    }, [])

    const handleDragStart = useCallback(({ active }: DragStartEvent) => {
        dropRef.current = { key: null, pos: null }
        setDndState({ dropTargetKey: null, dropPosition: null, dragKey: active.id as string })
    }, [])

    const handleDragMove = useCallback(({ over, active }: DragMoveEvent) => {
        if (!over || over.id === active.id) {
            clearDropTarget()
            return
        }

        const targetKey = over.id as string
        const activeKey = active.id as string

        // O(depth) 祖先检查 — 沿 parentMap 向上遍历而非全树扫描
        let ancestor = parentMapRef.current.get(targetKey)
        while (ancestor !== undefined && ancestor !== null) {
            if (ancestor === activeKey) { clearDropTarget(); return }
            ancestor = parentMapRef.current.get(ancestor)
        }

        const sourceNode = nodeMapRef.current.get(activeKey)
        const targetNode = nodeMapRef.current.get(targetKey)
        if (!sourceNode || !targetNode) {
            clearDropTarget()
            return
        }

        const rect  = over.rect
        const y     = pointerYRef.current
        const ratio = Math.max(0, Math.min(1, (y - rect.top) / rect.height))

        let position: DropPosition
        if (ratio < 0.2) position = 'before'
        else if (ratio > 0.8) position = 'after'
        else position = 'into'

        if (canDropRef.current && !canDropRef.current(sourceNode, targetNode, position)) {
            clearDropTarget()
            return
        }

        // 退出 — 相同目标 + 相同区域 → 完全跳过 setState
        if (dropRef.current.key === targetKey && dropRef.current.pos === position) return

        dropRef.current = { key: targetKey, pos: position }
        setDndState(prev => ({ ...prev, dropTargetKey: targetKey, dropPosition: position }))
    }, [clearDropTarget])

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

    // ── 搜索（memo 化）────────────────────────────────────────────────────

    const setSearchValue = useCallback((value: string) => {
        if (controlledSearchValue === undefined) {
            setUncontrolledSearchValue(value)
        }
        onSearchChange?.(value)
    }, [controlledSearchValue, onSearchChange])

    const displayData = useMemo(() => {
        if (!currentSearchValue) return treeData
        const kw = currentSearchValue.toLowerCase()
        const filter = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
            nodes.reduce<CategoryTreeNode[]>((acc, node) => {
                const match = node.title.toLowerCase().includes(kw)
                const filteredChildren = filter(node.children)
                if (match || filteredChildren.length > 0)
                    acc.push({ ...node, children: filteredChildren })
                return acc
            }, [])
        return filter(treeData)
    }, [currentSearchValue, treeData])

    // ── Context 值（分别 memo 化）─────────────────────────────────

    const actionsValue = useMemo<TreeActionsValue>(() => ({
        toggleExpand, expandSubtree, collapseSubtree, select, startEdit, commitEdit, cancelEdit, requestCreate, requestDelete,
    }), [toggleExpand, expandSubtree, collapseSubtree, select, startEdit, commitEdit, cancelEdit, requestCreate, requestDelete])

    const stateValue = useMemo<TreeStateValue>(() => ({
        expandedKeys: currentExpandedKeys,
        selectedKey: selectedKey ?? null,
        editingKey,
    }), [currentExpandedKeys, selectedKey, editingKey])

    // 函数 props 的稳定 ref 包装 — 调用者无需对这些使用 useCallback/useMemo。
    // optionsValue 仅在 prop 在 defined ↔ undefined 之间转换时重建。
    const renderTitleRef    = useRef(renderTitle);    renderTitleRef.current    = renderTitle
    const getNodeActionsRef = useRef(getNodeActions); getNodeActionsRef.current = getNodeActions
    const canDragFnRef      = useRef(canDrag);        canDragFnRef.current      = canDrag
    const canRenameFnRef    = useRef(canRename);      canRenameFnRef.current    = canRename
    const canDeleteFnRef    = useRef(canDelete);      canDeleteFnRef.current    = canDelete
    const canCreateFnRef    = useRef(canCreate);      canCreateFnRef.current    = canCreate

    // eslint-disable-next-line react-hooks/exhaustive-deps -- boolean flags track defined/undefined transitions only
    const optionsValue = useMemo<TreeOptionsValue>(() => ({
        indentSize,
        actionDisplayMode,
        actionCollapseThreshold,
        renderTitle:    renderTitleRef.current    ? (n, s)    => renderTitleRef.current!(n, s)       : undefined,
        getNodeActions: getNodeActionsRef.current ? (n, s, h) => getNodeActionsRef.current!(n, s, h) : undefined,
        canDrag:        canDragFnRef.current      ? (n)       => canDragFnRef.current!(n)            : undefined,
        canDrop:        canDropRef.current        ? (s, t, p) => canDropRef.current!(s, t, p)        : undefined,
        canRename:      canRenameFnRef.current    ? (n)       => canRenameFnRef.current!(n)          : undefined,
        canDelete:      canDeleteFnRef.current    ? (n)       => canDeleteFnRef.current!(n)          : undefined,
        canCreate:      canCreateFnRef.current    ? (n)       => canCreateFnRef.current!(n)          : undefined,
        dragEnabled,
        renameEnabled,
        deleteEnabled,
        createEnabled,
        collapseDuration,
    }), [
        indentSize,
        actionDisplayMode,
        actionCollapseThreshold,
        // 布尔标记：optionsValue 仅在 prop 在 defined ↔ undefined 之间转换时重建
        !!renderTitle, !!getNodeActions, !!canDrag, !!canDrop, !!canRename, !!canDelete, !!canCreate,
        dragEnabled,
        renameEnabled,
        deleteEnabled,
        createEnabled,
        collapseDuration,
    ])

    const treeStyle = useMemo<React.CSSProperties>(() => {
        const style: Record<string, string> = {}

        if (colorTokens?.text) style['--fc-tree-text'] = colorTokens.text
        if (colorTokens?.textMuted) style['--fc-tree-text-muted'] = colorTokens.textMuted
        if (colorTokens?.bgHover) style['--fc-tree-bg-hover'] = colorTokens.bgHover
        if (colorTokens?.bgSelected) style['--fc-tree-bg-selected'] = colorTokens.bgSelected
        if (colorTokens?.border) style['--fc-tree-border'] = colorTokens.border
        if (colorTokens?.borderFocus) style['--fc-tree-border-focus'] = colorTokens.borderFocus
        if (colorTokens?.primary) style['--fc-tree-primary'] = colorTokens.primary
        if (colorTokens?.primarySubtle) style['--fc-tree-primary-subtle'] = colorTokens.primarySubtle
        if (colorTokens?.danger) style['--fc-tree-danger'] = colorTokens.danger
        if (colorTokens?.actionHoverBg) style['--fc-tree-action-hover-bg'] = colorTokens.actionHoverBg
        if (colorTokens?.dropIndicator) style['--fc-tree-drop-indicator'] = colorTokens.dropIndicator

        return style as React.CSSProperties
    }, [colorTokens])

    // dndState 引用仅在值实际变化时变更（单次 setState）

    // ── 渲染 ────────────────────────────────────────────────────────────────

    return (
        <TreeActionsCtx.Provider value={actionsValue}>
            <TreeStateCtx.Provider value={stateValue}>
                <TreeOptionsCtx.Provider value={optionsValue}>
                    <DndStateCtx.Provider value={dndState}>
                        <DndContext
                            sensors={sensors}
                            onDragStart={handleDragStart}
                            onDragMove={handleDragMove}
                            onDragEnd={handleDragEnd}
                            onDragCancel={handleDragCancel}
                        >
                            <div className={`fc-tree ${className}`} style={treeStyle}>

                                {searchable && (
                                    <div className="fc-tree__search">
                                        <input
                                            type="text"
                                            value={currentSearchValue}
                                            onChange={e => setSearchValue(e.target.value)}
                                            placeholder={searchPlaceholder}
                                            className="fc-tree__search-input"
                                        />
                                        {currentSearchValue && (
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
                                                {currentSearchValue ? '无匹配分类' : '暂无分类'}
                                            </div>
                                        )}
                                        {displayData.map(node => (
                                            <TreeNodeItem key={node.key} node={node} level={0} />
                                        ))}
                                    </div>
                                </RollingBox>

                                {onCreate && canCreateRoot && (
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


                        </DndContext>
                    </DndStateCtx.Provider>
                </TreeOptionsCtx.Provider>
            </TreeStateCtx.Provider>
        </TreeActionsCtx.Provider>
    )
}
