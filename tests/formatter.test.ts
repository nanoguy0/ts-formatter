import { Formatter } from '../src/formatter';
import { tests } from './tests.json'

type input = typeof tests[0]

describe('Formatter', () => {
    // const formatter = new Formatter(); // We dont use any instance v
    // Simple formatter tests
    test.each(tests)("$test", function({ format, input, expect: expected }: input) {
        expect((new Formatter()).format(format, input)).toBe(expected);
    });
});