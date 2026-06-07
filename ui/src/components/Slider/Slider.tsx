import './Slider.css'
import * as React from 'react'
import type {FcChangeHandler, FcChangeMeta} from '../../types/common'

export type SliderValue = number | [number, number]
export type SliderOrientation = 'horizontal' | 'vertical'
export interface SliderTokens {
    trackBackground?: string
    fillBackground?: string
    thumbBackground?: string
    thumbBorderColor?: string
    markDotColor?: string
    markLabelColor?: string
    tooltipBackground?: string
    tooltipColor?: string
}

export interface SliderValueChangeMeta extends FcChangeMeta<
    MouseEvent | TouchEvent | React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
> {
    activeIndex: number
}

export type SliderValueChangeHandler = FcChangeHandler<SliderValue, SliderValueChangeMeta>

function isDevelopmentRuntime(): boolean {
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean } }).env
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
    return metaEnv?.DEV === true || (metaEnv?.PROD !== true && nodeEnv !== undefined && nodeEnv !== 'production')
}

function warnSlider(message: string): void {
    if (isDevelopmentRuntime()) {
        console.warn(`[flowcloudai-ui][Slider] ${message}`)
    }
}

function clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function normalizeSliderConfig(min: number, max: number, step: number) {
    const safeMin = Number.isFinite(min) ? min : 0
    let safeMax = Number.isFinite(max) ? max : 100
    const safeStep = Number.isFinite(step) && step > 0 ? step : 1

    if (safeMax <= safeMin) {
        safeMax = safeMin + safeStep
    }

    return {safeMin, safeMax, safeStep}
}

function normalizeSliderValue(value: SliderValue, range: boolean, min: number, max: number): SliderValue {
    if (range) {
        const tuple = Array.isArray(value)
            ? value
            : [min, Number.isFinite(value) ? value : max]
        const start = clampNumber(Number.isFinite(tuple[0]) ? tuple[0] : min, min, max)
        const end = clampNumber(Number.isFinite(tuple[1]) ? tuple[1] : max, min, max)
        return [Math.min(start, end), Math.max(start, end)]
    }

    const singleValue = Array.isArray(value) ? value[1] : value
    return clampNumber(Number.isFinite(singleValue) ? singleValue : min, min, max)
}

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'value'> {
    value?: SliderValue
    defaultValue?: SliderValue
    onValueChange?: SliderValueChangeHandler
    /** @deprecated 推荐改用 onValueChange。 */
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
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<SliderTokens>

    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */
    /** @deprecated 推荐改用 tokens.trackBackground。 */
    trackBackground?: string
    /** @deprecated 推荐改用 tokens.fillBackground。 */
    fillBackground?: string
    /** @deprecated 推荐改用 tokens.thumbBackground。 */
    thumbBackground?: string
    /** @deprecated 推荐改用 tokens.thumbBorderColor。 */
    thumbBorderColor?: string
    /** @deprecated 推荐改用 tokens.markDotColor。 */
    markDotColor?: string
    /** @deprecated 推荐改用 tokens.markLabelColor。 */
    markLabelColor?: string
    /** @deprecated 推荐改用 tokens.tooltipBackground。 */
    tooltipBackground?: string
    /** @deprecated 推荐改用 tokens.tooltipColor。 */
    tooltipColor?: string
}

