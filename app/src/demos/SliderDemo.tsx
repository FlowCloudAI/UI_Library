import { Slider } from 'flowcloudai-ui'

export function SliderDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>基础</h4>
                <div className="demo-col" style={{ maxWidth: 420 }}>
                    <Slider defaultValue={30} tooltip/>
                    <Slider
                        min={0} max={100} step={10} defaultValue={40}
                        marks={{ 0: '0', 50: '50', 100: '100' }}
                        tooltip
                    />
                    <Slider range min={0} max={100} defaultValue={[20, 80]} tooltip/>
                    <Slider defaultValue={40} disabled/>
                </div>
            </div>
            <div className="demo-section">
                <h4>自定义颜色</h4>
                <div className="demo-col" style={{ maxWidth: 420 }}>
                    <Slider defaultValue={60} tooltip
                        fillBackground="#10b981" thumbBackground="#fff"
                        thumbBorderColor="#10b981" tooltipBackground="#10b981" tooltipColor="#fff"
                    />
                    <Slider defaultValue={70} tooltip
                        fillBackground="#6366f1" thumbBorderColor="#6366f1"
                        tooltipBackground="#6366f1" tooltipColor="#fff"
                    />
                </div>
            </div>
            <div className="demo-section">
                <h4>垂直</h4>
                <div className="demo-row" style={{ height: 200, alignItems: 'center' }}>
                    <Slider orientation="vertical" defaultValue={30} tooltip/>
                    <Slider orientation="vertical" defaultValue={70} tooltip
                        fillBackground="#6366f1" thumbBorderColor="#6366f1"
                        tooltipBackground="#6366f1" tooltipColor="#fff"
                    />
                    <Slider orientation="vertical" min={0} max={100} step={20} defaultValue={60}
                        marks={{ 0: '0', 50: '50', 100: '100' }} tooltip
                    />
                </div>
            </div>
        </>
    )
}
