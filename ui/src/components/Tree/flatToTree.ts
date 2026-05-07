// flatToTree.ts
// 将扁平的数据库分类行（含 parent_id）转换为嵌套树结构。
// 同时检测并返回孤立节点（parent_id 指向不存在的 id）。

export interface FlatCategory {
    id: string
    parent_id: string | null
    name: string
    sort_order: number
    project_id?: string
    [key: string]: unknown
}

export interface CategoryTreeNode {
    key: string
    title: string
    children: CategoryTreeNode[]
    raw: FlatCategory
}

export interface FlatToTreeResult {
    roots: CategoryTreeNode[]
    orphans: CategoryTreeNode[]
}

export function flatToTree(list: FlatCategory[]): FlatToTreeResult {
    // 构建 id → 节点映射表
    const nodeMap = new Map<string, CategoryTreeNode>()
    const itemMap = new Map<string, FlatCategory>()
    for (const item of list) {
        itemMap.set(item.id, item)
        nodeMap.set(item.id, {
            key: item.id,
            title: item.name,
            children: [],
            raw: item,
        })
    }

    const roots: CategoryTreeNode[] = []
    const orphans: CategoryTreeNode[] = []

    type ParentVisitState = 'visiting' | 'valid' | 'invalid'
    const parentState = new Map<string, ParentVisitState>()
    const invalidIds = new Set<string>()
    const parentStack: string[] = []
    const parentStackIndex = new Map<string, number>()

    const markInvalid = (id: string) => {
        invalidIds.add(id)
        parentState.set(id, 'invalid')
    }

    const resolveParentChain = (id: string): boolean => {
        const cached = parentState.get(id)
        if (cached === 'valid') return false
        if (cached === 'invalid') return true

        const cycleStart = parentStackIndex.get(id)
        if (cycleStart !== undefined) {
            for (let i = cycleStart; i < parentStack.length; i++) {
                markInvalid(parentStack[i])
            }
            return true
        }

        const item = itemMap.get(id)
        if (!item) return true

        parentState.set(id, 'visiting')
        parentStackIndex.set(id, parentStack.length)
        parentStack.push(id)

        let invalidParent = false
        if (item.parent_id !== null) {
            invalidParent = !itemMap.has(item.parent_id) || resolveParentChain(item.parent_id)
        }

        parentStack.pop()
        parentStackIndex.delete(id)

        if (invalidParent) {
            markInvalid(id)
            return true
        }

        parentState.set(id, 'valid')
        return false
    }

    for (const item of list) {
        resolveParentChain(item.id)
    }

    for (const item of list) {
        const node = nodeMap.get(item.id)!
        if (item.parent_id === null) {
            roots.push(node)
        } else if (invalidIds.has(item.id)) {
            // 缺失父节点、自引用、环以及追溯到异常父链的节点均按孤立节点返回。
            orphans.push(node)
        } else if (nodeMap.has(item.parent_id)) {
            nodeMap.get(item.parent_id)!.children.push(node)
        } else {
            // parent_id 存在但指向未知 id → 孤立节点
            orphans.push(node)
        }
    }

    // 按 sort_order 对每层排序（升序）
    const sortLevel = (nodes: CategoryTreeNode[]): void => {
        nodes.sort((a, b) => a.raw.sort_order - b.raw.sort_order)
        for (const node of nodes) sortLevel(node.children)
    }
    sortLevel(roots)

    return { roots, orphans }
}

// ── 树遍历辅助函数（重新导出供父组件使用）─────────

/** 在树中查找节点及其上下文。 */
export function findNodeInfo(
    nodes: CategoryTreeNode[],
    key: string,
    parent: CategoryTreeNode | null = null,
    visited: Set<string> = new Set()
): {
    node: CategoryTreeNode
    parent: CategoryTreeNode | null
    siblings: CategoryTreeNode[]
    index: number
} | null {
    for (let i = 0; i < nodes.length; i++) {
        if (visited.has(nodes[i].key)) continue
        visited.add(nodes[i].key)
        if (nodes[i].key === key)
            return { node: nodes[i], parent, siblings: nodes, index: i }
        const found = findNodeInfo(nodes[i].children, key, nodes[i], visited)
        if (found) return found
    }
    return null
}

/** 如果 `targetKey` 是 `ancestorKey` 的后代则返回 true。 */
export function isDescendantOf(
    roots: CategoryTreeNode[],
    ancestorKey: string,
    targetKey: string
): boolean {
    const info = findNodeInfo(roots, ancestorKey)
    if (!info) return false
    const visited = new Set<string>()
    const check = (children: CategoryTreeNode[]): boolean =>
        children.some(n => {
            if (visited.has(n.key)) return false
            visited.add(n.key)
            return n.key === targetKey || check(n.children)
        })
    return check(info.node.children)
}
