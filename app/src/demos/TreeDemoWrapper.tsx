import { TreeDemo } from '../TreeDemo'

export function TreeDemoWrapper() {
    return (
        <>
            <div className="demo-section">
                <h4>分类树（拖拽排序 / 重命名 / 增删）</h4>
                <div style={{ height: 600 }}>
                    <TreeDemo/>
                </div>
            </div>
        </>
    )
}
