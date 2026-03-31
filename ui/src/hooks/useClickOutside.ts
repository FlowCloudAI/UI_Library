import { useEffect, type RefObject } from 'react';

/**
 * 点击指定元素外部时触发回调。
 * @param ref     被监听的容器 ref
 * @param handler 点击外部时的回调
 * @param enabled 是否启用监听（默认 true）
 */
export function useClickOutside<T extends HTMLElement>(
    ref: RefObject<T | null>,
    handler: () => void,
    enabled = true,
): void {
    useEffect(() => {
        if (!enabled) return;
        const listener = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                handler();
            }
        };
        document.addEventListener('pointerdown', listener);
        return () => document.removeEventListener('pointerdown', listener);
    }, [ref, handler, enabled]);
}