export function Slider({
                           value: controlledValue,
                           defaultValue,
                           onValueChange,
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
                           tokens,
                           ...props
                       }: SliderProps) {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = React.useState<number | null>(null)
    // 存储当前拖拽的全局监听清理函数，组件卸载时调用
    const dragCleanupRef = React.useRef<(() => void) | null>(null)

    React.useEffect(() => {
        return () => { dragCleanupRef.current?.() }
    }, [])

    const {safeMin, safeMax, safeStep} = React.useMemo(
        () => normalizeSliderConfig(min, max, step),
        [min, max, step],
    )

    React.useEffect(() => {
        if (!Number.isFinite(min)) warnSlider('min 不是有限数字，已回退为 0。')
        if (!Number.isFinite(max)) warnSlider('max 不是有限数字，已回退为 100。')
        if (Number.isFinite(min) && Number.isFinite(max) && max <= min) {
            warnSlider('max 必须大于 min，已使用安全范围渲染。')
        }
        if (!Number.isFinite(step) || step <= 0) warnSlider('step 必须大于 0，已回退为 1。')
    }, [max, min, step])

    React.useEffect(() => {
        if (range && controlledValue !== undefined && !Array.isArray(controlledValue)) {
            warnSlider('range=true 时 value 应传入 [number, number]，已临时归一化。')
        }
    }, [controlledValue, range])

    React.useEffect(() => {
        if (range && defaultValue !== undefined && !Array.isArray(defaultValue)) {
            warnSlider('range=true 时 defaultValue 应传入 [number, number]，已临时归一化。')
        }
    }, [defaultValue, range])

    const initialValue = React.useMemo(
        () => normalizeSliderValue(defaultValue ?? (range ? [safeMin, safeMax] : safeMin), range, safeMin, safeMax),
        [defaultValue, range, safeMax, safeMin],
    )
    const [internalValue, setInternalValue] = React.useState<SliderValue>(initialValue)

    const isControlled = controlledValue !== undefined
    const currentValue = normalizeSliderValue(
        isControlled ? controlledValue : internalValue,
        range,
        safeMin,
        safeMax,
    )

    const warnedLegacyOnChangeRef = React.useRef(false)
    React.useEffect(() => {
        if (!onChange || warnedLegacyOnChangeRef.current || !isDevelopmentRuntime()) return
        warnedLegacyOnChangeRef.current = true
        console.warn('[flowcloudai-ui][Slider] onChange 已废弃，推荐改用 onValueChange。')
    }, [onChange])

    const deprecatedColorPropNames = React.useMemo(() => [
        trackBackground !== undefined && 'trackBackground',
        fillBackground !== undefined && 'fillBackground',
        thumbBackground !== undefined && 'thumbBackground',
        thumbBorderColor !== undefined && 'thumbBorderColor',
        markDotColor !== undefined && 'markDotColor',
        markLabelColor !== undefined && 'markLabelColor',
        tooltipBackground !== undefined && 'tooltipBackground',
        tooltipColor !== undefined && 'tooltipColor',
    ].filter(Boolean) as string[], [
        fillBackground,
        markDotColor,
        markLabelColor,
        thumbBackground,
        thumbBorderColor,
        tooltipBackground,
        tooltipColor,
        trackBackground,
    ])

    React.useEffect(() => {
        if (deprecatedColorPropNames.length === 0 || !isDevelopmentRuntime()) return
        console.warn(`[flowcloudai-ui][Slider] ${deprecatedColorPropNames.join('/')} 已废弃，推荐改用 tokens。`)
    }, [deprecatedColorPropNames])

    // 将 props 映射为 CSS 变量，过滤 undefined
    const colorVars: Record<string, string | undefined> = {
        '--slider-track-bg':      tokens?.trackBackground ?? trackBackground,
        '--slider-fill-bg':       tokens?.fillBackground ?? fillBackground,
        '--slider-thumb-bg':      tokens?.thumbBackground ?? thumbBackground,
        '--slider-thumb-border':  tokens?.thumbBorderColor ?? thumbBorderColor,
        '--slider-mark-dot-bg':   tokens?.markDotColor ?? markDotColor,
        '--slider-mark-label-color': tokens?.markLabelColor ?? markLabelColor,
        '--slider-tooltip-bg':    tokens?.tooltipBackground ?? tooltipBackground,
        '--slider-tooltip-color': tokens?.tooltipColor ?? tooltipColor,
    }

    const overrideStyle: React.CSSProperties = {}
    for (const [key, value] of Object.entries(colorVars)) {
        if (value !== undefined) {
            (overrideStyle as Record<string, string>)[key] = value
        }
    }

    const mergedStyle: React.CSSProperties = { ...overrideStyle, ...style }

    const getPercent = (val: number) =>
        Math.max(0, Math.min(100, ((val - safeMin) / (safeMax - safeMin)) * 100))

    const getValueFromPercent = (percent: number) => {
        const raw = safeMin + (percent / 100) * (safeMax - safeMin)
        const stepped = safeMin + Math.round((raw - safeMin) / safeStep) * safeStep
        return Math.max(safeMin, Math.min(safeMax, stepped))
    }

    const emitValueChange = React.useCallback((nextValue: SliderValue, meta: SliderValueChangeMeta) => {
        if (onValueChange) {
            onValueChange(nextValue, meta)
        } else {
            onChange?.(nextValue)
        }
    }, [onChange, onValueChange])

    const handleMove = React.useCallback((
        clientX: number,
        clientY: number,
        activeIndex: number,
        meta: Omit<SliderValueChangeMeta, 'activeIndex'>,
    ) => {
        if (!trackRef.current || disabled) return

        const rect = trackRef.current.getBoundingClientRect()
        const trackSize = orientation === 'horizontal' ? rect.width : rect.height
        if (trackSize <= 0) return
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
        emitValueChange(nextValue, {...meta, activeIndex})
    }, [disabled, orientation, range, currentValue, isControlled, emitValueChange, safeMax, safeMin, safeStep])

    const startDrag = (
        index: number,
        clientX: number,
        clientY: number,
        event: SliderValueChangeMeta['event'],
    ) => {
        if (disabled) return
        setDragging(index)

        const handleMouseMove = (ev: MouseEvent) => handleMove(ev.clientX, ev.clientY, index, {source: 'drag', event: ev})
        const handleTouchMove = (ev: TouchEvent) => {
            ev.preventDefault()
            const t = ev.touches[0]
            handleMove(t.clientX, t.clientY, index, {source: 'drag', event: ev})
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
        handleMove(clientX, clientY, index, {source: 'drag', event})
    }

    const handleMouseDown = (index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) return
        e.preventDefault()
        startDrag(index, e.clientX, e.clientY, e)
    }

    const handleTouchStart = (index: number) => (e: React.TouchEvent<HTMLDivElement>) => {
        if (disabled) return
        e.preventDefault()
        const t = e.touches[0]
        startDrag(index, t.clientX, t.clientY, e)
    }

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || dragging !== null) return
        handleMove(e.clientX, e.clientY, 0, {source: 'click', event: e})
    }

    const [startVal, endVal] = range
        ? (currentValue as [number, number])
        : [safeMin, currentValue as number]

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
        <div {...props} className={cls} style={mergedStyle}>
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
