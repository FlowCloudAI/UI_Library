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
    for (const item of list) {
        nodeMap.set(item.id, {
            key: item.id,
            title: item.name,
            children: [],
            raw: item,
        })
    }

    const roots: CategoryTreeNode[] = []
    const orphans: CategoryTreeNode[] = []

    for (const item of list) {
        const node = nodeMap.get(item.id)!
        if (item.parent_id === null) {
            roots.push(node)
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
    parent: CategoryTreeNode | null = null
): {
    node: CategoryTreeNode
    parent: CategoryTreeNode | null
    siblings: CategoryTreeNode[]
    index: number
} | null {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].key === key)
            return { node: nodes[i], parent, siblings: nodes, index: i }
        const found = findNodeInfo(nodes[i].children, key, nodes[i])
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
    const check = (children: CategoryTreeNode[]): boolean =>
        children.some(n => n.key === targetKey || check(n.children))
    return check(info.node.children)
}