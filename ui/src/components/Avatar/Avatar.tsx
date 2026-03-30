import React, { useState, useCallback, forwardRef, useEffect } from 'react';
import './Avatar.css';

export type AvatarShape = 'circle' | 'square';

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onError'> {
    src?: string;
    fallbackSrc?: string;
    size?: number | string;
    shape?: AvatarShape;
    alt?: string;
    lazyLoad?: boolean;
    onImageLoad?: () => void;
    onImageError?: (error?: Event) => void;
    bordered?: boolean;
}

const DEFAULT_ICON = "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z";

// 图片加载逻辑
const useImageLoader = (
    src: string | undefined,
    fallbackSrc: string | undefined,
    onImageLoad?: () => void,
    onImageError?: (error?: Event) => void
) => {
    const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
    const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);

    useEffect(() => {
        setCurrentSrc(src);
        setLoadState(src ? 'loading' : 'idle');
    }, [src]);

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

// 内容渲染
const renderContent = (
    currentSrc: string | undefined,
    fallbackSrc: string | undefined,
    loadState: 'idle' | 'loading' | 'loaded' | 'error',
    alt: string,
    lazyLoad: boolean,
    handleLoad: () => void,
    handleError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
) => {
    const showImage = currentSrc && loadState !== 'error';
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

    // 默认占位图标
    return (
        <span className="ui-avatar-placeholder">
            <svg viewBox="0 0 24 24" width="40%" height="40%" fill="currentColor">
                <path d={DEFAULT_ICON} />
            </svg>
        </span>
    );
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
    (
        {
            src,
            fallbackSrc,
            size = 40,
            shape = 'circle',
            alt = '用户头像',
            lazyLoad = false,
            onImageLoad,
            onImageError,
            bordered = false,
            className = '',
            style: customStyle,
            ...restProps
        },
        ref
    ) => {
        const { loadState, currentSrc, handleLoad, handleError } = useImageLoader(
            src,
            fallbackSrc,
            onImageLoad,
            onImageError
        );

        // 统一处理 size（支持数字或字符串）
        const sizeValue = `${size}px`;

        const classes = [
            'ui-avatar',
            `ui-avatar-${shape}`,
            bordered && 'ui-avatar-bordered',
            loadState === 'loading' && 'ui-avatar-loading',
            className
        ].filter(Boolean).join(' ');

        const style = {
            width: sizeValue,
            height: sizeValue,
            fontSize: `calc(${sizeValue} * 0.4)`,
            ...customStyle
        };

        const content = renderContent(
            currentSrc,
            fallbackSrc,
            loadState,
            alt,
            lazyLoad,
            handleLoad,
            handleError
        );

        return (
            <div
                ref={ref}
                className={classes}
                style={style}
                role="img"
                aria-label={alt}
                data-load-state={loadState}
                {...restProps}
            >
                {content}
            </div>
        );
    }
);

Avatar.displayName = 'Avatar';