import { RollingBox } from 'flowcloudai-ui'

const boxStyle = {
    height: 180,
    border: '1px solid var(--fc-color-border)',
    borderRadius: 'var(--fc-radius-md)',
    padding: 10,
    flex: 1,
    minWidth: 200,
} as const

const TallContent = ({ label }: { label: string }) => (
    <div style={{ height: 800, color: 'var(--fc-color-text)', fontSize: 13 }}>{label}</div>
)

export function RollingBoxDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>auto（默认）</h4>
                <div className="demo-row">
                    <RollingBox style={boxStyle}>
                        <TallContent label="hover 或滚动时显示滚动条"/>
                    </RollingBox>
                    <RollingBox thumbHoverColor="#6366f1" thumbActiveColor="#4f46e5" style={boxStyle}>
                        <TallContent label="thumbHoverColor + thumbActiveColor 紫色"/>
                    </RollingBox>
                </div>
            </div>
            <div className="demo-section">
                <h4>show / thin / hide</h4>
                <div className="demo-row">
                    <RollingBox showThumb="show" thumbColor="#10b981" style={boxStyle}>
                        <TallContent label="始终显示绿色滚动条"/>
                    </RollingBox>
                    <RollingBox showThumb="show" thumbSize="thin" showTrack
                        thumbColor="#6366f1" trackColor="var(--fc-color-bg-tertiary)" style={boxStyle}>
                        <TallContent label="细滚动条 + 显示轨道"/>
                    </RollingBox>
                    <RollingBox showThumb="hide" style={boxStyle}>
                        <TallContent label="隐藏滚动条（仍可滚动）"/>
                    </RollingBox>
                </div>
            </div>
            <div className="demo-section">
                <h4>水平滚动</h4>
                <RollingBox horizontal showThumb="show" thumbColor="#f59e0b"
                    style={{ border: '1px solid var(--fc-color-border)', borderRadius: 'var(--fc-radius-md)', padding: 10 }}>
                    <div style={{ width: 2000, display: 'flex', gap: 40, color: 'var(--fc-color-text)' }}>
                        {Array.from({ length: 20 }, (_, i) => <div key={i}>列 {i + 1}</div>)}
                    </div>
                </RollingBox>
            </div>
        </>
    )
}
