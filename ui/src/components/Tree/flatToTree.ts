// flatToTree.ts
// Converts flat DB category rows (with parent_id) into a nested tree structure.
// Also detects and returns orphan nodes (parent_id points to non-existent id).

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
    // Build id → node map
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
            // parent_id exists but points to an unknown id → orphan
            orphans.push(node)
        }
    }

    // Sort each level by sort_order (ascending)
    const sortLevel = (nodes: CategoryTreeNode[]): void => {
        nodes.sort((a, b) => a.raw.sort_order - b.raw.sort_order)
        for (const node of nodes) sortLevel(node.children)
    }
    sortLevel(roots)

    return { roots, orphans }
}

// ── Tree traversal helpers (re-exported for use in parent components) ─────────

/** Find a node and its context in the tree. */
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

/** Returns true if `targetKey` is a descendant of `ancestorKey`. */
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