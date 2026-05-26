import { useState } from 'react'
import { TagItem, type TagSchema, type TagValue } from 'flowcloudai-ui/TagItem'

export function TagItemDemo() {
    const [numVal, setNumVal] = useState<TagValue>(50)
    const [strVal, setStrVal] = useState<TagValue>("示例文本")
    const [boolVal, setBoolVal] = useState<TagValue>(true)
    const [numMode, setNumMode] = useState<'show' | 'edit'>('show')
    const [strMode, setStrMode] = useState<'show' | 'edit'>('show')

    // 受控编辑状态演示
    const [ctrlEditing, setCtrlEditing] = useState(false)
    const [ctrlVal, setCtrlVal] = useState<TagValue>("受控文本")

    return (
        <>
            <div className="demo-section">
                <h4>数字（range 0–100，可切换模式）</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <TagItem
                        schema={{ id: 'hp', name: '生命值', type: 'number', range_min: 0, range_max: 100 } as TagSchema}
                        value={numVal}
                        onChange={setNumVal}
                        mode={numMode}
                    />
                    <button onClick={() => setNumMode(v => v === 'show' ? 'edit' : 'show')} style={{ fontSize: 12 }}>
                        切换为{numMode === 'show' ? '编辑态' : '展示态'}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)' }}>模式：{numMode}</span>
                    <span style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)' }}>当前：{String(numVal)}</span>
                </div>
            </div>
            <div className="demo-section">
                <h4>字符串（可切换模式）</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <TagItem
                        schema={{ id: 'desc', name: '描述', type: 'string' } as TagSchema}
                        value={strVal}
                        onChange={setStrVal}
                        mode={strMode}
                    />
                    <button onClick={() => setStrMode(v => v === 'show' ? 'edit' : 'show')} style={{ fontSize: 12 }}>
                        切换为{strMode === 'show' ? '编辑态' : '展示态'}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)' }}>模式：{strMode}</span>
                    <span style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)' }}>当前：{String(strVal)}</span>
                </div>
            </div>
            <div className="demo-section">
                <h4>布尔</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <TagItem
                        schema={{ id: 'alive', name: '存活', type: 'boolean' } as TagSchema}
                        value={boolVal} onChange={setBoolVal} mode="show"
                    />
                    <TagItem
                        schema={{ id: 'alive', name: '存活', type: 'boolean' } as TagSchema}
                        value={boolVal} onChange={setBoolVal} mode="edit"
                    />
                    <span style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)' }}>当前：{String(boolVal)}</span>
                </div>
            </div>
            <div className="demo-section">
                <h4>受控编辑状态</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <TagItem
                        schema={{ id: 'ctrl', name: '名称', type: 'string' } as TagSchema}
                        value={ctrlVal}
                        onChange={setCtrlVal}
                        editing={ctrlEditing}
                        onEditingChange={setCtrlEditing}
                    />
                    <button onClick={() => setCtrlEditing(v => !v)} style={{ fontSize: 12 }}>
                        {ctrlEditing ? '退出编辑' : '进入编辑'}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)' }}>当前：{String(ctrlVal)}</span>
                </div>
            </div>
            <div className="demo-section">
                <h4>自定义颜色</h4>
                <div className="demo-row">
                    <TagItem
                        schema={{ id: 'rank', name: '等级', type: 'number', range_min: 1, range_max: 10 } as TagSchema}
                        value={7} mode="show"
                        background={"#fef3c7"} color="#92400e" borderColor="#fbbf24"
                    />
                    <TagItem
                        schema={{ id: 'faction', name: '阵营', type: 'string' } as TagSchema}
                        value="中立" mode="show"
                        background={"#ede9fe"} color="#5b21b6" borderColor="#a78bfa"
                    />
                    <TagItem
                        schema={{ id: 'boss', name: '首领', type: 'boolean' } as TagSchema}
                        value={true} mode="show"
                        background={"#fee2e2"} color="#991b1b" borderColor="#fca5a5"
                    />
                </div>
            </div>
        </>
    )
}
