import "./AlertContext.css"
import { createContext, ReactNode, useContext, useState } from "react";
import { RollingBox } from "../Box/RollingBox";
import { Button } from "../Button/Button";

export type AlertType = "success" | "error" | "warning" | "info";

export type AlertProps = {
    msg: string;
    type: AlertType;
    visible: boolean;
    confirm?: boolean;
    choice: (res: string) => void;
};

const AlertContext = createContext<{
    showAlert: (msg: string, type: AlertType, confirm?: boolean) => Promise<string>;
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

export function AlertProvider({ children }: { children: ReactNode }) {
    const [props, setProps] = useState<AlertProps>({
        msg: "", type: "info", visible: false, choice: () => {},
    });

    const showAlert = (msg: string, type: AlertType, confirm = false) =>
        new Promise<string>((resolve) => {
            setProps({
                msg, type, visible: true, confirm,
                choice: (res) => {
                    setProps(p => ({ ...p, visible: false }));
                    resolve(res);
                },
            });
        });

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            {props.visible && (
                <div className="fc-alert-overlay">
                    <div className={`fc-alert fc-alert--${props.type}`}>
                        <div className="fc-alert__header">
                            {ICONS[props.type]}
                            <span className="fc-alert__title">提示</span>
                        </div>
                        <RollingBox className="fc-alert__msg">{props.msg}</RollingBox>
                        <div className="fc-alert__footer">
                            {props.confirm && (
                                <Button variant="secondary" size="sm"
                                        onClick={() => props.choice("no")}>
                                    取消
                                </Button>
                            )}
                            <Button variant="primary" size="sm"
                                    onClick={() => props.choice("yes")}>
                                确定
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AlertContext.Provider>
    );
}

export const useAlert = () => useContext(AlertContext);