// src/components/Tabs/Tabs.tsx
import React, { ReactNode, useState } from 'react';
import './Tabs.css';

export interface TabItem {
    key: string;
    label: ReactNode;
    content?: ReactNode;
    disabled?: boolean;
}

export interface TabsProps {
    items: TabItem[];
    activeKey?: string;
    defaultActiveKey?: string;
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closable?: boolean;
    addable?: boolean;
    onChange?: (activeKey: string) => void;
    onClose?: (key: string) => void;
    onAdd?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export const Tabs = ({
                         items,
                         activeKey: controlledActiveKey,
                         defaultActiveKey,
                         radius = 'md',
                         closable = false,
                         addable = false,
                         onChange,
                         onClose,
                         onAdd,
                         className = '',
                         style,
                     }: TabsProps) => {
    const [internalActiveKey, setInternalActiveKey] = useState<string>(
        defaultActiveKey || items[0]?.key || ''
    );

    const activeKey = controlledActiveKey !== undefined ? controlledActiveKey : internalActiveKey;

    const handleTabClick = (key: string, disabled?: boolean) => {
        if (disabled) return;

        if (controlledActiveKey === undefined) {
            setInternalActiveKey(key);
        }
        onChange?.(key);
    };

    const handleClose = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        onClose?.(key);

        if (key === activeKey) {
            const currentIndex = items.findIndex(item => item.key === key);
            const nextItem = items[currentIndex + 1] || items[currentIndex - 1];
            if (nextItem && !nextItem.disabled) {
                handleTabClick(nextItem.key);
            }
        }
    };

    const classes = [
        'fc-tabs',
        `fc-tabs--radius-${radius}`,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} style={style}>
            <div className="fc-tabs__nav">
                <div className="fc-tabs__nav-wrap">
                    {items.map((item) => {
                        const isActive = activeKey === item.key;
                        return (
                            <div
                                key={item.key}
                                className={`fc-tabs__tab ${isActive ? 'fc-tabs__tab--active' : ''} ${item.disabled ? 'fc-tabs__tab--disabled' : ''}`}
                                onClick={() => handleTabClick(item.key, item.disabled)}
                            >
                                <span className="fc-tabs__tab-label">{item.label}</span>
                                {closable && (
                                    <span
                                        className="fc-tabs__tab-close"
                                        onClick={(e) => handleClose(e, item.key)}
                                    >
                                        ×
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {addable && (
                        <div className="fc-tabs__add-btn" onClick={onAdd}>
                            +
                        </div>
                    )}
                </div>
            </div>

            <div className="fc-tabs__content">
                {items.find(item => item.key === activeKey)?.content}
            </div>
        </div>
    );
};

export default Tabs;