import type {ReactNode} from 'react'
import {createContext, useContext, useEffect, useMemo, useState} from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/**
 * 控件密度。`touch` 把输入框/按钮/下拉项的高度抬到触控目标下限（44 像素），
 * 具体数值见 style/index.css 的 `--fc-control-*`。
 *
 * 刻意做成显式开关而非媒体查询：密度取决于应用自己的 formFactor 判定，
 * 不取决于窗口宽度或指针类型（桌面端窄窗口、触屏笔记本都会误命中）。
 */
export type Density = 'comfortable' | 'touch'

export interface ThemeContextValue {
    theme: Theme
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
    density: Density
}

export type ThemeAppliedHandler = (resolvedTheme: ResolvedTheme) => void

export interface ThemeProviderProps {
    children: ReactNode
    defaultTheme?: Theme
    /** 控件密度，默认 `comfortable`（桌面）。移动端传 `touch`。 */
    density?: Density
    target?: HTMLElement
    onThemeApplied?: ThemeAppliedHandler
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
    return ctx
}

export function useOptionalTheme() {
    return useContext(ThemeContext)
}

function getSystemTheme(): ResolvedTheme {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    density = 'comfortable',
    target,
    onThemeApplied,
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(defaultTheme)
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

    const resolvedTheme = theme === 'system' ? systemTheme : theme

    // 同步 data-theme 到 DOM
    useEffect(() => {
        const el = target ?? document.documentElement
        el.setAttribute('data-theme', resolvedTheme)
        onThemeApplied?.(resolvedTheme)
    }, [resolvedTheme, target, onThemeApplied])

    // 同步 data-fc-density；舒适密度不写属性，保持 DOM 干净且等价于「无覆盖」
    useEffect(() => {
        const el = target ?? document.documentElement
        if (density === 'comfortable') {
            el.removeAttribute('data-fc-density')
            return
        }
        el.setAttribute('data-fc-density', density)
    }, [density, target])

    // 监听系统主题变化
    useEffect(() => {
        if (theme !== 'system') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => setSystemTheme(mq.matches ? 'dark' : 'light')
        // 手动主题期间系统外观可能已经变化；切回 system 时必须立刻重采样，
        // 不能只等待下一次 change，否则会继续使用挂载时的旧值。
        handler()
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme])

    const contextValue = useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme, density }),
        [theme, resolvedTheme, density],
    )

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    )
}
