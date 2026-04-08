import React, { ReactNode } from 'react';
import './Card.css';

const clampRatio = (value: number) => Math.min(0.8, Math.max(0.1, value));

export interface CardProps {
    image?: string;
    imageSlot?: ReactNode;
    imageHeight?: number | string;
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    extraInfo?: ReactNode;
    variant?: 'default' | 'bordered' | 'shadow' | 'outline';
    hoverable?: boolean;
    disabled?: boolean;
    contentAreaRatio?: number;
    hoverContentAreaRatio?: number;
    expandContentOnHover?: boolean;
    overlayStartOpacity?: number;
    overlayEndOpacity?: number;
    tag?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
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
    contentAreaRatio = 0.36,
    hoverContentAreaRatio = 0.7,
    expandContentOnHover = false,
    overlayStartOpacity = 0,
    overlayEndOpacity = 0.92,
    tag,
    className = '',
    style,
    onClick,
}: CardProps) => {
    const baseContentRatio = clampRatio(contentAreaRatio);
    const expandedContentRatio = clampRatio(Math.max(baseContentRatio, hoverContentAreaRatio));
    const shouldExpandOnHover = expandContentOnHover && hoverable && !disabled;
    const hasMedia = Boolean(imageSlot || image);
    const safeOverlayStartOpacity = Math.min(1, Math.max(0, overlayStartOpacity));
    const safeOverlayEndOpacity = Math.min(1, Math.max(0, overlayEndOpacity));
    const overlayMidOpacity = Math.min(
        1,
        Math.max(safeOverlayStartOpacity, (safeOverlayStartOpacity + safeOverlayEndOpacity) / 2)
    );

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

    const mergedStyle: React.CSSProperties = {
        '--fc-card-content-ratio': String(baseContentRatio),
        '--fc-card-content-ratio-hover': String(expandedContentRatio),
        '--fc-card-media-height':
            typeof imageHeight === 'number' ? `${imageHeight}px` : imageHeight,
        '--fc-card-overlay-start-opacity': String(safeOverlayStartOpacity),
        '--fc-card-overlay-mid-opacity': String(overlayMidOpacity),
        '--fc-card-overlay-end-opacity': String(safeOverlayEndOpacity),
        ...style,
    } as React.CSSProperties;

    const renderImage = () => {
        if (imageSlot) return imageSlot;
        if (!image) return null;

        return (
            <img
                className="fc-card__image"
                src={image}
                alt={typeof title === 'string' ? title : 'card image'}
            />
        );
    };

    return (
        <div
            className={classes}
            style={mergedStyle}
            onClick={handleClick}
            data-has-media={hasMedia}
            data-expand-on-hover={shouldExpandOnHover}
        >
            {hasMedia && (
                <div
                    className="fc-card__image-wrapper"
                    style={{ height: typeof imageHeight === 'number' ? `${imageHeight}px` : imageHeight }}
                >
                    {renderImage()}
                </div>
            )}

            {tag && <div className="fc-card__tag">{tag}</div>}

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
