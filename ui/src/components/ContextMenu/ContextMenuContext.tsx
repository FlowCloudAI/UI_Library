import "./ContextMenuContext.css";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
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

/* ---- 内部状态 ---- */
type MenuState = {
    visible: boolean;
    x:       number;
    y:       number;
    items:   ContextMenuItem[];
};

/* ---- Context ---- */
const ContextMenuContext = createContext<{
    showContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
}>({
    showContextMenu: () => {},
});

/* ---- Provider Props ---- */
export interface ContextMenuProviderProps {
    children: ReactNode;
    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    background?:      string;
    borderColor?:     string;
    hoverBackground?: string;
}

export function ContextMenuProvider({
    children,
    background,
    borderColor,
    hoverBackground,
}: ContextMenuProviderProps) {
    const [menu, setMenu] = useState<MenuState>({
        visible: false, x: 0, y: 0, items: [],
    });
    const menuRef = useRef<HTMLUListElement>(null);

    const showContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ visible: true, x: e.clientX, y: e.clientY, items });
    };

    const hide = () => setMenu(s => ({ ...s, visible: false }));

    /* 点击外部 / Escape 关闭 */
    useClickOutside(menuRef, hide, menu.visible);

    useEffect(() => {
        if (!menu.visible) return;
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [menu.visible]);

    /* 防止菜单超出视口 */
    const getPosition = (): React.CSSProperties => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const menuW = 180;
        const menuH = menu.items.length * 32 + 12;
        return {
            left: menu.x + menuW > W ? menu.x - menuW : menu.x,
            top:  menu.y + menuH > H ? menu.y - menuH : menu.y,
        };
    };

    /* CSS 变量注入 */
    const colorVars: Record<string, string | undefined> = {
        "--ctx-bg":            background,
        "--ctx-border":        borderColor,
        "--ctx-item-hover-bg": hoverBackground,
    };
    const overrideStyle: React.CSSProperties = { ...getPosition() };
    for (const [k, v] of Object.entries(colorVars)) {
        if (v !== undefined) (overrideStyle as any)[k] = v;
    }

    return (
        <ContextMenuContext.Provider value={{ showContextMenu }}>
            {children}
            {menu.visible && (
                <ul
                    ref={menuRef}
                    className="fc-context-menu"
                    style={overrideStyle}
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
