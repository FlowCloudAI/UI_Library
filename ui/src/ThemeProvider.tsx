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

    // 同步 data-theme 到 DOM，并同时设置 class 作为后备
    useEffect(() => {
        const el = target ?? document.documentElement

        // 移除旧的类
        el.classList.remove('theme-light', 'theme-dark')

        // 添加新的类作为后备方案
        el.classList.add(`theme-${resolvedTheme}`)

        // 设置 data-theme 属性（原有逻辑保持不变）
        el.setAttribute('data-theme', resolvedTheme)

        // 额外：强制设置 body 背景色（确保立即生效）
        if (resolvedTheme === 'dark') {
            document.body.style.backgroundColor = '#0F0F0F'
            document.body.style.color = '#E8E8E6'
        } else {
            document.body.style.backgroundColor = ''
            document.body.style.color = ''
        }
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