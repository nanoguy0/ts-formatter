enum NumberType {
  Decimal,
  Percent,
  Currency,
  Scientific,
  Fixed,
  Compact,
  Short,
  Long,
  Number,
  Float,
}

export class Formatter {
  format(format: string, labels: (string | string[])[], index?: number): string {
    // This is the return string
    let result = '';
    // Lets handle the logic
    for (const [isComplexString, content] of this.braceMatcher(format)) {
      // This is a regular string we can just add it to the result
      if (!isComplexString) {
        result += content;
        continue;
      }

      // We need to parse the format

      // First check to see if we are an array matcher, we contain another brace
      if (content.includes('{')) {
        // We are in an array matcher
        const brace_stream = this.braceMatcher(content);
        const arrayLength = this.searchForArrayArgumentAndValidate(brace_stream, labels);
        for (let i = 0; i < arrayLength; i++) result += this.format(content, labels, i) + ', ';

        continue;
      }

      // Lets parse the format
      const match = content.split(':').map(f => f.trim());

      // Set argument position
      const argumentPosition = match[0];  // Which argument to use

      let arrayPosition: string | undefined, // If we are an array, which index to use
        variableType: string | undefined, // What type of variable to use
        variableOption: string | undefined, // What option to use
        variableType2: string | undefined, // If we are an array, what type of variable to use
        variableOption2: string | undefined; // If we are an array, what option to use

      // Make array position and variable type match 1
      if (match.length >= 2) {
        arrayPosition = match[1];
        variableType = match[1];
      }

      // Make variable type 2 and variable option match 2
      if (match.length >= 3) {
        variableType2 = match[2];
        variableOption = match[2];
      }

      // Make variable option 2 match 3
      if (match.length >= 4) {
        variableOption2 = match[3];
      }

      // Get position number
      const context = this.tryParsePosition(argumentPosition, labels);

      // Check if we are an array
      if (Array.isArray(context)) {
        // Are we in an array itterator
        if (typeof index === 'number') {
          // Set the optional variables
          arrayPosition = index.toString();
          variableType2 = variableType;
          variableOption2 = variableOption;
        }

        // Try parse the array position
        const arrayContext = this.tryParsePosition(arrayPosition, context);

        if (typeof arrayContext != 'string') throw new Error('Invalid format string');
        result += this.tryResolveVariable(variableType2, variableOption2, arrayContext);
        continue;
      }

      // We aren't an array or we got our info, lets check how to parse us
      result += this.tryResolveVariable(variableType, variableOption, context);
      continue;
    }
    return result;
  }

  /**
   * Used by the {{ }} operation, needs to find the internal array and validate, this allows for constants to be included
   * @param matcher
   * @param labels
   */
  searchForArrayArgumentAndValidate(
    matcher: Generator<[boolean, string]>,
    labels: (string | string[])[]
  ) {
    let knownArrayCount: number | undefined;
    let currentElement: IteratorResult<[boolean, string]>;

    do {
      currentElement = matcher.next();
      if (currentElement.value === undefined) break;
      const [isComplexString, content] = currentElement.value as [boolean, string];
      // First we check to see if we are a complex string
      if (isComplexString) {
        // Lets try get the argument index
        const foundResult = this.tryParsePosition(content.split(':').map(d => d.trim())[0], labels);
        if (!Array.isArray(foundResult)) continue; // We aren't an array skip this
        if (knownArrayCount === undefined) knownArrayCount = foundResult.length;
        // else if (knownArrayCount !== foundResult.length)
          throw new Error('Arrays must have same length!');
      }
    } while (!currentElement.done);
    if (knownArrayCount === undefined) throw new Error('No array found in array matcher');
    return knownArrayCount;
  }

  /**
   * Get the context from the position
   * @param position
   * @param content
   * @returns
   */
  tryParsePosition(
    position: string | undefined,
    content: (string | string[])[]
  ): string | string[] {
    if (position === undefined) throw new Error('Parameter position is undefined');

    const positionNumber = parseInt(position);
    if (isNaN(positionNumber)) throw new Error('Prameter position is not a number');
    if (positionNumber > content.length) throw new Error('Can not find parameter position');

    return content[positionNumber];
  }

  /**
   * Brace matcher, this is a generator that will return a tuple of [isComplexString, content]
   * @param s
   */
  *braceMatcher(s: string): Generator<[boolean, string]> {
    let content = '';
    let depth = 0;
    let isInsideBraces = false;

    for (const char of s) {
      switch (char) {
        case '{':
          if (depth > 0) content += char;
          if (depth === 0) {
            if (content) yield [isInsideBraces, content];
            content = '';
          }
          depth++;
          isInsideBraces = true;
          break;
        case '}':
          depth--;
          if (depth > 0) content += char;
          if (depth === 0) {
            yield [isInsideBraces, content];
            content = '';
            isInsideBraces = false;
          }
          break;
        default:
          content += char;
      }
    }

    if (depth !== 0) throw new Error('Unclosed braces in the string');
    if (content) yield [isInsideBraces, content];
  }

