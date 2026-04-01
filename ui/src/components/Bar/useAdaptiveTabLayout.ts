import { useState, useRef, useCallback, useEffect } from 'react';

export interface AdaptiveTabLayoutOptions {
    itemsLength: number;
    addable: boolean;
    minWidthRatio: number;
    maxTabWidthRatio: number;
}

export interface AdaptiveTabLayout {
    scrollMode: boolean;
    tabWidth: number | undefined;
}

/**
 * 自适应 Tab 宽度布局 hook。
 * 根据容器宽度和 Tab 数量决定是均分缩放模式还是横向滚动模式。
 */
export function useAdaptiveTabLayout(
    navRef: React.RefObject<HTMLDivElement | null>,
    options: AdaptiveTabLayoutOptions,
): AdaptiveTabLayout {
    const { itemsLength, addable, minWidthRatio, maxTabWidthRatio } = options;

    // 使用 ref 存储可变依赖，避免 calculate 因依赖变化而重新创建
    const itemsLengthRef = useRef(itemsLength);
    itemsLengthRef.current = itemsLength;
    const addableRef = useRef(addable);
    addableRef.current = addable;
    const minWidthRatioRef = useRef(minWidthRatio);
    minWidthRatioRef.current = minWidthRatio;
    const maxTabWidthRatioRef = useRef(maxTabWidthRatio);
    maxTabWidthRatioRef.current = maxTabWidthRatio;

    const [layout, setLayout] = useState<AdaptiveTabLayout>({ scrollMode: false, tabWidth: undefined });

    const rafRef = useRef<number | null>(null);
    const lastLayoutRef = useRef<AdaptiveTabLayout>({ scrollMode: false, tabWidth: undefined });
    const addBtnWidthRef = useRef<number>(0);
    const lastAddableRef = useRef<boolean | undefined>(undefined);

    const calculate = useCallback(() => {
        const navOuter = navRef.current?.parentElement;
        const nav = navRef.current;
        const currentItemsLength = itemsLengthRef.current;
        const currentAddable = addableRef.current;
        const currentMinWidthRatio = minWidthRatioRef.current;
        const currentMaxTabWidthRatio = maxTabWidthRatioRef.current;

        if (!nav || !navOuter || currentItemsLength === 0) return;

        if (currentAddable !== lastAddableRef.current) {
            lastAddableRef.current = currentAddable;
            if (currentAddable) {
                const addBtnElement = navOuter.querySelector('.fc-tab-bar__add-btn');
                if (addBtnElement) {
                    const btnStyle = getComputedStyle(addBtnElement);
                    const marginL = parseFloat(btnStyle.marginLeft) || 0;
                    const marginR = parseFloat(btnStyle.marginRight) || 0;
                    addBtnWidthRef.current = addBtnElement.getBoundingClientRect().width + marginL + marginR;
                }
            } else {
                addBtnWidthRef.current = 0;
            }
        }

        const navOuterCS = getComputedStyle(navOuter);
        const navWrap = nav.querySelector('.fc-tab-bar__nav-wrap');

        const navOuterW = navOuter.clientWidth
            - parseFloat(navOuterCS.paddingLeft)
            - parseFloat(navOuterCS.paddingRight);

        const navW = navOuterW - addBtnWidthRef.current;

        const tabGap = navWrap ? parseFloat(getComputedStyle(navWrap).gap) : 0;
        const totalGapWidth = (currentItemsLength - 1) * tabGap;
        const idealW = (navW - totalGapWidth) / currentItemsLength;

        const threshold = screen.width * currentMinWidthRatio;
        const maxAllowedWidth = screen.width * currentMaxTabWidthRatio;
        const minAllowedWidth = 42;

        const prev = lastLayoutRef.current;
        const hysteresisFactor = 1.1;

        let newScrollMode: boolean;
        let newTabWidth: number;

        if (idealW < threshold) {
            newScrollMode = true;
            newTabWidth = Math.max(threshold, minAllowedWidth);
        } else if (prev.scrollMode && idealW < threshold * hysteresisFactor) {
            newScrollMode = true;
            newTabWidth = Math.max(threshold, minAllowedWidth);
        } else {
            newScrollMode = false;
            newTabWidth = Math.min(Math.max(idealW, minAllowedWidth), maxAllowedWidth);
        }

        if (prev.tabWidth !== newTabWidth || prev.scrollMode !== newScrollMode) {
            const newLayout: AdaptiveTabLayout = { scrollMode: newScrollMode, tabWidth: newTabWidth };
            lastLayoutRef.current = newLayout;
            setLayout(newLayout);
        }
    }, [navRef]);

    const calculateRef = useRef(calculate);
    calculateRef.current = calculate;

    // 用 ResizeObserver 监听容器尺寸，每帧 layout 后立即触发，无需 debounce
    useEffect(() => {
        const navOuter = navRef.current?.parentElement;
        if (!navOuter) return;

        const ro = new ResizeObserver(() => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                calculateRef.current();
            });
        });

        ro.observe(navOuter);
        // 初次计算
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            calculateRef.current();
        });

        return () => {
            ro.disconnect();
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // items 数量变化时重新计算
    useEffect(() => {
        calculate();
    }, [itemsLength, calculate]);

    return layout;
}
