import { Input } from 'flowcloudai-ui'

export function InputDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>前后缀 / 功能</h4>
                <div className="demo-col" style={{ maxWidth: 400 }}>
                    <Input placeholder="基础输入框"/>
                    <Input prefix="@" suffix=".com" placeholder="带前后缀"/>
                    <Input passwordToggle placeholder="密码输入框"/>
                    <Input allowClear placeholder="可清除内容"/>
                </div>
            </div>
            <div className="demo-section">
                <h4>状态</h4>
                <div className="demo-col" style={{ maxWidth: 400 }}>
                    <Input status="success" helperText="格式正确" defaultValue="有效输入"/>
                    <Input status="error" helperText="格式错误" defaultValue="错误输入"/>
                    <Input disabled placeholder="已禁用"/>
                </div>
            </div>
            <div className="demo-section">
                <h4>数字输入</h4>
                <div className="demo-col" style={{ maxWidth: 400 }}>
                    <Input type="number" min={0} max={20} step={1} defaultValue="8" />
                </div>
            </div>
            <div className="demo-section">
                <h4>尺寸</h4>
                <div className="demo-col" style={{ maxWidth: 400 }}>
                    <Input size="sm" placeholder="小 (sm)"/>
                    <Input size="md" placeholder="中 (md，默认)"/>
                    <Input size="lg" placeholder="大 (lg)"/>
                </div>
            </div>
            <div className="demo-section">
                <h4>圆角</h4>
                <div className="demo-col" style={{ maxWidth: 400 }}>
                    <Input radius="none" placeholder="无圆角 (none)"/>
                    <Input radius="sm"   placeholder="sm"/>
                    <Input radius="md"   placeholder="md（默认）"/>
                    <Input radius="lg"   placeholder="lg"/>
                    <Input radius="full" placeholder="胶囊形 (full)"/>
                </div>
            </div>
        </>
    )
}
