import {useEffect} from 'react'
import {isDevelopmentRuntime} from '../utils/runtime'

/**
 * 开发环境下检测已废弃属性并打印提示（生产构建静默）。
 * 传入 `{ 属性名: 值 }` 映射，值为 undefined 视为未传入；仅当存在已传入的废弃属性时告警。
 * 告警文案沿用各组件原有格式：`[flowcloudai-ui][组件名] a/b 已废弃，推荐改用 tokens。`
 *
 * @param component 组件名，用于日志前缀
 * @param deprecated 待检测的废弃属性映射（键即属性名，按对象字面量顺序拼接）
 * @param advice 提示语尾句，默认引导改用 tokens
 */
export function useDeprecatedPropWarning(
    component: string,
    deprecated: Record<string, unknown>,
    advice = '已废弃，推荐改用 tokens。',
): void {
    const presentNames = Object.keys(deprecated).filter(name => deprecated[name] !== undefined)
    const key = presentNames.join('/')
    useEffect(() => {
        if (key.length === 0 || !isDevelopmentRuntime()) return
        console.warn(`[flowcloudai-ui][${component}] ${key} ${advice}`)
    }, [component, key, advice])
}
