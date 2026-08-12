/** Select 下拉菜单的空间判断；实际边界测量留在组件中。 */
export function shouldSelectDropUp(
    dropdownHeight: number,
    spaceBelow: number,
    spaceAbove: number,
): boolean {
    return dropdownHeight > spaceBelow && spaceAbove > spaceBelow;
}
