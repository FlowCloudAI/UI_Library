import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    resolvedTheme: 'light' | 'dark'
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
    return ctx
}

interface Props {
    children: ReactNode
    defaultTheme?: Theme
    target?: HTMLElement
}

function getSystemTheme(): 'light' | 'dark' {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function ThemeProvider({ children, defaultTheme = 'system', target }: Props) {
    const [theme, setTheme] = useState<Theme>(defaultTheme)
    const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme)

    const resolvedTheme = theme === 'system' ? systemTheme : theme

    // 同步 data-theme 到 DOM（system 模式主动设置，不再依赖 @media）
    useEffect(() => {
        const el = target ?? document.documentElement
        el.setAttribute('data-theme', resolvedTheme)
    }, [resolvedTheme, target])

    // 监听系统主题变化
    useEffect(() => {
        if (theme !== 'system') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => setSystemTheme(mq.matches ? 'dark' : 'light')
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [theme])

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}