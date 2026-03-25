import { Card } from 'flowcloudai-ui'

export function CardDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>变体</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                    <Card
                        image="https://picsum.photos/id/1015/400/300"
                        title="秋日山林"
                        description="金秋时节，山林被染成了金黄色，漫步其中感受大自然的馈赠。"
                        variant="shadow"
                        hoverable
                    />
                    <Card
                        title="纯文字卡片"
                        description="即使没有图片，卡片也能正常显示。"
                        extraInfo="📝 发布于 2024-01-01"
                        variant="bordered"
                    />
                    <Card
                        image="https://picsum.photos/id/1025/400/300"
                        title="溪流"
                        description="清澈的溪流从山间缓缓流过。"
                        variant="shadow"
                    />
                </div>
            </div>
        </>
    )
}
