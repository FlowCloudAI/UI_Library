import { useContextMenu, ContextMenuItem, useAlert } from 'flowcloudai-ui'

export function ContextMenuDemo() {
    const { showContextMenu } = useContextMenu()
    const { showAlert } = useAlert()

    const items: ContextMenuItem[] = [
        { label: '新建', onClick: () => showAlert("新建", "success", "toast", 1500) },
        { label: '编辑', onClick: () => showAlert("编辑", "info", "toast", 1500) },
        { type: 'divider' },
        { label: '复制', onClick: () => showAlert("已复制", "success", "toast", 1500) },
        { label: '粘贴', onClick: () => showAlert("已粘贴", "success", "toast", 1500), disabled: true },
        { type: 'divider' },
        { label: '删除', onClick: () => showAlert("已删除", "error", "toast", 1500), danger: true },
    ]

    return (
        <>
            <div className="demo-section">
                <h4>右键菜单（Context Provider 模式）</h4>
                <div
                    onContextMenu={e => showContextMenu(e, items)}
                    style={{
                        height: 180,
                        border: '2px dashed var(--fc-color-border)',
                        borderRadius: 'var(--fc-radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--fc-color-text-secondary)',
                        fontSize: 14,
                        userSelect: 'none',
                        cursor: 'context-menu',
                    }}
                >
                    在此区域右键以打开菜单
                </div>
            </div>
        </>
    )
}
