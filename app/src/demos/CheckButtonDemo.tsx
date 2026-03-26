import { useState } from 'react'
import { CheckButton } from 'flowcloudai-ui'

export function CheckButtonDemo() {
    const [enabled, setEnabled] = useState(false)

    return (
        <>
            <div className="demo-section">
                <h4>基础</h4>
                <div className="demo-col">
                    <CheckButton/>
                    <CheckButton labelLeft="关" labelRight="开"/>
                    <CheckButton checked={enabled} onChange={setEnabled} labelRight="受控状态"/>
                </div>
            </div>
            <div className="demo-section">
                <h4>尺寸</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <CheckButton size="sm" labelRight="小"/>
                    <CheckButton size="md" labelRight="中"/>
                    <CheckButton size="lg" labelRight="大"/>
                </div>
            </div>
            <div className="demo-section">
                <h4>自定义颜色 / 禁用</h4>
                <div className="demo-col">
                    <CheckButton labelColor="#533236" thumbBackground="#f1f1f1" labelRight="自定义文字色"/>
                    <CheckButton trackBackground="#00f" checkedTrackBackground="#0f0" labelRight="轨道颜色"/>
                    <CheckButton disabled labelRight="禁用"/>
                    <CheckButton disabled checked labelRight="禁用 + 选中"/>
                </div>
            </div>
        </>
    )
}
