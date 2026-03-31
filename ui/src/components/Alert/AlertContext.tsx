import "./AlertContext.css"
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { RollingBox } from "../Box/RollingBox";
import { Button } from "../Button/Button";

export type AlertType = "success" | "error" | "warning" | "info";
export type AlertMode = "alert" | "confirm" | "toast";

export type AlertProps = {
    msg: string;
    type: AlertType;
    mode: AlertMode;
    visible: boolean;
    duration?: number;
    choice: (res: string) => void;
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

export interface AlertProviderProps {
    children: ReactNode;
    /* ---- 颜色定制（传入即覆盖，不传走默认变体样式） ---- */
    background?: string;
    borderColor?: string;
}

export function AlertProvider({ children, background, borderColor }: AlertProviderProps) {
    const [alert, setAlert] = useState<AlertProps>({
        msg: "", type: "info", mode: "alert", visible: false, choice: () => {},
    });
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const showAlert = (msg: string, type: AlertType, mode: AlertMode = "alert", duration?: number) =>
        new Promise<string>((resolve, reject) => {
            if (!mountedRef.current) { reject(new Error('AlertProvider unmounted')); return; }
            setAlert({
                msg, type, mode, visible: true, duration,
                choice: (res) => {
                    if (!mountedRef.current) return;
                    setAlert(p => ({ ...p, visible: false }));
                    resolve(res);
                },
            });
        });

    useEffect(() => {
        if (!alert.visible || !alert.duration) return;
        const timer = setTimeout(() => alert.choice("auto"), alert.duration);
        return () => clearTimeout(timer);
    }, [alert.visible, alert.duration]);

    const overrideStyle: React.CSSProperties = {};
    if (background !== undefined)  (overrideStyle as any)["--alert-bg"]     = background;
    if (borderColor !== undefined) (overrideStyle as any)["--alert-border"] = borderColor;

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            {alert.visible && (
                <div className="fc-alert-overlay">
                    <div
                        className={`fc-alert fc-alert--${alert.type} fc-alert--${alert.mode}`}
                        style={overrideStyle}
                    >
                        <div className="fc-alert__header">
                            {ICONS[alert.type]}
                            <span className="fc-alert__title">提示</span>
                        </div>
                        <RollingBox className="fc-alert__msg">{alert.msg}</RollingBox>
                        {alert.mode !== "toast" && (
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
