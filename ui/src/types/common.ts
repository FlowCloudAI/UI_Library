import type * as React from 'react'

export interface FcBaseProps {
    className?: string
    style?: React.CSSProperties
}

export type FcSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type FcRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'

export type FcStatus = 'default' | 'success' | 'warning' | 'error'

export interface FcChangeMeta<TEvent = unknown> {
    source?: 'click' | 'keyboard' | 'input' | 'drag' | 'programmatic'
    event?: TEvent
}

export type FcChangeHandler<TValue, TMeta = unknown> = (
    nextValue: TValue,
    meta?: TMeta,
) => void
