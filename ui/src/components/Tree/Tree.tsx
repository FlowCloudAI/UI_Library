// Tree.tsx
import React, {
    createContext,
    memo,
    useCallback,
    useContext,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
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
import { useContextMenu, type ContextMenuItem } from '../ContextMenu/ContextMenuContext'
import { VirtualList, type VirtualListVisibleRange } from '../VirtualList/VirtualList'
import type {FcChangeHandler, FcChangeMeta} from '../../types/common'

import { CategoryTreeNode } from './flatToTree'
import './Tree.css'

export type DropPosition = 'before' | 'after' | 'into'
export type TreeActionDisplayMode = 'auto' | 'inline' | 'overflow'

export interface TreeVisibleRow {
    key: string
    node: CategoryTreeNode
    level: number
    isExpanded: boolean
}

export interface TreeViewportRowsPayload {
    startIndex: number
    endIndexExclusive: number
    rows: TreeVisibleRow[]
}

export interface TreeTokens {
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

/** @deprecated 推荐改用 TreeTokens。 */
export type TreeColorTokens = TreeTokens

export type TreeSelectedKeyChangeMeta = FcChangeMeta<React.MouseEvent>
export type TreeSelectedKeyChangeHandler = FcChangeHandler<string, TreeSelectedKeyChangeMeta>

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

// ── Context（拆分：稳定 actions / 高频拖拽状态 / 选项）─────

interface TreeActionsValue {
    toggleExpand: (key: string) => void
    expandSubtree: (node: CategoryTreeNode) => void
    collapseSubtree: (node: CategoryTreeNode) => void
    select: (key: string, meta?: TreeSelectedKeyChangeMeta) => void
    startEdit: (key: string) => void
    commitEdit: (key: string, newTitle: string) => Promise<void>
    cancelEdit: () => void
    requestCreate: (parentKey: string | null) => Promise<void>
    requestDelete: (node: CategoryTreeNode) => void
}

interface DndStateValue {
    dropTargetKey: string | null
    dropPosition: DropPosition | null
    dragKey: string | null
}

interface DragVisualStore {
    getState: () => DndStateValue
    getSnapshot: (key: string) => string
    subscribe: (key: string, listener: () => void) => () => void
    setState: (next: DndStateValue) => void
}

interface TreeOptionsValue {
    indentSize: number
    actionDisplayMode: TreeActionDisplayMode
    actionCollapseThreshold: number
    actionViewportWidth: number | null
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
const DndStateCtx    = createContext<DragVisualStore>(null!)
const TreeOptionsCtx = createContext<TreeOptionsValue>(null!)

function createDragVisualStore(): DragVisualStore {
    let state: DndStateValue = {
        dropTargetKey: null,
        dropPosition: null,
        dragKey: null,
    }
    const listeners = new Map<string, Set<() => void>>()

    const notify = (key: string | null) => {
        if (!key) return
        listeners.get(key)?.forEach(listener => listener())
    }

    return {
        getState: () => state,
        getSnapshot: (key: string) => {
            const isDragSource = state.dragKey === key ? '1' : '0'
            const dropPosition = state.dropTargetKey === key ? state.dropPosition ?? '' : ''
            return `${isDragSource}:${dropPosition}`
        },
        subscribe: (key: string, listener: () => void) => {
            const set = listeners.get(key) ?? new Set<() => void>()
            set.add(listener)
            listeners.set(key, set)

            return () => {
                set.delete(listener)
                if (set.size === 0) listeners.delete(key)
            }
        },
        setState: (next: DndStateValue) => {
            if (
                state.dropTargetKey === next.dropTargetKey
                && state.dropPosition === next.dropPosition
                && state.dragKey === next.dragKey
            ) {
                return
            }

            const prev = state
            state = next
            notify(prev.dropTargetKey)
            notify(next.dropTargetKey)
            notify(prev.dragKey)
            notify(next.dragKey)
        },
    }
}

// ── 拖拽插槽（隔离 dnd-kit hooks — 仅此包装器在拖拽时重新渲染）──

interface TreeNodeSlotBag {
    setRef: (el: HTMLDivElement | null) => void
    handleProps: Record<string, unknown>
    isDragging: boolean
    isDragSource: boolean
    dropPosition: DropPosition | null
}

interface TreeNodeSlotProps {
    nodeKey: string
    disabled: boolean
    children: (bag: TreeNodeSlotBag) => React.ReactNode
}

const PlainSlot = memo(function PlainSlot({ children }: TreeNodeSlotProps) {
    const setRef = useCallback(() => {}, [])
    const handleProps = useMemo<Record<string, unknown>>(() => ({}), [])

    return <>{children({
        setRef,
        handleProps,
        isDragging: false,
        isDragSource: false,
        dropPosition: null,
    })}</>
})

const DndSlot = memo(function DndSlot({
                                           nodeKey,
                                           disabled,
                                           children,
                                       }: TreeNodeSlotProps) {
    const dragVisualStore = useContext(DndStateCtx)

    const visualSnapshot = useSyncExternalStore(
        useCallback(listener => dragVisualStore.subscribe(nodeKey, listener), [dragVisualStore, nodeKey]),
        useCallback(() => dragVisualStore.getSnapshot(nodeKey), [dragVisualStore, nodeKey]),
        () => '0:'
    )
    const [dragSourceToken, dropPositionToken] = visualSnapshot.split(':')
    const isDragSource = dragSourceToken === '1'
    const dropPosition = dropPositionToken === ''
        ? null
        : dropPositionToken as DropPosition

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

interface TreeRenderRow extends TreeVisibleRow {
    isSelected: boolean
    isEditing: boolean
}

interface TreeNodeItemProps {
    row: TreeRenderRow
}

interface TreeNodeItemCoreProps {
    node: CategoryTreeNode
    level: number
    isSelected: boolean
    isExpanded: boolean
    isEditing: boolean
}

function areVisibleRowsEqual(prev: TreeVisibleRow[] | null, next: TreeVisibleRow[]): boolean {
    if (prev === next) return true
    if (prev === null || prev.length !== next.length) return false

    for (let i = 0; i < next.length; i += 1) {
        const prevRow = prev[i]
        const nextRow = next[i]
        if (
            prevRow.key !== nextRow.key
            || prevRow.node !== nextRow.node
            || prevRow.level !== nextRow.level
            || prevRow.isExpanded !== nextRow.isExpanded
        ) {
            return false
        }
    }

    return true
}

function areViewportRowsPayloadEqual(
    prev: TreeViewportRowsPayload | null,
    next: TreeViewportRowsPayload
): boolean {
    if (prev === next) return true
    if (prev === null) return false
    if (
        prev.startIndex !== next.startIndex
        || prev.endIndexExclusive !== next.endIndexExclusive
    ) {
        return false
    }

    return areVisibleRowsEqual(prev.rows, next.rows)
}

// 核心：memo 化的重型组件 — 状态来自 props，因此 memo 可以拦截
const TreeNodeItemCore = memo(function TreeNodeItemCore({
    node, level, isSelected, isExpanded, isEditing,
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
    const editCommittedRef = useRef(false)

    useEffect(() => {
        if (isEditing) {
            editCommittedRef.current = false
            setLocalEdit(node.title)
        }
    }, [isEditing, node.title])

    const commitLocalEdit = useCallback(() => {
        if (editCommittedRef.current) return
        editCommittedRef.current = true
        actions.commitEdit(node.key, localEdit).then()
    }, [actions, node.key, localEdit])

    const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation()
        if (e.key === 'Enter') commitLocalEdit()
        if (e.key === 'Escape') {
            editCommittedRef.current = true
            actions.cancelEdit()
        }
    }, [actions, commitLocalEdit])

    const availableActionWidth = options.actionViewportWidth === null
        ? Number.POSITIVE_INFINITY
        : Math.max(0, options.actionViewportWidth - indent)
    const requestedCompactActions = options.actionDisplayMode === 'overflow'
        || (options.actionDisplayMode === 'auto' && availableActionWidth < options.actionCollapseThreshold)

    const renderState = useMemo<TreeNodeRenderState>(() => ({
        level,
        hidden: false,
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
        select: () => actions.select(node.key, {source: 'programmatic'}),
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
                    key: 'toggle-expand',
                    label: isExpanded ? '收起' : '展开',
                    icon: isExpanded ? '▸' : '▾',
                    onClick: actionHelpers.toggleExpand,
                    disabled: !hasChildren,
                    showInline: false,
                },
                {
                    key: 'expand',
                    label: '递归展开',
                    icon: '▾',
                    onClick: actionHelpers.expandSubtree,
                    disabled: !hasChildren,
                    showInline: false,
                },
                {
                    key: 'collapse',
                    label: '递归收起',
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
    }, [actionHelpers, canCreateNode, canDeleteNode, canRenameNode, hasChildren, isExpanded])

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

    const handleItemClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (!isSelected) {
            actions.select(node.key, {source: 'click', event})
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
        actions.select(node.key, {source: 'click', event: e})
        showContextMenu(e as unknown as MouseEvent, contextMenuItems)
    }, [actions, contextMenuItems, node.key, showContextMenu])

    const titleContent = options.renderTitle?.(node, renderState) ?? node.title
    const Slot = options.dragEnabled ? DndSlot : PlainSlot

    return (
        <Slot nodeKey={node.key} disabled={isEditing || !canDragNode}>
            {({ setRef, handleProps, isDragging, isDragSource, dropPosition }) => (
                <div className={`fc-tree__node ${isDragging ? 'is-dragging' : ''}`}>
                    <div
                        ref={el => {
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
                        <span className="fc-tree__indent-lines" aria-hidden="true" />

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
                                onBlur={commitLocalEdit}
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

                </div>
            )}
        </Slot>
    )
})

function TreeNodeItem({ row }: TreeNodeItemProps) {
    return (
        <TreeNodeItemCore
            node={row.node}
            level={row.level}
            isSelected={row.isSelected}
            isExpanded={row.isExpanded}
            isEditing={row.isEditing}
        />
    )
}

// ── 树 ──────────────────────────────────────────────────────────────────────

function isDevelopmentRuntime(): boolean {
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean } }).env
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
    return metaEnv?.DEV === true || (metaEnv?.PROD !== true && nodeEnv !== undefined && nodeEnv !== 'production')
}

export interface TreeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
    treeData: CategoryTreeNode[]
    onRename?: (key: string, newName: string) => Promise<void>
    onCreate?: (parentKey: string | null) => Promise<string>
    onDeleteRequest?: (node: CategoryTreeNode) => void
    onMove?: (key: string, targetKey: string, position: DropPosition) => Promise<void>
    /** @deprecated 保留兼容，推荐改用 onSelectedKeyChange。 */
    onSelect?: (key: string) => void
    selectedKey?: string
    /** 推荐使用的选中项变更回调。 */
    onSelectedKeyChange?: TreeSelectedKeyChangeHandler
    expandedKeys?: string[]
    defaultExpandedKeys?: string[]
    onExpandedKeysChange?: (keys: string[]) => void
    /** 当前树里实际显示出来的行（已应用搜索与展开/折叠） */
    onVisibleRowsChange?: (rows: TreeVisibleRow[]) => void
    /** 当前真实视口内可见的行范围与行数据（不含 overscan） */
    onViewportRowsChange?: (payload: TreeViewportRowsPayload) => void
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
    /** 是否显示缩进引导线 */
    indentationLine?: boolean
    indentSize?: number
    actionDisplayMode?: TreeActionDisplayMode
    actionCollapseThreshold?: number
    tokens?: TreeTokens
    /** @deprecated 保留兼容，推荐改用 tokens。 */
    colorTokens?: TreeColorTokens
    /** 列表视口显式高度覆盖；未传时默认填充父容器剩余空间 */
    scrollHeight?: string | number
    virtualRowHeight?: number
    virtualOverscan?: number
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
                         onSelectedKeyChange,
                         expandedKeys: controlledExpandedKeys,
                         defaultExpandedKeys,
                         onExpandedKeysChange,
                         onVisibleRowsChange,
                         onViewportRowsChange,
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
                         indentationLine = false,
                         indentSize = 20,
                         actionDisplayMode = 'auto',
                         actionCollapseThreshold = 208,
                         tokens,
                         colorTokens,
                         scrollHeight,
                         virtualRowHeight = 34,
                         virtualOverscan = 8,
                         className = '',
                         style,
                         collapseDuration = 0.12,
                         ...props
                     }: TreeProps) {
    const [uncontrolledExpandedKeys, setUncontrolledExpandedKeys] = useState<Set<string>>(
        () => new Set(defaultExpandedKeys ?? [])
    )
    const [editingKey, setEditingKey]     = useState<string | null>(null)
    const [uncontrolledSearchValue, setUncontrolledSearchValue] = useState(defaultSearchValue)
    const treeRef = useRef<HTMLDivElement | null>(null)
    const listViewportRef = useRef<HTMLDivElement | null>(null)
    const [treeWidth, setTreeWidth] = useState<number | null>(null)
    const [listViewportHeight, setListViewportHeight] = useState(0)
    const [viewportRange, setViewportRange] = useState<VirtualListVisibleRange | null>(null)
    const lastVisibleRowsRef = useRef<TreeVisibleRow[] | null>(null)
    const lastVisibleRowsCallbackRef = useRef<typeof onVisibleRowsChange>(undefined)
    const lastViewportPayloadRef = useRef<TreeViewportRowsPayload | null>(null)
    const lastViewportRowsCallbackRef = useRef<typeof onViewportRowsChange>(undefined)
    const warnedLegacyOnSelectRef = useRef(false)
    const warnedLegacyColorTokensRef = useRef(false)

    const dragVisualStoreRef = useRef<DragVisualStore | null>(null)
    if (dragVisualStoreRef.current === null) {
        dragVisualStoreRef.current = createDragVisualStore()
    }
    const dragVisualStore = dragVisualStoreRef.current

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
    const expandableKeysMapRef = useRef<Map<string, string[]>>(new Map())

    const currentSearchValue = controlledSearchValue ?? uncontrolledSearchValue
    const deferredSearchValue = useDeferredValue(currentSearchValue)
    const canCreateRoot = createEnabled && (!canCreate || canCreate(null))
    const resolvedTokens = useMemo<TreeTokens | undefined>(() => {
        if (!tokens && !colorTokens) return undefined
        return {
            ...colorTokens,
            ...tokens,
        }
    }, [colorTokens, tokens])

    useEffect(() => {
        if (!onSelect || warnedLegacyOnSelectRef.current || !isDevelopmentRuntime()) return
        warnedLegacyOnSelectRef.current = true
        console.warn('[flowcloudai-ui][Tree] onSelect 已保留兼容，建议改用 onSelectedKeyChange。')
    }, [onSelect])

    useEffect(() => {
        if (!colorTokens || warnedLegacyColorTokensRef.current || !isDevelopmentRuntime()) return
        warnedLegacyColorTokensRef.current = true
        console.warn('[flowcloudai-ui][Tree] colorTokens 已废弃，推荐改用 tokens。')
    }, [colorTokens])

    useEffect(() => {
        const handler = (e: PointerEvent) => { pointerYRef.current = e.clientY }
        window.addEventListener('pointermove', handler)
        return () => window.removeEventListener('pointermove', handler)
    }, [])

    useEffect(() => {
        if (actionDisplayMode !== 'auto') {
            setTreeWidth(prev => prev === null ? prev : null)
            return
        }

        const el = treeRef.current
        if (!el) return

        const updateWidth = (width: number) => {
            setTreeWidth(prev => Math.round(prev ?? -1) === Math.round(width) ? prev : width)
        }

        updateWidth(el.clientWidth)
        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width
            if (width !== undefined) updateWidth(width)
        })
        observer.observe(el)

        return () => observer.disconnect()
    }, [actionDisplayMode])

    useEffect(() => {
        const el = listViewportRef.current
        if (!el) return

        const updateHeight = (height: number) => {
            setListViewportHeight(prev => Math.round(prev) === Math.round(height) ? prev : height)
        }

        updateHeight(el.clientHeight)
        const observer = new ResizeObserver((entries) => {
            const height = entries[0]?.contentRect.height
            if (height !== undefined) updateHeight(height)
        })
        observer.observe(el)

        return () => observer.disconnect()
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
        const keys = expandableKeysMapRef.current.get(node.key) ?? []
        if (keys.length === 0) return
        setExpandedKeys(prev => {
            const next = new Set(prev)
            keys.forEach(key => next.add(key))
            return next
        })
    }, [setExpandedKeys])

    const collapseSubtree = useCallback((node: CategoryTreeNode) => {
        const keys = expandableKeysMapRef.current.get(node.key) ?? []
        if (keys.length === 0) return
        setExpandedKeys(prev => {
            const next = new Set(prev)
            keys.forEach(key => next.delete(key))
            return next
        })
    }, [setExpandedKeys])

    const select = useCallback((key: string, meta?: TreeSelectedKeyChangeMeta) => {
        if (onSelectedKeyChange) {
            onSelectedKeyChange(key, meta)
        } else {
            onSelect?.(key)
        }
    }, [onSelect, onSelectedKeyChange])
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

    // O(1) 节点、父链、标题和可展开后代查找 — 仅在 treeData 变化时重建
    const {
        nodeMap: _nodeMap,
        parentMap: _parentMap,
        titleMap: _titleMap,
        expandableKeysMap: _expandableKeysMap,
    } = useMemo(() => {
        const nodeMap   = new Map<string, CategoryTreeNode>()
        const parentMap = new Map<string, string | null>()
        const titleMap  = new Map<string, string>()
        const expandableKeysMap = new Map<string, string[]>()

        const visit = (nodes: CategoryTreeNode[], pk: string | null): string[] => {
            const levelExpandableKeys: string[] = []

            for (const n of nodes) {
                nodeMap.set(n.key, n)
                parentMap.set(n.key, pk)
                titleMap.set(n.key, n.title.toLowerCase())

                const childExpandableKeys = visit(n.children, n.key)
                const nodeExpandableKeys = n.children.length > 0
                    ? [n.key, ...childExpandableKeys]
                    : []
                expandableKeysMap.set(n.key, nodeExpandableKeys)
                levelExpandableKeys.push(...nodeExpandableKeys)
            }

            return levelExpandableKeys
        }
        visit(treeData, null)
        return { nodeMap, parentMap, titleMap, expandableKeysMap }
    }, [treeData])
    const nodeMapRef   = useRef(_nodeMap);   nodeMapRef.current   = _nodeMap
    const parentMapRef = useRef(_parentMap); parentMapRef.current = _parentMap
    const titleMapRef  = useRef(_titleMap);  titleMapRef.current  = _titleMap
    expandableKeysMapRef.current = _expandableKeysMap

    const clearDropTarget = useCallback(() => {
        dropRef.current = { key: null, pos: null }
        const prev = dragVisualStore.getState()
        dragVisualStore.setState({ ...prev, dropTargetKey: null, dropPosition: null })
    }, [dragVisualStore])

    const handleDragStart = useCallback(({ active }: DragStartEvent) => {
        dropRef.current = { key: null, pos: null }
        dragVisualStore.setState({ dropTargetKey: null, dropPosition: null, dragKey: active.id as string })
    }, [dragVisualStore])

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
        const prev = dragVisualStore.getState()
        dragVisualStore.setState({ ...prev, dropTargetKey: targetKey, dropPosition: position })
    }, [clearDropTarget, dragVisualStore])

    const handleDragEnd = useCallback(({ active }: DragEndEvent) => {
        const { key: target, pos: position } = dropRef.current
        dropRef.current = { key: null, pos: null }
        dragVisualStore.setState({ dropTargetKey: null, dropPosition: null, dragKey: null })
        if (!target || !position || active.id === target) return
        onMove?.(active.id as string, target, position)
    }, [dragVisualStore, onMove])

    const handleDragCancel = useCallback(() => {
        dropRef.current = { key: null, pos: null }
        dragVisualStore.setState({ dropTargetKey: null, dropPosition: null, dragKey: null })
    }, [dragVisualStore])

    // ── 搜索（memo 化）────────────────────────────────────────────────────

    const setSearchValue = useCallback((value: string) => {
        if (controlledSearchValue === undefined) {
            setUncontrolledSearchValue(value)
        }
        onSearchChange?.(value)
    }, [controlledSearchValue, onSearchChange])

    const displayData = useMemo(() => {
        if (!deferredSearchValue) return treeData
        const kw = deferredSearchValue.toLowerCase()
        const filter = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
            nodes.reduce<CategoryTreeNode[]>((acc, node) => {
                const match = (titleMapRef.current.get(node.key) ?? node.title.toLowerCase()).includes(kw)
                const filteredChildren = filter(node.children)
                if (match || filteredChildren.length > 0)
                    acc.push({ ...node, children: filteredChildren })
                return acc
            }, [])
        return filter(treeData)
    }, [deferredSearchValue, treeData])

    const visibleRows = useMemo<TreeVisibleRow[]>(() => {
        const rows: TreeVisibleRow[] = []
        const visit = (nodes: CategoryTreeNode[], level: number) => {
            for (const node of nodes) {
                const isExpanded = currentExpandedKeys.has(node.key)
                rows.push({
                    key: node.key,
                    node,
                    level,
                    isExpanded,
                })

                if (isExpanded && node.children.length > 0) {
                    visit(node.children, level + 1)
                }
            }
        }

        visit(displayData, 0)
        return rows
    }, [currentExpandedKeys, displayData])

    const renderRows = useMemo<TreeRenderRow[]>(() => {
        return visibleRows.map(row => ({
            ...row,
            isSelected: selectedKey === row.key,
            isEditing: editingKey === row.key,
        }))
    }, [editingKey, selectedKey, visibleRows])

    useEffect(() => {
        const callbackChanged = lastVisibleRowsCallbackRef.current !== onVisibleRowsChange
        lastVisibleRowsCallbackRef.current = onVisibleRowsChange

        if (!onVisibleRowsChange) {
            lastVisibleRowsRef.current = null
            return
        }

        if (!callbackChanged && areVisibleRowsEqual(lastVisibleRowsRef.current, visibleRows)) return

        lastVisibleRowsRef.current = visibleRows
        onVisibleRowsChange(visibleRows)
    }, [onVisibleRowsChange, visibleRows])

    useEffect(() => {
        const callbackChanged = lastViewportRowsCallbackRef.current !== onViewportRowsChange
        lastViewportRowsCallbackRef.current = onViewportRowsChange

        if (!onViewportRowsChange) {
            lastViewportPayloadRef.current = null
            return
        }

        if (visibleRows.length === 0) {
            const emptyPayload: TreeViewportRowsPayload = {
                startIndex: 0,
                endIndexExclusive: 0,
                rows: [],
            }
            if (!callbackChanged && areViewportRowsPayloadEqual(lastViewportPayloadRef.current, emptyPayload)) return
            lastViewportPayloadRef.current = emptyPayload
            onViewportRowsChange(emptyPayload)
            return
        }

        if (listViewportHeight <= 0 || viewportRange === null) return

        const startIndex = Math.min(viewportRange.startIndex, visibleRows.length)
        const endIndexExclusive = Math.min(
            visibleRows.length,
            Math.max(startIndex, viewportRange.endIndexExclusive)
        )
        const payload: TreeViewportRowsPayload = {
            startIndex,
            endIndexExclusive,
            rows: visibleRows.slice(startIndex, endIndexExclusive),
        }

        if (!callbackChanged && areViewportRowsPayloadEqual(lastViewportPayloadRef.current, payload)) return

        lastViewportPayloadRef.current = payload
        onViewportRowsChange(payload)
    }, [listViewportHeight, onViewportRowsChange, viewportRange, visibleRows])

    const handleVisibleRangeChange = useCallback((range: VirtualListVisibleRange) => {
        setViewportRange(prev => {
            if (
                prev !== null
                && prev.startIndex === range.startIndex
                && prev.endIndexExclusive === range.endIndexExclusive
            ) {
                return prev
            }
            return range
        })
    }, [])

    const renderVirtualRow = useCallback((row: TreeRenderRow) => (
        <TreeNodeItem row={row} />
    ), [])

    const getVirtualRowKey = useCallback((row: TreeRenderRow) => row.key, [])

    // ── Context 值（分别 memo 化）─────────────────────────────────

    const actionsValue = useMemo<TreeActionsValue>(() => ({
        toggleExpand, expandSubtree, collapseSubtree, select, startEdit, commitEdit, cancelEdit, requestCreate, requestDelete,
    }), [toggleExpand, expandSubtree, collapseSubtree, select, startEdit, commitEdit, cancelEdit, requestCreate, requestDelete])

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
        actionViewportWidth: treeWidth,
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
        treeWidth,
        // 布尔标记：optionsValue 仅在 prop 在 defined ↔ undefined 之间转换时重建
        !!renderTitle, !!getNodeActions, !!canDrag, !!canDrop, !!canRename, !!canDelete, !!canCreate,
        dragEnabled,
        renameEnabled,
        deleteEnabled,
        createEnabled,
        collapseDuration,
    ])

    const treeStyle = useMemo<React.CSSProperties>(() => {
        const nextStyle: Record<string, string> = {}

        if (resolvedTokens?.text) nextStyle['--fc-tree-text'] = resolvedTokens.text
        if (resolvedTokens?.textMuted) nextStyle['--fc-tree-text-muted'] = resolvedTokens.textMuted
        if (resolvedTokens?.bgHover) nextStyle['--fc-tree-bg-hover'] = resolvedTokens.bgHover
        if (resolvedTokens?.bgSelected) nextStyle['--fc-tree-bg-selected'] = resolvedTokens.bgSelected
        if (resolvedTokens?.border) nextStyle['--fc-tree-border'] = resolvedTokens.border
        if (resolvedTokens?.borderFocus) nextStyle['--fc-tree-border-focus'] = resolvedTokens.borderFocus
        if (resolvedTokens?.primary) nextStyle['--fc-tree-primary'] = resolvedTokens.primary
        if (resolvedTokens?.primarySubtle) nextStyle['--fc-tree-primary-subtle'] = resolvedTokens.primarySubtle
        if (resolvedTokens?.danger) nextStyle['--fc-tree-danger'] = resolvedTokens.danger
        if (resolvedTokens?.actionHoverBg) nextStyle['--fc-tree-action-hover-bg'] = resolvedTokens.actionHoverBg
        if (resolvedTokens?.dropIndicator) nextStyle['--fc-tree-drop-indicator'] = resolvedTokens.dropIndicator
        nextStyle['--fc-tree-indent-size'] = `${indentSize}px`
        nextStyle['--fc-tree-row-height'] = `${virtualRowHeight}px`
        nextStyle['--fc-tree-row-transition'] = `${collapseDuration}s ease-out`

        return nextStyle as React.CSSProperties
    }, [collapseDuration, indentSize, resolvedTokens, virtualRowHeight])
    const mergedTreeStyle = useMemo<React.CSSProperties>(() => ({
        ...treeStyle,
        ...style,
    }), [style, treeStyle])

    const isFillHeight = scrollHeight === undefined
    const treeClassName = [
        'fc-tree',
        isFillHeight && 'fc-tree--fill',
        indentationLine && 'fc-tree--indentation-line',
        className,
    ].filter(Boolean).join(' ')
    const viewportClassName = [
        'fc-tree__viewport',
        !isFillHeight && 'fc-tree__viewport--fixed',
    ].filter(Boolean).join(' ')

    // 拖拽视觉状态由按 key 订阅的 store 通知，避免拖动时刷新所有行。

    // ── 渲染 ────────────────────────────────────────────────────────────────

    const treeContent = (
        <div {...props} ref={treeRef} className={treeClassName} style={mergedTreeStyle}>
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

            <div
                ref={listViewportRef}
                className={viewportClassName}
                style={scrollHeight === undefined ? undefined : { height: scrollHeight }}
            >
                {renderRows.length === 0 ? (
                    <div className="fc-tree__empty">
                        {currentSearchValue ? '无匹配分类' : '暂无分类'}
                    </div>
                ) : (
                    listViewportHeight > 0 && (
                        <VirtualList
                            data={renderRows}
                            height={listViewportHeight}
                            itemHeight={virtualRowHeight}
                            renderItem={renderVirtualRow}
                            getKey={getVirtualRowKey}
                            overscan={virtualOverscan}
                            onVisibleRangeChange={handleVisibleRangeChange}
                            className="fc-tree__virtual-list"
                            style={{ background: 'transparent', borderRadius: 0 }}
                        />
                    )
                )}
            </div>

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
    )

    return (
        <TreeActionsCtx.Provider value={actionsValue}>
            <TreeOptionsCtx.Provider value={optionsValue}>
                {dragEnabled ? (
                    <DndStateCtx.Provider value={dragVisualStore}>
                        <DndContext
                            sensors={sensors}
                            onDragStart={handleDragStart}
                            onDragMove={handleDragMove}
                            onDragEnd={handleDragEnd}
                            onDragCancel={handleDragCancel}
                        >
                            {treeContent}
                        </DndContext>
                    </DndStateCtx.Provider>
                ) : treeContent}
            </TreeOptionsCtx.Provider>
        </TreeActionsCtx.Provider>
    )
}
