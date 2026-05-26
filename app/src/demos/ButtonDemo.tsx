import { Button, ButtonGroup, ButtonToolbar } from 'flowcloudai-ui/Button'

export function ButtonDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>变体</h4>
                <div className="demo-row">
                    <Button>主要</Button>
                    <Button variant="secondary">次要</Button>
                    <Button variant="outline">轮廓</Button>
                    <Button variant="ghost">幽灵</Button>
                    <Button variant="danger">删除</Button>
                    <Button variant="success">确认</Button>
                    <Button variant="warning">警告</Button>
                </div>
            </div>
            <div className="demo-section">
                <h4>尺寸</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <Button size="xs">超小</Button>
                    <Button size="sm">小</Button>
                    <Button>默认</Button>
                    <Button size="lg">大</Button>
                    <Button size="xl">超大</Button>
                </div>
            </div>
            <div className="demo-section">
                <h4>图标 / 状态</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <Button iconLeft="←">返回</Button>
                    <Button iconRight="→">前进</Button>
                    <Button iconOnly iconLeft="★"/>
                    <Button disabled>禁用</Button>
                    <Button block>块级按钮</Button>
                </div>
            </div>
            <div className="demo-section">
                <h4>圆角</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <Button radius="none">无圆角</Button>
                    <Button radius="sm">sm</Button>
                    <Button radius="md">md</Button>
                    <Button radius="lg">lg</Button>
                    <Button radius="xl">xl</Button>
                    <Button radius="full">full</Button>
                </div>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <Button variant="outline" size="sm" radius="none">无</Button>
                    <Button variant="outline" size="sm" radius="full">胶囊</Button>
                    <Button variant="secondary" size="lg" radius="none">无圆角大按钮</Button>
                    <Button variant="secondary" size="lg" radius="full">胶囊大按钮</Button>
                </div>
            </div>
            <div className="demo-section">
                <h4>组合</h4>
                <div className="demo-col">
                    <div className="demo-row">
                        <ButtonGroup>
                            <Button variant="secondary">左</Button>
                            <Button variant="secondary">中</Button>
                            <Button variant="secondary">右</Button>
                        </ButtonGroup>
                        <ButtonGroup>
                            <Button variant="outline">左</Button>
                            <Button variant="secondary">右</Button>
                        </ButtonGroup>
                    </div>
                    <ButtonToolbar align="right">
                        <Button variant="outline">取消</Button>
                        <Button>保存</Button>
                    </ButtonToolbar>
                    <ButtonToolbar align="center">
                        <Button variant="outline">取消</Button>
                        <Button>确认</Button>
                    </ButtonToolbar>
                </div>
            </div>
        </>
    )
}
