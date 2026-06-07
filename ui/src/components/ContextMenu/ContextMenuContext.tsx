import "./ContextMenuContext.css";
import {createContext, CSSProperties, HTMLAttributes, ReactNode, useContext, useEffect, useMemo, useRef, useState} from "react";
import { useClickOutside } from '../../hooks/useClickOutside';

/* ---- 菜单项类型 ---- */
export type ContextMenuDivider = { type: "divider" };

export type ContextMenuAction = {
    label:      string;
    icon?:      ReactNode;
    onClick:    () => void;
    danger?:    boolean;
    disabled?:  boolean;
};

export type ContextMenuItem = ContextMenuAction | ContextMenuDivider;
export type ContextMenuTriggerEvent = Pick<MouseEvent, "clientX" | "clientY" | "preventDefault" | "stopPropagation">;
export interface ContextMenuProviderTokens {
    background?: string;
    borderColor?: string;
    hoverBackground?: string;
}

/* ---- 内部状态 ---- */
type MenuState = {
    visible: boolean;
    x:       number;
    y:       number;
    items:   ContextMenuItem[];
};

/* ---- Context ---- */
const ContextMenuContext = createContext<{
    showContextMenu: (e: ContextMenuTriggerEvent, items: ContextMenuItem[]) => void;
}>({
    showContextMenu: () => {},
});

/* ---- Provider Props ---- */
function isDevelopmentRuntime(): boolean {
    const metaEnv = (import.meta as unknown as { env?: { DEV?: boolean; PROD?: boolean } }).env;
    const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
    return metaEnv?.DEV === true || (metaEnv?.PROD !== true && nodeEnv !== undefined && nodeEnv !== 'production');
}

export interface ContextMenuProviderProps extends HTMLAttributes<HTMLUListElement> {
    children: ReactNode;
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<ContextMenuProviderTokens>;
    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */
    /** @deprecated 推荐改用 tokens.background。 */
    background?:      string;
    /** @deprecated 推荐改用 tokens.borderColor。 */
    borderColor?:     string;
    /** @deprecated 推荐改用 tokens.hoverBackground。 */
    hoverBackground?: string;
}

export function ContextMenuProvider({
    children,
    tokens,
    background,
    borderColor,
    hoverBackground,
    className = "",
    style,
    ...menuProps
}: ContextMenuProviderProps) {
    const MENU_CURSOR_OVERLAP = 2;
    const isBrowser = typeof window !== "undefined";
    const [menu, setMenu] = useState<MenuState>({
        visible: false, x: 0, y: 0, items: [],
    });
    const menuRef = useRef<HTMLUListElement>(null);

    const showContextMenu = (e: ContextMenuTriggerEvent, items: ContextMenuItem[]) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ visible: true, x: e.clientX, y: e.clientY, items });
    };

    const hide = () => setMenu(s => ({ ...s, visible: false }));

    /* 点击外部 / Escape 关闭 */
    useClickOutside(menuRef, hide, menu.visible);

    useEffect(() => {
        if (!menu.visible || !isBrowser) return;
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isBrowser, menu.visible]);

    const deprecatedColorPropNames = useMemo(() => [
        background !== undefined && 'background',
        borderColor !== undefined && 'borderColor',
        hoverBackground !== undefined && 'hoverBackground',
    ].filter((name): name is string => Boolean(name)), [background, borderColor, hoverBackground]);

    useEffect(() => {
        if (deprecatedColorPropNames.length === 0 || !isDevelopmentRuntime()) return;
        console.warn(`[flowcloudai-ui][ContextMenuProvider] ${deprecatedColorPropNames.join('/')} 已废弃，推荐改用 tokens。`);
    }, [deprecatedColorPropNames]);

    /* 防止菜单超出视口 */
    const getPosition = (): CSSProperties => {
        if (!menu.visible || !isBrowser) {
            return { left: menu.x, top: menu.y };
        }
        const W = window.innerWidth;
        const H = window.innerHeight;
        const menuW = 180;
        const menuH = menu.items.length * 32 + 12;
        const maxLeft = Math.max(0, W - menuW);
        const maxTop = Math.max(0, H - menuH);
        return {
            left: Math.min(Math.max(0, menu.x - MENU_CURSOR_OVERLAP), maxLeft),
            top:  Math.min(Math.max(0, menu.y - MENU_CURSOR_OVERLAP), maxTop),
        };
    };

    /* CSS 变量注入 */
    const colorVars: Record<string, string | undefined> = {
        "--ctx-bg":            tokens?.background ?? background,
        "--ctx-border":        tokens?.borderColor ?? borderColor,
        "--ctx-item-hover-bg": tokens?.hoverBackground ?? hoverBackground,
    };
    const overrideStyle: CSSProperties = { ...(menu.visible ? getPosition() : {}) };
    for (const [k, v] of Object.entries(colorVars)) {
        if (v !== undefined) (overrideStyle as any)[k] = v;
    }
    const menuStyle: CSSProperties = {...overrideStyle, ...style};
    const menuClassName = ['fc-context-menu', className].filter(Boolean).join(' ');

    return (
        <ContextMenuContext.Provider value={{ showContextMenu }}>
            {children}
            {menu.visible && (
                <ul
                    {...menuProps}
                    ref={menuRef}
                    className={menuClassName}
                    style={menuStyle}
                >
                    {menu.items.map((item, i) => {
                        if ("type" in item && item.type === "divider") {
                            return <li key={i} className="fc-context-menu__divider" />;
                        }
                        const action = item as ContextMenuAction;
                        return (
                            <li
                                key={i}
                                className={[
                                    "fc-context-menu__item",
                                    action.danger   ? "fc-context-menu__item--danger"   : "",
                                    action.disabled ? "fc-context-menu__item--disabled" : "",
                                ].filter(Boolean).join(" ")}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={() => {
                                    if (action.disabled) return;
                                    action.onClick();
                                    hide();
                                }}
                            >
                                {action.icon && (
                                    <span className="fc-context-menu__icon">{action.icon}</span>
                                )}
                                <span className="fc-context-menu__label">{action.label}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </ContextMenuContext.Provider>
    );
}

export const useContextMenu = () => useContext(ContextMenuContext);
