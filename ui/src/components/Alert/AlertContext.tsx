import "./AlertContext.css"
import {createContext, CSSProperties, HTMLAttributes, ReactNode, TouchEvent as ReactTouchEvent, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {RollingBox} from "../Box/RollingBox";
import {Button} from "../Button/Button";
import {buildCssVars} from "../../utils/cssVars";
import {useDeprecatedPropWarning} from "../../hooks/useDeprecatedPropWarning";

export type AlertType = "success" | "error" | "warning" | "info";
export type AlertMode = "alert" | "confirm" | "toast" | "nonInvasive";

export interface AlertProviderTokens {
    background?: string;
    borderColor?: string;
}

export type AlertProps = {
    id: number;
    msg: string;
    type: AlertType;
    mode: AlertMode;
    visible: boolean;
    duration?: number;
    choice: (res: string) => void;
};

const DEFAULT_AUTO_DISMISS_DURATION_MS = 1500;
const NON_INVASIVE_SWIPE_DISMISS_DISTANCE_PX = 32;

type QueuedAlert = Omit<AlertProps, "visible" | "choice"> & {
    resolve: (res: string) => void;
    reject: (reason?: unknown) => void;
};

const AlertContext = createContext<{
    showAlert: (msg: string, type: AlertType, mode?: AlertMode, duration?: number) => Promise<string>;
}>(null!);

const ICONS: Record<AlertType, ReactNode> = {
    success: (
        <svg className="fc-alert__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="17 9 11 17 6 12" />
        </svg>
    ),
    error: (
        <svg className="fc-alert__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    warning: (
        <svg className="fc-alert__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    info: (
        <svg className="fc-alert__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
};

export interface AlertProviderProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    /** 深度样式覆盖，优先级高于旧颜色 props。 */
    tokens?: Partial<AlertProviderTokens>;
    /* ---- 兼容旧颜色 props；新用法推荐 tokens ---- */
    /** @deprecated 推荐改用 tokens.background。 */
    background?: string;
    /** @deprecated 推荐改用 tokens.borderColor。 */
    borderColor?: string;
    /** nonInvasive 模式下弹出条距视口顶部的距离，如 "3rem"、"10px"，默认 "1rem" */
    offset?: string;
}

export function AlertProvider({
    children,
    tokens,
    background,
    borderColor,
    offset = "1rem",
    className = "",
    style,
    ...overlayProps
}: AlertProviderProps) {
    const [alert, setAlert] = useState<AlertProps | null>(null);
    const mountedRef = useRef(true);
    const activeAlertRef = useRef<AlertProps | null>(null);
    const activeRejectRef = useRef<((reason?: unknown) => void) | null>(null);
    const queueRef = useRef<QueuedAlert[]>([]);
    const nextAlertIdRef = useRef(1);
    const swipeStartYRef = useRef<number | null>(null);

    const openAlert = useCallback((request: QueuedAlert) => {
        const active: AlertProps = {
            id: request.id,
            msg: request.msg,
            type: request.type,
            mode: request.mode,
            visible: true,
            duration: request.duration,
            choice: (res) => {
                if (!mountedRef.current || activeAlertRef.current?.id !== request.id) return;
                activeAlertRef.current = null;
                activeRejectRef.current = null;
                request.resolve(res);
                setAlert(current => current?.id === request.id ? null : current);
            },
        };

        activeAlertRef.current = active;
        activeRejectRef.current = request.reject;
        setAlert(active);
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            const error = new Error("AlertProvider unmounted");
            activeRejectRef.current?.(error);
            queueRef.current.forEach(item => item.reject(error));
            queueRef.current = [];
        };
    }, []);

    const showAlert = useCallback((msg: string, type: AlertType, mode: AlertMode = "alert", duration?: number) =>
        new Promise<string>((resolve, reject) => {
            if (!mountedRef.current) { reject(new Error('AlertProvider unmounted')); return; }
            const resolvedDuration = duration ?? (
                mode === "toast" || mode === "nonInvasive"
                    ? DEFAULT_AUTO_DISMISS_DURATION_MS
                    : undefined
            );
            const request: QueuedAlert = {
                id: nextAlertIdRef.current++,
                msg,
                type,
                mode,
                duration: resolvedDuration,
                resolve,
                reject,
            };

            if (activeAlertRef.current) {
                queueRef.current.push(request);
            } else {
                openAlert(request);
            }
        }), [openAlert]);

    useEffect(() => {
        if (alert || queueRef.current.length === 0) return;
        openAlert(queueRef.current.shift()!);
    }, [alert, openAlert]);

    useEffect(() => {
        if (!alert?.visible || !alert.duration) return;
        const alertId = alert.id;
        const timer = setTimeout(() => {
            if (activeAlertRef.current?.id === alertId) alert.choice("auto");
        }, alert.duration);
        return () => clearTimeout(timer);
    }, [alert]);

    useDeprecatedPropWarning('AlertProvider', {background, borderColor});

    const overrideStyle: CSSProperties = buildCssVars({
        "--alert-bg": tokens?.background ?? background,
        "--alert-border": tokens?.borderColor ?? borderColor,
    });

    const isNonInvasive = alert?.mode === "nonInvasive";
    const handleSwipeStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
        if (!isNonInvasive) return;
        swipeStartYRef.current = event.touches[0]?.clientY ?? null;
    }, [isNonInvasive]);
    const handleSwipeEnd = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
        const startY = swipeStartYRef.current;
        const endY = event.changedTouches[0]?.clientY;
        swipeStartYRef.current = null;
        if (!isNonInvasive || startY === null || endY === undefined) return;
        if (startY - endY >= NON_INVASIVE_SWIPE_DISMISS_DISTANCE_PX) {
            alert?.choice("swipe");
        }
    }, [alert, isNonInvasive]);
    const handleSwipeCancel = useCallback(() => {
        swipeStartYRef.current = null;
    }, []);
    const overlayClassName = [
        'fc-alert-overlay',
        isNonInvasive && "fc-alert-overlay--non-invasive",
        className,
    ].filter(Boolean).join(' ');
    const overlayStyle = isNonInvasive
        ? {"--alert-offset": offset, ...style} as CSSProperties
        : style;
    const contextValue = useMemo(() => ({showAlert}), [showAlert]);

    return (
        <AlertContext.Provider value={contextValue}>
            {children}
            {alert?.visible && (
                <div
                    {...overlayProps}
                    className={overlayClassName}
                    style={overlayStyle}
                >
                    <div
                        className={`fc-alert fc-alert--${alert.type} fc-alert--${alert.mode}`}
                        style={overrideStyle}
                        onTouchStart={handleSwipeStart}
                        onTouchEnd={handleSwipeEnd}
                        onTouchCancel={handleSwipeCancel}
                    >
                        <div className="fc-alert__header">
                            {ICONS[alert.type]}
                            <span className="fc-alert__title">提示</span>
                        </div>
                        <RollingBox className="fc-alert__msg">{alert.msg}</RollingBox>
                        {alert.mode !== "toast" && alert.mode !== "nonInvasive" && (
                            <div className="fc-alert__footer">
                                {alert.mode === "confirm" && (
                                    <Button variant="secondary" size="sm"
                                            onClick={() => alert.choice("no")}>
                                        取消
                                    </Button>
                                )}
                                <Button variant="primary" size="sm"
                                        onClick={() => alert.choice("yes")}>
                                    确定
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
}

export const useAlert = () => useContext(AlertContext);
