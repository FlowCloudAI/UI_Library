// OrphanDialog.tsx
// Used by the PARENT component, not by Tree itself.
//
// Usage:
//   const { roots, orphans } = flatToTree(dbRows)
//   <OrphanDialog orphans={orphans} onResolve={handleResolve} onClose={...} />
//
// onResolve receives a map of { [nodeKey]: 'lift' | 'remove' }
// Parent is responsible for executing the DB operations.

import React, { useState } from 'react'
import type { CategoryTreeNode } from './flatToTree'

export type OrphanResolution = 'lift' | 'remove'
export type OrphanResolutionMap = Record<string, OrphanResolution>

interface OrphanDialogProps {
    orphans: CategoryTreeNode[]
    onResolve: (resolutions: OrphanResolutionMap) => void
    /** Dismiss without resolving — orphans will be silently excluded from the tree. */
    onClose: () => void
}

export function OrphanDialog({ orphans, onResolve, onClose }: OrphanDialogProps) {
    const [resolutions, setResolutions] = useState<OrphanResolutionMap>(() =>
        Object.fromEntries(orphans.map(o => [o.key, 'lift' as OrphanResolution]))
    )

    if (orphans.length === 0) return null

    const set = (key: string, val: OrphanResolution) =>
        setResolutions(prev => ({ ...prev, [key]: val }))

    return (
        <div className="fc-dialog-overlay">
            <div className="fc-dialog fc-dialog--wide">
                <div className="fc-dialog__header">
                    <span className="fc-dialog__icon">🔍</span>
                    <h3 className="fc-dialog__title fc-dialog__title--warning">
                        检测到 {orphans.length} 个孤立分类
                    </h3>
                </div>

                <p className="fc-dialog__desc">
                    以下分类的父分类已不存在，可能是数据迁移或异常删除导致。
                    这些分类目前不会显示在树中，请选择处理方式：
                </p>

                <div className="fc-orphan-list">
                    {orphans.map(node => (
                        <div key={node.key} className="fc-orphan-item">
              <span className="fc-orphan-name" title={node.key}>
                {node.title}
              </span>
                            <span className="fc-orphan-id">id: {node.key.slice(0, 8)}…</span>
                            <div className="fc-orphan-radios">
                                <label className={`fc-orphan-radio ${resolutions[node.key] === 'lift' ? 'is-active' : ''}`}>
                                    <input
                                        type="radio"
                                        name={node.key}
                                        checked={resolutions[node.key] === 'lift'}
                                        onChange={() => set(node.key, 'lift')}
                                    />
                                    提升为根分类
                                </label>
                                <label className={`fc-orphan-radio fc-orphan-radio--danger ${resolutions[node.key] === 'remove' ? 'is-active' : ''}`}>
                                    <input
                                        type="radio"
                                        name={node.key}
                                        checked={resolutions[node.key] === 'remove'}
                                        onChange={() => set(node.key, 'remove')}
                                    />
                                    删除
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="fc-dialog__footer">
                    <button className="fc-dialog__btn" onClick={onClose}>
                        暂时忽略
                    </button>
                    <button
                        className="fc-dialog__btn fc-dialog__btn--primary"
                        onClick={() => onResolve(resolutions)}
                    >
                        确认处理
                    </button>
                </div>
            </div>
        </div>
    )
}