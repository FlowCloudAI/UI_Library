import { useState } from 'react'
import { Button } from 'flowcloudai-ui'

function LazyContent() {
    return (
        <div style={{
            marginTop: 20,
            padding: 20,
            backgroundColor: 'var(--fc-color-bg-elevated, #fff)',
            border: '1px solid var(--fc-color-border, #e0e0e0)',
            borderRadius: 'var(--fc-radius-md, 8px)',
            color: 'var(--fc-color-text)'
        }}>
            <h4>懒加载内容</h4>
            <p>这个组件是通过 lazyLoad 动态加载的</p>
            <p>只有在点击按钮后才会加载，减少初始包体积</p>
        </div>
    )
};

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
