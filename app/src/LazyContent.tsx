export default function LazyContent() {
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
    );
}