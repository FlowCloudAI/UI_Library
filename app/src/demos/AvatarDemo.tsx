import { Avatar } from 'flowcloudai-ui/Avatar'

// 预设尺寸映射
const sizeMap = {
    xs: 20,
    sm: 28,
    md: 40,
    lg: 56,
    xl: 72
};

export function AvatarDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>尺寸</h4>
                <div className="demo-row" style={{ alignItems: 'center', gap: '16px' }}>
                    <Avatar size={sizeMap.xs} shape="circle" />
                    <Avatar size={sizeMap.sm} shape="circle" />
                    <Avatar size={sizeMap.md} shape="circle" />
                    <Avatar size={sizeMap.lg} shape="circle" />
                    <Avatar size={sizeMap.xl} shape="circle" />
                </div>
            </div>

            <div className="demo-section">
                <h4>形状</h4>
                <div className="demo-row" style={{ alignItems: 'center', gap: '16px' }}>
                    <Avatar size={sizeMap.lg} shape="circle" />
                    <Avatar size={sizeMap.lg} shape="square" />
                </div>
            </div>

            <div className="demo-section">
                <h4>带图片</h4>
                <div className="demo-row" style={{ alignItems: 'center', gap: '16px' }}>
                    <Avatar src="https://i.pravatar.cc/80?u=1" size={sizeMap.sm} shape="circle" />
                    <Avatar src="https://i.pravatar.cc/80?u=2" size={sizeMap.md} shape="circle" />
                    <Avatar src="https://i.pravatar.cc/80?u=3" size={sizeMap.lg} shape="square" />
                </div>
            </div>
        </>
    );
}
