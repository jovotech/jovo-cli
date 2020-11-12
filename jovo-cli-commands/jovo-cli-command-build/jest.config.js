module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testURL: 'http://localhost/',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  testPathIgnorePatterns: ['/dist/', '/node_modules/', '/tmpTestFolder.*/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
};
