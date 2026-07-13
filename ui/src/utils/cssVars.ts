import type {CSSProperties} from 'react'

/**
 * 将「CSS 变量名 → 值」映射收敛为只含已定义值的 style 对象。
 * - 值为 undefined 的键被过滤，不会污染 inline style（保留组件默认样式）。
 * - 数字值自动转成字符串。
 * 用于把组件的 tokens / 兼容色板 props 统一映射为 `--fc-*` 变量。
 */
export function buildCssVars(vars: Record<string, string | number | undefined>): CSSProperties {
    const result: Record<string, string> = {}
    for (const key in vars) {
        const value = vars[key]
        if (value !== undefined) result[key] = typeof value === 'number' ? String(value) : value
    }
    return result as CSSProperties
}
