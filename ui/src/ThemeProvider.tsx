import type {ReactNode} from 'react'
import {createContext, useContext, useEffect, useMemo, useState} from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeContextValue {
    theme: Theme
    resolvedTheme: ResolvedTheme
    setTheme: (theme: Theme) => void
}

export type ThemeAppliedHandler = (resolvedTheme: ResolvedTheme) => void

export interface ThemeProviderProps {
    children: ReactNode
    defaultTheme?: Theme
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

export function ThemeProvider({children, defaultTheme = 'system', target, onThemeApplied}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(defaultTheme)
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

    const resolvedTheme = theme === 'system' ? systemTheme : theme

    // 同步 data-theme 到 DOM
    useEffect(() => {
        const el = target ?? document.documentElement
        el.setAttribute('data-theme', resolvedTheme)
        onThemeApplied?.(resolvedTheme)
    }, [resolvedTheme, target, onThemeApplied])

    // 监听系统主题变化
    useEffect(() => {
        if (theme !== 'system') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => setSystemTheme(mq.matches ? 'dark' : 'light')
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme])

    const contextValue = useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme }),
        [theme, resolvedTheme],
    )

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    )
}
