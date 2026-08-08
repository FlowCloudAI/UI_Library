/** 通用卡片：统一媒体、内容、遮罩与交互状态，业务层只负责提供展示内容。 */
import React, { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import './Card.css';

const clampRatio = (value: number) => Math.min(0.8, Math.max(0.1, value));

export type CardVariant = 'default' | 'bordered' | 'shadow' | 'outline';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick' | 'title'> {
    image?: string;
    imageSlot?: ReactNode;
    imageHeight?: number | string;
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    extraInfo?: ReactNode;
    variant?: CardVariant;
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
    onClick?: React.MouseEventHandler<HTMLDivElement>;
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
    overlayEndOpacity = 0.98,
    tag,
    className = '',
    style,
    onClick,
    ...props
}: CardProps) => {
    const baseContentRatio = clampRatio(contentAreaRatio);
    const expandedContentRatio = clampRatio(Math.max(baseContentRatio, hoverContentAreaRatio));
    const shouldExpandOnHover = expandContentOnHover && hoverable && !disabled;
    const hasMedia = Boolean(imageSlot || image);
    const safeOverlayStartOpacity = Math.min(1, Math.max(0, overlayStartOpacity));
    const safeOverlayEndOpacity = Math.min(1, Math.max(0, overlayEndOpacity));
    const overlayLowOpacity = safeOverlayStartOpacity + (safeOverlayEndOpacity - safeOverlayStartOpacity) * 0.18;
    const overlayMidOpacity = safeOverlayStartOpacity + (safeOverlayEndOpacity - safeOverlayStartOpacity) * 0.56;
    const contentRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const descriptionRef = useRef<HTMLDivElement>(null);
    const extraInfoRef = useRef<HTMLDivElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const [descriptionLineClamp, setDescriptionLineClamp] = useState<number>(3);

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) return;
        onClick?.(event);
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
        '--fc-card-overlay-low-opacity': String(overlayLowOpacity),
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

    useLayoutEffect(() => {
        const contentElement = contentRef.current;
        const cardElement = contentElement?.parentElement;

        if (!contentElement || !cardElement) {
            return;
        }

        const measure = () => {
            const contentStyle = window.getComputedStyle(contentElement);
            const contentPadding =
                parseFloat(contentStyle.paddingTop || '0') + parseFloat(contentStyle.paddingBottom || '0');
            const gap = parseFloat(contentStyle.rowGap || contentStyle.gap || '0');
            const contentBlocks = [
                titleRef.current,
                descriptionRef.current,
                extraInfoRef.current,
                actionsRef.current,
            ].filter((element): element is HTMLDivElement => element !== null);
            const measuredContentHeight = contentBlocks.reduce(
                (height, element) => height + element.offsetHeight,
                contentPadding + gap * Math.max(0, contentBlocks.length - 1),
            );
            const overlayContentHeight = `${Math.ceil(Math.min(contentElement.clientHeight, measuredContentHeight))}px`;

            if (
                hasMedia
                && cardElement.style.getPropertyValue('--fc-card-overlay-content-height') !== overlayContentHeight
            ) {
                cardElement.style.setProperty('--fc-card-overlay-content-height', overlayContentHeight);
            }

            const descriptionElement = descriptionRef.current;
            if (!descriptionElement || !description) return;

            const descriptionStyle = window.getComputedStyle(descriptionElement);
            const titleHeight = titleRef.current?.offsetHeight ?? 0;
            const extraInfoHeight = extraInfoRef.current?.offsetHeight ?? 0;
            const actionsHeight = actionsRef.current?.offsetHeight ?? 0;
            const baseBlocks = [title, extraInfo, actions].filter(Boolean).length;
            const gapCount = baseBlocks > 0 ? baseBlocks : 0;
            const reservedHeight =
                contentPadding + titleHeight + extraInfoHeight + actionsHeight + gap * gapCount;
            const availableDescriptionHeight = Math.max(0, contentElement.clientHeight - reservedHeight);
            const lineHeight = parseFloat(descriptionStyle.lineHeight || '0');

            if (!lineHeight || Number.isNaN(lineHeight)) {
                setDescriptionLineClamp(3);
                return;
            }

            setDescriptionLineClamp(Math.max(0, Math.floor(availableDescriptionHeight / lineHeight)));
        };

        measure();

        const resizeObserver = new ResizeObserver(() => {
            measure();
        });

        resizeObserver.observe(contentElement);
        if (descriptionRef.current) resizeObserver.observe(descriptionRef.current);
        if (titleRef.current) resizeObserver.observe(titleRef.current);
        if (extraInfoRef.current) resizeObserver.observe(extraInfoRef.current);
        if (actionsRef.current) resizeObserver.observe(actionsRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [title, description, extraInfo, actions, shouldExpandOnHover, hasMedia]);

    return (
        <div
            {...props}
            className={classes}
            style={mergedStyle}
            onClick={handleClick}
            aria-disabled={disabled || undefined}
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

            <div className="fc-card__content" ref={contentRef}>
                {title && <div className="fc-card__title" ref={titleRef}>{title}</div>}
                {description && descriptionLineClamp > 0 && (
                    <div
                        className="fc-card__description"
                        ref={descriptionRef}
                        style={{ WebkitLineClamp: descriptionLineClamp }}
                    >
                        {description}
                    </div>
                )}
                {extraInfo && <div className="fc-card__extra-info" ref={extraInfoRef}>{extraInfo}</div>}
                {actions && <div className="fc-card__actions" ref={actionsRef}>{actions}</div>}
            </div>
        </div>
    );
};

export default Card;
