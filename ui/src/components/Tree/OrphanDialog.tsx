// OrphanDialog.tsx
// 由父组件使用，而非 Tree 本身。
//
// 用法：
//   const { roots, orphans } = flatToTree(dbRows)
//   <OrphanDialog orphans={orphans} onResolve={handleResolve} onClose={...} />
//
// onResolve 接收 { [nodeKey]: 'lift' | 'remove' } 映射表
// 父组件负责执行数据库操作。

import React, { useState } from 'react'
import type { CategoryTreeNode } from './flatToTree'
import type { FcChangeMeta } from '../../types/common'

export type OrphanResolution = 'lift' | 'remove'
export type OrphanResolutionMap = Record<string, OrphanResolution>
export type OrphanDialogCloseMeta = FcChangeMeta<React.MouseEvent<HTMLButtonElement>>
export type OrphanDialogCloseHandler = (meta?: OrphanDialogCloseMeta) => void
export type OrphanDialogResolveMeta = FcChangeMeta<React.MouseEvent<HTMLButtonElement>>
export type OrphanDialogResolveHandler = (
    resolutions: OrphanResolutionMap,
    meta?: OrphanDialogResolveMeta,
) => void

export interface OrphanDialogProps extends React.HTMLAttributes<HTMLDivElement> {
    orphans: CategoryTreeNode[]
    onResolve: OrphanDialogResolveHandler
    /** 关闭而不处理 — 孤立节点将被静默从树中排除。 */
    onClose: OrphanDialogCloseHandler
}

export function OrphanDialog({
    orphans,
    onResolve,
    onClose,
    className = '',
    style,
    ...overlayProps
}: OrphanDialogProps) {
    const [resolutions, setResolutions] = useState<OrphanResolutionMap>(() =>
        Object.fromEntries(orphans.map(o => [o.key, 'lift' as OrphanResolution]))
    )

    if (orphans.length === 0) return null

    const set = (key: string, val: OrphanResolution) =>
        setResolutions(prev => ({ ...prev, [key]: val }))

    return (
        <div
            {...overlayProps}
            className={['fc-dialog-overlay', className].filter(Boolean).join(' ')}
            style={style}
        >
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
                    <button className="fc-dialog__btn" onClick={event => onClose({ source: 'click', event })}>
                        暂时忽略
                    </button>
                    <button
                        className="fc-dialog__btn fc-dialog__btn--primary"
                        onClick={event => onResolve(resolutions, { source: 'click', event })}
                    >
                        确认处理
                    </button>
                </div>
            </div>
        </div>
    )
}
