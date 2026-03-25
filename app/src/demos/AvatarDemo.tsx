import { Avatar } from 'flowcloudai-ui'

export function AvatarDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>尺寸</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <Avatar size="xs"/>
                    <Avatar size="sm"/>
                    <Avatar size="md"/>
                    <Avatar size="lg"/>
                    <Avatar size="xl"/>
                </div>
            </div>
            <div className="demo-section">
                <h4>形状</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <Avatar shape="circle" size="lg"/>
                    <Avatar shape="square" size="lg"/>
                </div>
            </div>
            <div className="demo-section">
                <h4>带图片</h4>
                <div className="demo-row" style={{ alignItems: 'center' }}>
                    <Avatar src="https://i.pravatar.cc/80?u=1" size="sm"/>
                    <Avatar src="https://i.pravatar.cc/80?u=2" size="md"/>
                    <Avatar src="https://i.pravatar.cc/80?u=3" size="lg" shape="square"/>
                </div>
            </div>
        </>
    )
}