  /**
   * Try parse the variables
   * @param variableType
   * @param variableOption
   * @param context
   * @returns
   */
  tryResolveVariable(
    variableType: string | undefined,
    variableOption: string | undefined,
    context: string
  ): string {
    // If we are the same variable then just return the context
    if (variableType === undefined) return context;
    // Big switch statement to try parse the variable
    switch (variableType.toLowerCase()) {
      case 'enum':
      case 'string':
        return this.tryParseString(context, variableOption);
      case 'currency':
        return this.tryParseCurrency(context, variableOption);
      case 'date':
        return this.tryParseDate(context, variableOption);
      case 'exceldate':
        return this.tryParseExcelDate(context, variableOption);
      case 'boolean':
        return context.trim() ? 'Yes' : 'No';
      case 'float':
        return this.tryParseNumber(context, NumberType.Float, variableOption);
      case 'decimal':
        return this.tryParseNumber(context, NumberType.Decimal, variableOption);
      case 'percent':
        return this.tryParseNumber(context, NumberType.Percent, variableOption);
      case 'number':
        return this.tryParseNumber(context, NumberType.Number, variableOption);
      default:
        throw new Error('Invalid format type');
    }
  }

  /**
   * Try to convert it to a string
   * @param context
   * @param variableOption
   * @options
   *  - lower
   *  - upper
   *
   * @returns
   */
  tryParseString(context: string, variableOption: string | undefined): string {
    if (variableOption === undefined) return context;
    else if (variableOption.trim() === 'lower') return context.toLowerCase();
    else if (variableOption.trim() === 'upper') return context.toUpperCase();
    else throw new Error('Invalid variable option');
  }

  /**
   * Trys to convert it to a currency
   * @param context
   * @param variableOption
   * @options
   *  - USD
   */
  tryParseCurrency(context: string, variableOption: string | undefined): string {
    const currency = parseFloat(context);
    if (isNaN(currency)) return '';
    return currency.toLocaleString('en-US', {
      style: 'currency',
      currency: variableOption ?? 'USD',
    });
  }

  /**
   * Trys to convert it to a Date
   * @param context
   * @param variableOption
   * @options
   *  - 2023-01-01
   */
  tryParseDate(context: string, format?: string): string {
    // regex to remove anything that is not a number, dash, colon, T, Z, or period
    const sanitized = context.replace(/[^0-9-:TZ.]/g, '');
    const date = new Date(sanitized);
    if (isNaN(date.getTime())) return '';
    if (format) {
      return format
        .replace(/yyyy/g, date.getFullYear().toString())
        .replace(/MM/g, (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace(/dd/g, date.getDate().toString().padStart(2, '0'));
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Trys to convert it from an Excel Date
   * @param context
   * @param variableOption
   * @options
   *  - 123456
   */
  tryParseExcelDate(context: string, format?: string): string {
    const serialNumber = parseFloat(context);
    if (isNaN(serialNumber)) return '';
    const serial = Math.floor(serialNumber);
    if (serial <= 60) {
      return this.tryParseDate(
        new Date(Date.UTC(1900, 0, 1) + (serial - 1) * 24 * 60 * 60 * 1000),
        format
      );
    } else {
      return this.tryParseDate(
        new Date(Date.UTC(1900, 0, 1) + (serial - 2) * 24 * 60 * 60 * 1000),
        format
      );
    }
  }
  /**
   * Trys to convert it from a string to a number with options
   * @param context
   * @param variableOption
   * @options
   *  - 123456
   */
  tryParseNumber(context: string, numberType: NumberType, formatOption?: string): string {
    const sanitized = context.replace(/[^0-9.]/g, '');
    const number = Number.parseFloat(sanitized);
    if (isNaN(number)) return '';
    if (formatOption) {
      return number.toLocaleString(
        undefined,
        this.parseNumberFormatOptions(numberType, formatOption)
      );
    } else {
      return String(number);
    }
  }

  parseNumberFormatOptions(
    numberType: NumberType,
    formatOptions: string | undefined
  ): Intl.NumberFormatOptions {
    const options: Intl.NumberFormatOptions = {};

    let formatOption = formatOptions;
    if (formatOption?.includes(',')) {
      options.useGrouping = true;
      formatOption = formatOptions?.replace(',', '');
    }

    switch (numberType) {
      case NumberType.Percent:
        options.style = 'percent';
        break;
      case NumberType.Decimal:
        options.style = 'decimal';
        options.minimumFractionDigits = parseInt(formatOption || '0');
        options.maximumFractionDigits = options.minimumFractionDigits;
        break;
      default:
        options.style = 'decimal';
        break;
    }
    return options;
  }
}