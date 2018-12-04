
import 'jest';

import { sum } from '../src';

describe('basic tests', () => {
    test('sum numbers', () => {
        expect(sum(1, 2)).toBe(3);
    });
});
