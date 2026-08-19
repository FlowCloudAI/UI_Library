import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {URL} from 'node:url';
import {shouldSelectDropUp} from './selectPosition.ts';

const selectCss = readFileSync(new URL('./Select.css', import.meta.url), 'utf8');

test('下方被裁切且上方空间更多时向上展开', () => {
    assert.equal(shouldSelectDropUp(120, 20, 240), true);
    assert.equal(shouldSelectDropUp(120, 160, 20), false);
    assert.equal(shouldSelectDropUp(120, 20, 10), false);
});

test('capsule 只改变 Select 触发器，不改变下拉菜单面板', () => {
    const rootRule = selectCss.match(/\.fc-select\s*\{([^}]*)\}/)?.[1] ?? '';
    const triggerRule = selectCss.match(/\.fc-select__trigger\s*\{([^}]*)\}/)?.[1] ?? '';
    const dropdownRule = selectCss.match(/\.fc-select__dropdown\s*\{([^}]*)\}/)?.[1] ?? '';
    const capsuleRule = selectCss.match(/\.fc-select--radius-full\s*\{([^}]*)\}/)?.[1] ?? '';

    assert.match(rootRule, /--select-dropdown-radius:\s*var\(--fc-radius-md\);/);
    assert.match(triggerRule, /border-radius:\s*var\(--select-trigger-radius\);/);
    assert.match(dropdownRule, /border-radius:\s*var\(--select-dropdown-radius\);/);
    assert.match(capsuleRule, /--select-trigger-radius:\s*var\(--fc-radius-full,/);
    assert.doesNotMatch(capsuleRule, /--select-dropdown-radius/);
});
