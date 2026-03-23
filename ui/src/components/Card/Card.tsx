// src/components/Card/Card.tsx
import React, { ReactNode } from 'react';
import './Card.css';

export interface CardProps {
    /** 图片地址 */
    image?: string;
    /** 图片区域自定义内容（优先级高于 image） */
    imageSlot?: ReactNode;
    /** 图片高度 */
    imageHeight?: number | string;
    /** 标题 */
    title?: ReactNode;
    /** 描述文字 */
    description?: ReactNode;
    /** 底部操作区域 */
    actions?: ReactNode;
    /** 额外信息（价格、时间、标签等） */
    extraInfo?: ReactNode;
    /** 卡片变体 */
    variant?: 'default' | 'bordered' | 'shadow' | 'outline';
    /** 是否可悬停 */
    hoverable?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 自定义类名 */
    className?: string;
    /** 自定义样式 */
    style?: React.CSSProperties;
    /** 点击卡片回调 */
    onClick?: () => void;
}

export const Card = ({
                         image,
                         imageSlot,
                         imageHeight = 200,
                         title,
                         description,
                         actions,
                         extraInfo,
                         variant = 'default',
                         hoverable = false,
                         disabled = false,
                         className = '',
                         style,
                         onClick,
                     }: CardProps) => {
    const handleClick = () => {
        if (!disabled && onClick) {
            onClick();
        }
    };

    const classes = [
        'fc-card',
        `fc-card--${variant}`,
        hoverable && 'fc-card--hoverable',
        disabled && 'fc-card--disabled',
        onClick && 'fc-card--clickable',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const renderImage = () => {
        if (imageSlot) return imageSlot;
        if (image) {
            return (
                <img
                    className="fc-card__image"
                    src={image}
                    alt={typeof title === 'string' ? title : 'card image'}
                />
            );
        }
        return null;
    };

    return (
        <div className={classes} style={style} onClick={handleClick}>
            {/* 图片区域 - 占据卡片中上部分 */}
            {renderImage() && (
                <div
                    className="fc-card__image-wrapper"
                    style={{ height: imageHeight }}
                >
                    {renderImage()}
                </div>
            )}

            {/* 文字信息区域 - 占据卡片下部 */}
            <div className="fc-card__content">
                {title && <div className="fc-card__title">{title}</div>}
                {description && <div className="fc-card__description">{description}</div>}
                {extraInfo && <div className="fc-card__extra-info">{extraInfo}</div>}
                {actions && <div className="fc-card__actions">{actions}</div>}
            </div>
        </div>
    );
};

export default Card;