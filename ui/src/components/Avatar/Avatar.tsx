/* eslint-disable import/no-unused-export */

import React, { useState, useMemo, useCallback, forwardRef, useEffect } from 'react';
import './Avatar.css';

// 这些类型如果需要在其他文件中使用，可以保留导出
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';
export type AvatarLoadState = 'idle' | 'loading' | 'loaded' | 'error';

// 组件属性接口 - 如果需要在其他文件中使用，保留导出
export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onError'> {
    children?: React.ReactNode;
    src?: string;
    fallbackSrc?: string;
    color?: string;
    size?: AvatarSize;
    shape?: AvatarShape;
    alt?: string;
    lazyLoad?: boolean;
    onImageLoad?: () => void;
    onImageError?: (error?: Event) => void;
    bordered?: boolean;
    onStateChange?: (state: AvatarLoadState) => void;
}

// 尺寸映射 - 不导出
const SIZE_MAP: Record<AvatarSize, number> = {
    xs: 20,
    sm: 28,
    md: 40,
    lg: 56,
    xl: 72,
} as const;

// 字体大小映射 - 不导出
const FONT_SIZE_MAP: Record<AvatarSize, number> = {
    xs: 10,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
} as const;

// 默认用户图标路径 - 不导出
const DEFAULT_USER_ICON_PATH = "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

// 使用命名导出，而不是默认导出
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
    (
        {
            children,
            src,
            fallbackSrc,
            color,
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

        const avatarClasses = useMemo(() => {
            const classes = [
                'ui-avatar',
                `ui-avatar-${size}`,
                `ui-avatar-${shape}`,
                bordered && 'ui-avatar-bordered',
                onClick && 'ui-avatar-clickable',
                loadState === 'loading' && 'ui-avatar-loading',
                !src && !children && 'ui-avatar-empty',
                className,
            ];
            return classes.filter(Boolean).join(' ');
        }, [size, shape, bordered, onClick, loadState, src, children, className]);

        const avatarStyle = useMemo(() => {
            const baseStyle: React.CSSProperties = {
                width: SIZE_MAP[size],
                height: SIZE_MAP[size],
                fontSize: FONT_SIZE_MAP[size],
            };

            if (color) {
                baseStyle.backgroundColor = color;
            }

            return { ...baseStyle, ...customStyle };
        }, [size, color, customStyle]);

        const handleLoad = useCallback(() => {
            setLoadState('loaded');
            onImageLoad?.();
        }, [onImageLoad]);

        const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
            if (fallbackSrc && currentSrc !== fallbackSrc) {
                setCurrentSrc(fallbackSrc);
                setLoadState('loading');
            } else {
                setLoadState('error');
                onImageError?.(event.nativeEvent);
            }
        }, [fallbackSrc, currentSrc, onImageError]);

        const handleKeyDown = useCallback(
            (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (onClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
                }
            },
            [onClick]
        );

        const showImage = currentSrc && loadState !== 'error';
        const showFallback = !showImage && children;
        const showPlaceholder = !showImage && !showFallback;
        const imageSrc = loadState === 'error' && fallbackSrc ? fallbackSrc : currentSrc;

        return (
            <div
                ref={ref}
                className={avatarClasses}
                style={avatarStyle}
                onClick={onClick}
                onKeyDown={handleKeyDown}
                role={onClick ? 'button' : 'img'}
                tabIndex={onClick ? 0 : undefined}
                aria-label={alt}
                aria-busy={loadState === 'loading'}
                data-testid="avatar"
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
                    <span className="ui-avatar-text" aria-hidden="true">
            {children}
          </span>
                ) : showPlaceholder ? (
                    <span className="ui-avatar-placeholder" aria-hidden="true">
            <svg
                viewBox="0 0 24 24"
                width="40%"
                height="40%"
                fill="currentColor"
                opacity={0.4}
                aria-label="默认用户图标"
            >
              <path d={DEFAULT_USER_ICON_PATH} />
            </svg>
          </span>
                ) : null}
            </div>
        );
    }
);

Avatar.displayName = 'Avatar';