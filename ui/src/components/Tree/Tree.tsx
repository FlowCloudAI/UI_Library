// Tree.tsx
import './Tree.css'
import * as React from "react";

interface TreeNode {
    key: string;
    title: string;
    children?: TreeNode[];
    isLeaf?: boolean;
    disabled?: boolean;
    [key: string]: any;
}

interface TreeProps {
    treeData: TreeNode[];
    loadData?: (node: TreeNode) => Promise<void>;
    onSelect?: (selectedKeys: string[], info: { node: TreeNode; selected: boolean }) => void;
    selectedKeys?: string[];
    defaultSelectedKeys?: string[];
    expandedKeys?: string[];
    defaultExpandedKeys?: string[];
    onExpand?: (expandedKeys: string[], info: { node: TreeNode; expanded: boolean }) => void;
    searchable?: boolean;
    className?: string;
    showLine?: boolean;
    showIcon?: boolean;
    icon?: React.ReactNode;
}

export function Tree({
                         treeData,
                         loadData,
                         onSelect,
                         selectedKeys: controlledSelected,
                         defaultSelectedKeys = [],
                         expandedKeys: controlledExpanded,
                         defaultExpandedKeys = [],
                         onExpand,
                         searchable = false,
                         className = '',
                         showLine = false,
                         showIcon = false,
                         icon
                     }: TreeProps) {
    const [internalSelected, setInternalSelected] = React.useState(defaultSelectedKeys);
    const [internalExpanded, setInternalExpanded] = React.useState(defaultExpandedKeys);
    const [loadingKeys, setLoadingKeys] = React.useState<string[]>([]);
    const [searchValue, setSearchValue] = React.useState('');

    const isSelectedControlled = controlledSelected !== undefined;
    const isExpandedControlled = controlledExpanded !== undefined;
    const currentSelected = isSelectedControlled ? controlledSelected : internalSelected;
    const currentExpanded = isExpandedControlled ? controlledExpanded : internalExpanded;

    const toggleExpand = async (node: TreeNode) => {
        const isExpanded = currentExpanded.includes(node.key);
        const next = isExpanded
            ? currentExpanded.filter(k => k !== node.key)
            : [...currentExpanded, node.key];

        if (!isExpanded && loadData && !node.isLeaf && !node.children) {
            setLoadingKeys(prev => [...prev, node.key]);
            await loadData(node);
            setLoadingKeys(prev => prev.filter(k => k !== node.key));
        }

        if (!isExpandedControlled) setInternalExpanded(next);
        onExpand?.(next, { node, expanded: !isExpanded });
    };

    const handleSelect = (node: TreeNode) => {
        if (node.disabled) return;

        const isSelected = currentSelected.includes(node.key);
        const next = isSelected
            ? currentSelected.filter(k => k !== node.key)
            : [...currentSelected, node.key];

        if (!isSelectedControlled) setInternalSelected(next);
        onSelect?.(next, { node, selected: !isSelected });
    };

    // 搜索过滤和高亮
    const filterTree = (nodes: TreeNode[], keyword: string): TreeNode[] => {
        if (!keyword) return nodes;

        return nodes.reduce<TreeNode[]>((acc, node) => {
            const matchTitle = node.title.toLowerCase().includes(keyword.toLowerCase());
            const filteredChildren = node.children ? filterTree(node.children, keyword) : [];

            if (matchTitle || filteredChildren.length > 0) {
                acc.push({
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children
                });
            }
            return acc;
        }, []);
    };

    const highlightText = (text: string, keyword: string) => {
        if (!keyword) return text;
        const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === keyword.toLowerCase()
                ? <span key={i} className="fc-tree__highlight">{part}</span>
                : part
        );
    };

    const filteredData = searchValue ? filterTree(treeData, searchValue) : treeData;

    const renderNode = (node: TreeNode, level = 0) => {
        const isExpanded = currentExpanded.includes(node.key);
        const isSelected = currentSelected.includes(node.key);
        const isLoading = loadingKeys.includes(node.key);
        const hasChildren = node.children && node.children.length > 0;
        const expandable = hasChildren || (loadData && !node.isLeaf);

        return (
            <div key={node.key} className="fc-tree__node">
                <div
                    className={[
                        'fc-tree__item',
                        `fc-tree__item--level-${level}`,
                        isSelected && 'fc-tree__item--selected',
                        node.disabled && 'fc-tree__item--disabled',
                        showLine && 'fc-tree__item--line'
                    ].filter(Boolean).join(' ')}
                    style={{ paddingLeft: `calc(${level * 20}px + var(--fc-space-md))` }}
                >
                    {/* 展开图标 */}
                    <span
                        className={[
                            'fc-tree__switcher',
                            !expandable && 'fc-tree__switcher--hidden',
                            isExpanded && 'fc-tree__switcher--open',
                            isLoading && 'fc-tree__switcher--loading'
                        ].filter(Boolean).join(' ')}
                        onClick={() => expandable && toggleExpand(node)}
                    >
                        {isLoading ? '⟳' : expandable ? '▶' : ''}
                    </span>

                    {/* 图标 */}
                    {showIcon && (
                        <span className="fc-tree__icon">
                            {icon || (hasChildren || !node.isLeaf ? '📁' : '📄')}
                        </span>
                    )}

                    {/* 标题 */}
                    <span
                        className="fc-tree__title"
                        onClick={() => handleSelect(node)}
                    >
                        {highlightText(node.title, searchValue)}
                    </span>
                </div>

                {/* 子节点 */}
                {hasChildren && (
                    <div
                        className="fc-tree__children"
                        style={{
                            height: isExpanded ? 'auto' : 0,
                            overflow: 'hidden',
                            opacity: isExpanded ? 1 : 0
                        }}
                    >
                        {node.children!.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`fc-tree ${className}`}>
            {searchable && (
                <div className="fc-tree__search">
                    <input
                        type="text"
                        value={searchValue}
                        onChange={e => setSearchValue(e.target.value)}
                        placeholder="搜索..."
                        className="fc-tree__search-input"
                    />
                </div>
            )}

            <div className="fc-tree__list">
                {filteredData.map(node => renderNode(node))}
            </div>
        </div>
    );
}