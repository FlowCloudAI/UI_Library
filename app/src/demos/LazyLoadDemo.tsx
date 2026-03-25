import { useState } from 'react'
import { lazyLoad, Button } from 'flowcloudai-ui'

const LazyContent = lazyLoad(
    () => import('../LazyContent'),
    { fallback: <div style={{ padding: 20, textAlign: 'center', color: 'var(--fc-color-text-secondary)' }}>加载中...</div> }
)

export function LazyLoadDemo() {
    const [show, setShow] = useState(false)

    return (
        <>
            <div className="demo-section">
                <h4>懒加载组件（首次点击时加载）</h4>
                <div className="demo-col">
                    <div>
                        <Button onClick={() => setShow(v => !v)}>
                            {show ? '隐藏' : '加载'}懒加载内容
                        </Button>
                    </div>
                    {show && <LazyContent/>}
                </div>
            </div>
        </>
    )
}
