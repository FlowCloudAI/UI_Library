import assert from 'node:assert/strict';
import test from 'node:test';
import {shouldSelectDropUp} from './selectPosition.ts';

test('下方被裁切且上方空间更多时向上展开', () => {
    assert.equal(shouldSelectDropUp(120, 20, 240), true);
    assert.equal(shouldSelectDropUp(120, 160, 20), false);
    assert.equal(shouldSelectDropUp(120, 20, 10), false);
});
