import { Formatter } from '../formatter';
import { tests } from './tests.json'


type input = typeof tests[0]

describe('Formatter', () => {
    
    // We have to overide the the timezone to UTC
    const realToLocale = Date.prototype.toLocaleDateString;
    // @ts-ignore
    Date.prototype.toLocaleDateString = function(locale, options) {
        return realToLocale.call(this, locale, { ...options, timeZone: 'UTC' });
    };


    // const formatter = new Formatter(); // We dont use any instance v
    // Simple formatter tests
    test.each(tests)("$test: $format", function({ format, input, expect: expected }: input) {
        expect((new Formatter()).format(format, input)).toBe(expected);
    });
});