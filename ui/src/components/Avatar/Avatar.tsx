import React, { useState, useMemo, useCallback, forwardRef, useEffect } from 'react';
import './Avatar.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';
export type AvatarLoadState = 'idle' | 'loading' | 'loaded' | 'error';
export type AvatarColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onError'> {
    children?: React.ReactNode;
    src?: string;
    fallbackSrc?: string;
    color?: string;
    colorVariant?: AvatarColorVariant;
    size?: AvatarSize;
    shape?: AvatarShape;
    alt?: string;
    lazyLoad?: boolean;
    onImageLoad?: () => void;
    onImageError?: (error?: Event) => void;
    bordered?: boolean;
    onStateChange?: (state: AvatarLoadState) => void;
}

const SIZE_MAP: Record<AvatarSize, number> = {
    xs: 20, sm: 28, md: 40, lg: 56, xl: 72
};

const DEFAULT_ICON = "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

// 提取样式计算逻辑
const useAvatarStyles = (
    size: AvatarSize,
    shape: AvatarShape,
    bordered: boolean,
    onClick: React.MouseEventHandler<HTMLDivElement> | undefined,
    loadState: AvatarLoadState,
    src: string | undefined,
    children: React.ReactNode,
    colorVariant: AvatarColorVariant | undefined,
    className: string,
    color: string | undefined,
    customStyle: React.CSSProperties | undefined
) => {
    const classes = useMemo(() => {
        const classNames = [
            'ui-avatar',
            `ui-avatar-${size}`,
            `ui-avatar-${shape}`,
            bordered && 'ui-avatar-bordered',
            onClick && 'ui-avatar-clickable',
            loadState === 'loading' && 'ui-avatar-loading',
            !src && !children && 'ui-avatar-empty',
            colorVariant && `ui-avatar--${colorVariant}`,
            className
        ];
        return classNames.filter(Boolean).join(' ');
    }, [size, shape, bordered, onClick, loadState, src, children, colorVariant, className]);

    const style = useMemo(() => ({
        width: SIZE_MAP[size],
        height: SIZE_MAP[size],
        fontSize: `${SIZE_MAP[size] * 0.4}px`,
        ...(color && { backgroundColor: color }),
        ...customStyle
    }), [size, color, customStyle]);

    return { classes, style };
};

// 提取图片加载逻辑
const useImageLoader = (
    src: string | undefined,
    fallbackSrc: string | undefined,
    onImageLoad?: () => void,
    onImageError?: (error?: Event) => void,
    onStateChange?: (state: AvatarLoadState) => void
) => {
    const [loadState, setLoadState] = useState<AvatarLoadState>('idle');
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

    useEffect(() => {
        setCurrentSrc(src);
        setLoadState(src ? 'loading' : 'idle');
    }, [src]);

    useEffect(() => {
        onStateChange?.(loadState);
    }, [loadState, onStateChange]);

    const handleLoad = useCallback(() => {
        setLoadState('loaded');
        onImageLoad?.();
    }, [onImageLoad]);

    const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
            setLoadState('loading');
        } else {
            setLoadState('error');
            onImageError?.(e.nativeEvent);
        }
    }, [fallbackSrc, currentSrc, onImageError]);

    return {
        loadState,
        currentSrc,
        handleLoad,
        handleError
    };
};

// 提取键盘交互逻辑
const useKeyboardInteraction = (
    onClick: React.MouseEventHandler<HTMLDivElement> | undefined
) => {
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e as any);
        }
    }, [onClick]);

    return { handleKeyDown };
};

// 提取内容渲染逻辑
const renderContent = (
    currentSrc: string | undefined,
    fallbackSrc: string | undefined,
    loadState: AvatarLoadState,
    alt: string,
    lazyLoad: boolean,
    children: React.ReactNode,
    handleLoad: () => void,
    handleError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
) => {
    const showImage = currentSrc && loadState !== 'error';
    const showFallback = !showImage && children;
    const imageSrc = loadState === 'error' && currentSrc !== fallbackSrc ? fallbackSrc : currentSrc;

    if (showImage && imageSrc) {
        return (
            <img
                src={imageSrc}
                alt={alt}
                className="ui-avatar-img"
                loading={lazyLoad ? 'lazy' : 'eager'}
                onLoad={handleLoad}
                onError={handleError}
                decoding="async"
            />
        );
    }

    if (showFallback) {
        return <span className="ui-avatar-text">{children}</span>;
    }

    return (
        <span className="ui-avatar-placeholder">
            <svg viewBox="0 0 24 24" width="40%" height="40%" fill="currentColor" opacity={0.4}>
                <path d={DEFAULT_ICON} />
            </svg>
        </span>
    );
};

// 提取 ARIA 属性
const useAriaAttributes = (
    onClick: React.MouseEventHandler<HTMLDivElement> | undefined,
    loadState: AvatarLoadState,
    alt: string
) => {
    return {
        role: onClick ? 'button' : 'img',
        tabIndex: onClick ? 0 : undefined,
        'aria-label': alt,
        'aria-busy': loadState === 'loading',
        'data-load-state': loadState
    };
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
    (
        {
            children,
            src,
            fallbackSrc,
            color,
            colorVariant,
            size = 'md',
            shape = 'circle',
            alt = '用户头像',
            lazyLoad = false,
            onImageLoad,
            onImageError,
            onStateChange,
            bordered = false,
            className = '',
            onClick,
            style: customStyle,
            ...restProps
        },
        ref
    ) => {
        // 使用自定义 hooks
        const { loadState, currentSrc, handleLoad, handleError } = useImageLoader(
            src,
            fallbackSrc,
            onImageLoad,
            onImageError,
            onStateChange
        );

        const { classes, style } = useAvatarStyles(
            size,
            shape,
            bordered,
            onClick,
            loadState,
            src,
            children,
            colorVariant,
            className,
            color,
            customStyle
        );

        const { handleKeyDown } = useKeyboardInteraction(onClick);
        const ariaAttributes = useAriaAttributes(onClick, loadState, alt);

        const content = renderContent(
            currentSrc,
            fallbackSrc,
            loadState,
            alt,
            lazyLoad,
            children,
            handleLoad,
            handleError
        );

        return (
            <div
                ref={ref}
                className={classes}
                style={style}
                onClick={onClick}
                onKeyDown={handleKeyDown}
                {...ariaAttributes}
                {...restProps}
            >
                {content}
            </div>
        );
    }
);

Avatar.displayName = 'Avatar';