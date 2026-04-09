import { Card } from 'flowcloudai-ui';

export function CardDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>卡片示例</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    <Card
                        image="https://picsum.photos/id/1015/400/300"
                        title="秋日山林"
                        description="文字区不再是纯色底，而是覆盖在图片底部的透明渐变遮罩。鼠标悬停时，内容区会向上展开，展示更多项目摘要。物理物理哇啦啦啦啦啦啦啦的俩五段五点发我的把我U盾吧u哦拜佛阿碧批发白哦比哦发吧覅不怕非法UI色股份不i紫穗槐周四发货最少支付后岁发挥hiu粉煤灰号码父爱我给发哦if吧u哦不符哦恶补哦分包"
                        variant="shadow"
                        hoverable
                        expandContentOnHover
                        contentAreaRatio={0.6}
                        hoverContentAreaRatio={0.9}
                        overlayStartOpacity={0}
                        overlayEndOpacity={1}
                    />
                    <Card
                        title="纯文字卡片"
                        description="即使没有图片，也会保留相同的内容布局、hover 聚焦动效和阴影效果。描述过长时会自动截断，并以省略号结尾。"
                        extraInfo="发布于 2024-01-01"
                        variant="bordered"
                        hoverable
                        expandContentOnHover
                        contentAreaRatio={0.22}
                        hoverContentAreaRatio={0.8}
                        overlayStartOpacity={0}
                        overlayEndOpacity={0.96}
                        tag="简介"
                    />
                    <Card
                        image="https://picsum.photos/id/1025/400/300"
                        title="溪流"
                        description="内容区初始占比较小，悬停后可动画展开到更高比例。左上角标签既可以传入字符串，也可以传入自定义 React 节点。"
                        variant="shadow"
                        hoverable
                        expandContentOnHover
                        contentAreaRatio={0.12}
                        hoverContentAreaRatio={0.8}
                        overlayStartOpacity={0}
                        overlayEndOpacity={1}
                        tag={
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    background: 'rgba(255, 255, 255, 0.18)',
                                    color: '#fff',
                                    backdropFilter: 'blur(12px)',
                                }}
                            >
                                精选
                            </span>
                        }
                    />
                </div>
            </div>
        </>
    );
}
