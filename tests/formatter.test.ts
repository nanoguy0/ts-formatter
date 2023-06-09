import { Formatter } from '../src/formatter';

describe('Formatter', () => {
    test('should format a string', () => {
        var format = new Formatter();
        var result = format.format('Hello {0}', ['World']);
        expect(result).toBe('Hello World');
    });
});