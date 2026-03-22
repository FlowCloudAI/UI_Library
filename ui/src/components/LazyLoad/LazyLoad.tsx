import { lazy, Suspense, ComponentType, ReactNode } from 'react';

interface LazyLoadOptions {
    fallback?: ReactNode;
    timeout?: number;
}

export function lazyLoad<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: LazyLoadOptions = {}
) {
    const { fallback = <LazySpinner />, timeout = 10000 } = options;

    const LazyComponent = lazy(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const loadPromise = Promise.race([
            importFn(),
            new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`加载超时`)), timeout);
            }),
        ]).finally(() => clearTimeout(timeoutId));

        return loadPromise as Promise<{ default: T }>;
    });

    return (props: any) => (
        <Suspense fallback={fallback}>
            <LazyComponent {...props} />
        </Suspense>
    );
}

function LazySpinner() {
    return (
        <div className="fc-lazy-spinner">
            <div className="fc-lazy-spinner-dot" />
            <div className="fc-lazy-spinner-dot" />
            <div className="fc-lazy-spinner-dot" />
        </div>
    );
}