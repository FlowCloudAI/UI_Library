import './Slider.css'
import * as React from 'react'

type SliderValue = number | [number, number]
type SliderOrientation = 'horizontal' | 'vertical'

interface SliderProps {
    value?: SliderValue
    defaultValue?: SliderValue
    onChange?: (value: SliderValue) => void
    min?: number
    max?: number
    step?: number
    range?: boolean
    orientation?: SliderOrientation
    disabled?: boolean
    marks?: Record<number, string>
    tooltip?: boolean
    className?: string
    style?: React.CSSProperties

    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    trackBackground?: string       // 轨道底色
    fillBackground?: string        // 已填充进度色
    thumbBackground?: string       // 滑块背景
    thumbBorderColor?: string      // 滑块边框色
    markDotColor?: string          // 刻度点颜色
    markLabelColor?: string        // 刻度标签文字色
    tooltipBackground?: string     // Tooltip 背景
    tooltipColor?: string          // Tooltip 文字色
}

export function Slider({
                           value: controlledValue,
                           defaultValue,
                           onChange,
                           min = 0,
                           max = 100,
                           step = 1,
                           range = false,
                           orientation = 'horizontal',
                           disabled = false,
                           marks,
                           tooltip = false,
                           className = '',
                           style,
                           trackBackground,
                           fillBackground,
                           thumbBackground,
                           thumbBorderColor,
                           markDotColor,
                           markLabelColor,
                           tooltipBackground,
                           tooltipColor,
                       }: SliderProps) {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = React.useState<number | null>(null)
    // 存储当前拖拽的全局监听清理函数，组件卸载时调用
    const dragCleanupRef = React.useRef<(() => void) | null>(null)

    React.useEffect(() => {
        return () => { dragCleanupRef.current?.() }
    }, [])

    const initialValue = defaultValue ?? (range ? [min, max] : min)
    const [internalValue, setInternalValue] = React.useState<SliderValue>(initialValue)

    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : internalValue

    // 将 props 映射为 CSS 变量，过滤 undefined
    const colorVars: Record<string, string | undefined> = {
        '--slider-track-bg':      trackBackground,
        '--slider-fill-bg':       fillBackground,
        '--slider-thumb-bg':      thumbBackground,
        '--slider-thumb-border':  thumbBorderColor,
        '--slider-mark-dot-bg':   markDotColor,
        '--slider-mark-label-color': markLabelColor,
        '--slider-tooltip-bg':    tooltipBackground,
        '--slider-tooltip-color': tooltipColor,
    }

    const overrideStyle: React.CSSProperties = {}
    for (const [key, value] of Object.entries(colorVars)) {
        if (value !== undefined) {
            (overrideStyle as Record<string, string>)[key] = value
        }
    }

    const mergedStyle: React.CSSProperties = { ...overrideStyle, ...style }

    const getPercent = (val: number) =>
        Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))

    const getValueFromPercent = (percent: number) => {
        const raw = min + (percent / 100) * (max - min)
        const stepped = Math.round(raw / step) * step
        return Math.max(min, Math.min(max, stepped))
    }

    const handleMove = React.useCallback((clientX: number, clientY: number, activeIndex: number) => {
        if (!trackRef.current || disabled) return

        const rect = trackRef.current.getBoundingClientRect()
        const percent = orientation === 'horizontal'
            ? ((clientX - rect.left) / rect.width) * 100
            : ((rect.bottom - clientY) / rect.height) * 100

        const newValue = getValueFromPercent(Math.max(0, Math.min(100, percent)))

        let nextValue: SliderValue
        if (range) {
            const [start, end] = currentValue as [number, number]
            nextValue = activeIndex === 0
                ? [Math.min(newValue, end), end]
                : [start, Math.max(newValue, start)]
        } else {
            nextValue = newValue
        }

        if (!isControlled) setInternalValue(nextValue)
        onChange?.(nextValue)
    }, [disabled, orientation, range, currentValue, isControlled, onChange, min, max, step])

    const startDrag = (index: number, clientX: number, clientY: number) => {
        if (disabled) return
        setDragging(index)

        const handleMouseMove = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY, index)
        const handleTouchMove = (ev: TouchEvent) => {
            ev.preventDefault()
            const t = ev.touches[0]
            handleMove(t.clientX, t.clientY, index)
        }
        const cleanup = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
            dragCleanupRef.current = null
        }
        const handleMouseUp = () => { setDragging(null); cleanup() }
        const handleTouchEnd = () => { setDragging(null); cleanup() }

        dragCleanupRef.current = cleanup
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.addEventListener('touchmove', handleTouchMove, { passive: false })
        document.addEventListener('touchend', handleTouchEnd)

        // 立即处理初始位置
        handleMove(clientX, clientY, index)
    }

    const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
        if (disabled) return
        e.preventDefault()
        startDrag(index, e.clientX, e.clientY)
    }

    const handleTouchStart = (index: number) => (e: React.TouchEvent) => {
        if (disabled) return
        e.preventDefault()
        const t = e.touches[0]
        startDrag(index, t.clientX, t.clientY)
    }

    const handleTrackClick = (e: React.MouseEvent) => {
        if (disabled || dragging !== null) return
        handleMove(e.clientX, e.clientY, 0)
    }

    const [startVal, endVal] = range
        ? (currentValue as [number, number])
        : [min, currentValue as number]

    const startPercent = getPercent(startVal)
    const endPercent = getPercent(endVal)

    const isHorizontal = orientation === 'horizontal'

    const thumbStyle = (percent: number): React.CSSProperties =>
        isHorizontal ? { left: `${percent}%` } : { bottom: `${percent}%` }

    const cls = [
        'fc-slider',
        `fc-slider--${orientation}`,
        range && 'fc-slider--range',
        disabled && 'fc-slider--disabled',
        dragging !== null && 'fc-slider--dragging',
        className,
    ].filter(Boolean).join(' ')

    return (
        <div className={cls} style={mergedStyle}>
            <div
                ref={trackRef}
                className="fc-slider__track"
                onClick={handleTrackClick}
            >
                <div
                    className="fc-slider__fill"
                    style={isHorizontal
                        ? { left: `${startPercent}%`, width: `${endPercent - startPercent}%` }
                        : { bottom: `${startPercent}%`, height: `${endPercent - startPercent}%` }
                    }
                />

                {range && (
                    <div
                        className={`fc-slider__thumb ${dragging === 0 ? 'fc-slider__thumb--active' : ''}`}
                        style={thumbStyle(startPercent)}
                        onMouseDown={handleMouseDown(0)}
                        onTouchStart={handleTouchStart(0)}
                    >
                        {tooltip && <span className="fc-slider__tooltip">{startVal}</span>}
                    </div>
                )}

                <div
                    className={`fc-slider__thumb ${dragging === (range ? 1 : 0) ? 'fc-slider__thumb--active' : ''}`}
                    style={thumbStyle(endPercent)}
                    onMouseDown={handleMouseDown(range ? 1 : 0)}
                    onTouchStart={handleTouchStart(range ? 1 : 0)}
                >
                    {tooltip && <span className="fc-slider__tooltip">{endVal}</span>}
                </div>

                {marks && Object.entries(marks).map(([val, label]) => (
                    <div
                        key={val}
                        className="fc-slider__mark"
                        style={thumbStyle(getPercent(Number(val)))}
                    >
                        <span className="fc-slider__mark-dot" />
                        <span className="fc-slider__mark-label">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}