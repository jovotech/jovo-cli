"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jest");
const src_1 = require("../src");
describe('basic tests', () => {
    test('sum numbers', () => {
        expect(src_1.sum(1, 2)).toBe(3);
    });
});
//# sourceMappingURL=Example.test.js.map