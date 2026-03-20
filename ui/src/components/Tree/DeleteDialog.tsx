// DeleteDialog.tsx
import React, { useState } from 'react'
import type { CategoryTreeNode } from './flatToTree'

export type DeleteMode = 'lift' | 'cascade'

interface DeleteDialogProps {
    node: CategoryTreeNode | null
    onClose: () => void
    /** Parent handles DB logic. mode='lift' → move children & entries up; mode='cascade' → delete all. */
    onDelete: (key: string, mode: DeleteMode) => Promise<void>
}

type Phase = 'choose' | 'confirm-cascade'

export function DeleteDialog({ node, onClose, onDelete }: DeleteDialogProps) {
    const [phase, setPhase] = useState<Phase>('choose')
    const [loading, setLoading] = useState(false)

    if (!node) return null

    const reset = () => {
        setPhase('choose')
        setLoading(false)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    const handleLift = async () => {
        setLoading(true)
        try {
            await onDelete(node.key, 'lift')
            reset()
            onClose()
        } catch {
            setLoading(false)
        }
    }

    const handleCascade = async () => {
        setLoading(true)
        try {
            await onDelete(node.key, 'cascade')
            reset()
            onClose()
        } catch {
            setLoading(false)
        }
    }

    return (
        <div className="fc-dialog-overlay" onMouseDown={handleClose}>
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
                            <button className="fc-dialog__btn" onClick={handleClose} disabled={loading}>
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