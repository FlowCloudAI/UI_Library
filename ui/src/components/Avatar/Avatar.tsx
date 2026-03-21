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
        const [loadState, setLoadState] = useState<AvatarLoadState>('idle');
        const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

        useEffect(() => {
            setCurrentSrc(src);
            setLoadState(src ? 'loading' : 'idle');
        }, [src]);

        useEffect(() => {
            onStateChange?.(loadState);
        }, [loadState, onStateChange]);

        const classes = useMemo(() => {
            const list = [
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
            return list.filter(Boolean).join(' ');
        }, [size, shape, bordered, onClick, loadState, src, children, colorVariant, className]);

        const style = useMemo(() => ({
            width: SIZE_MAP[size],
            height: SIZE_MAP[size],
            fontSize: `${SIZE_MAP[size] * 0.4}px`,
            ...(color && { backgroundColor: color }),
            ...customStyle
        }), [size, color, customStyle]);

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

        const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
            if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onClick(e as any);
            }
        }, [onClick]);

        const showImage = currentSrc && loadState !== 'error';
        const showFallback = !showImage && children;
        const imageSrc = loadState === 'error' && fallbackSrc ? fallbackSrc : currentSrc;

        return (
            <div
                ref={ref}
                className={classes}
                style={style}
                onClick={onClick}
                onKeyDown={handleKeyDown}
                role={onClick ? 'button' : 'img'}
                tabIndex={onClick ? 0 : undefined}
                aria-label={alt}
                aria-busy={loadState === 'loading'}
                data-load-state={loadState}
                {...restProps}
            >
                {showImage && imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={alt}
                        className="ui-avatar-img"
                        loading={lazyLoad ? 'lazy' : 'eager'}
                        onLoad={handleLoad}
                        onError={handleError}
                        decoding="async"
                    />
                ) : showFallback ? (
                    <span className="ui-avatar-text">{children}</span>
                ) : (
                    <span className="ui-avatar-placeholder">
                        <svg viewBox="0 0 24 24" width="40%" height="40%" fill="currentColor" opacity={0.4}>
                            <path d={DEFAULT_ICON} />
                        </svg>
                    </span>
                )}
            </div>
        );
    }
);

Avatar.displayName = 'Avatar';