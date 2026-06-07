// DeleteDialog.tsx
import React, { useState } from 'react'
import type { CategoryTreeNode } from './flatToTree'
import type { FcChangeMeta } from '../../types/common'

export type DeleteMode = 'lift' | 'cascade'
export type DeleteDialogCloseMeta = FcChangeMeta<React.MouseEvent<HTMLDivElement | HTMLButtonElement>>
export type DeleteDialogCloseHandler = (meta?: DeleteDialogCloseMeta) => void
export type DeleteDialogDeleteMeta = FcChangeMeta<React.MouseEvent<HTMLButtonElement>>
export type DeleteDialogDeleteHandler = (
    key: string,
    mode: DeleteMode,
    meta?: DeleteDialogDeleteMeta,
) => Promise<void>

export interface DeleteDialogProps extends React.HTMLAttributes<HTMLDivElement> {
    node: CategoryTreeNode | null
    onClose: DeleteDialogCloseHandler
    /** 父组件处理数据库逻辑。mode='lift' → 将子节点及条目上移；mode='cascade' → 全部删除。 */
    onDelete: DeleteDialogDeleteHandler
}

type Phase = 'choose' | 'confirm-cascade'

export function DeleteDialog({
    node,
    onClose,
    onDelete,
    className = '',
    style,
    onMouseDown,
    ...overlayProps
}: DeleteDialogProps) {
    const [phase, setPhase] = useState<Phase>('choose')
    const [loading, setLoading] = useState(false)

    if (!node) return null

    const reset = () => {
        setPhase('choose')
        setLoading(false)
    }

    const handleClose = (meta?: DeleteDialogCloseMeta) => {
        reset()
        onClose(meta)
    }

    const handleOverlayMouseDown: React.MouseEventHandler<HTMLDivElement> = event => {
        onMouseDown?.(event)
        if (event.defaultPrevented) return
        handleClose({ source: 'click', event })
    }

    const handleCancelClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        handleClose({ source: 'click', event })
    }

    const handleLift = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setLoading(true)
        try {
            await onDelete(node.key, 'lift', { source: 'click', event })
            handleClose({ source: 'programmatic' })
        } catch {
            setLoading(false)
        }
    }

    const handleCascade = async (event: React.MouseEvent<HTMLButtonElement>) => {
        setLoading(true)
        try {
            await onDelete(node.key, 'cascade', { source: 'click', event })
            handleClose({ source: 'programmatic' })
        } catch {
            setLoading(false)
        }
    }

    return (
        <div
            {...overlayProps}
            className={['fc-dialog-overlay', className].filter(Boolean).join(' ')}
            style={style}
            onMouseDown={handleOverlayMouseDown}
        >
            <div className="fc-dialog" onMouseDown={e => e.stopPropagation()}>

                {phase === 'choose' && (
                    <>
                        <div className="fc-dialog__header">
                            <span className="fc-dialog__icon">🗂</span>
                            <h3 className="fc-dialog__title">删除「{node.title}」</h3>
                        </div>
                        <p className="fc-dialog__desc">该分类下可能包含子分类和词条，请选择删除方式：</p>

                        <div className="fc-dialog__options">
                            <button
                                className="fc-dialog__option"
                                onClick={handleLift}
                                disabled={loading}
                            >
                                <span className="fc-dialog__option-icon">📤</span>
                                <span className="fc-dialog__option-body">
                  <span className="fc-dialog__option-title">移交给上级分类</span>
                  <span className="fc-dialog__option-desc">
                    所有子分类和词条将移至上级分类；若已是根分类，则变为无分类
                  </span>
                </span>
                            </button>

                            <button
                                className="fc-dialog__option fc-dialog__option--danger"
                                onClick={() => setPhase('confirm-cascade')}
                                disabled={loading}
                            >
                                <span className="fc-dialog__option-icon">🗑</span>
                                <span className="fc-dialog__option-body">
                  <span className="fc-dialog__option-title">彻底删除</span>
                  <span className="fc-dialog__option-desc">
                    删除该分类及所有子分类；词条不会被删除，将变为无分类
                  </span>
                </span>
                            </button>
                        </div>

                        <div className="fc-dialog__footer">
                            <button className="fc-dialog__btn" onClick={handleCancelClick} disabled={loading}>
                                取消
                            </button>
                        </div>
                    </>
                )}

                {phase === 'confirm-cascade' && (
                    <>
                        <div className="fc-dialog__header">
                            <span className="fc-dialog__icon">⚠️</span>
                            <h3 className="fc-dialog__title fc-dialog__title--danger">确认彻底删除？</h3>
                        </div>
                        <p className="fc-dialog__desc">
                            此操作<strong>不可逆</strong>。「{node.title}」及其所有子分类将被永久删除，
                            其下词条将变为无分类。
                        </p>

                        <div className="fc-dialog__footer">
                            <button
                                className="fc-dialog__btn"
                                onClick={() => setPhase('choose')}
                                disabled={loading}
                            >
                                返回
                            </button>
                            <button
                                className="fc-dialog__btn fc-dialog__btn--danger"
                                onClick={handleCascade}
                                disabled={loading}
                            >
                                {loading ? '删除中…' : '确认删除'}
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}
