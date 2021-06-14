import * as Validators from '../src/validators';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('validateLocale()', () => {
  test('should do nothing if locale is not specified', () => {
    const spiedValidateLocale: jest.SpyInstance = jest.spyOn(Validators, 'validateLocale');
    Validators.validateLocale();
    expect(spiedValidateLocale).toReturn();
  });

  test('should return if locale is valid', () => {
    const spiedValidateLocale: jest.SpyInstance = jest.spyOn(Validators, 'validateLocale');
    Validators.validateLocale('en');
    Validators.validateLocale('en-US');
    expect(spiedValidateLocale).toReturnTimes(2);
  });

  test('should throw an error if locale is invalid', () => {
    expect(Validators.validateLocale.bind(null, 'en_US')).toThrow('Locale en_US is not valid.');
    expect(Validators.validateLocale.bind(null, 'e')).toThrow('Locale e is not valid.');
    expect(Validators.validateLocale.bind(null, 'test')).toThrow('Locale test is not valid.');
    expect(Validators.validateLocale.bind(null, 'en-US-CA')).toThrow(
      'Locale en-US-CA is not valid.',
    );
  });
});
