enum NumberType {
  Decimal,
  Number,
  Percent,
  Currency
}

export class Formatter {
  
  static DOUBLE_OPERATOR_DELIMETER = ' ';
  static DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions ={ month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true };
  static DEFAULT_NUMBER_FORMAT: Intl.NumberFormatOptions = { useGrouping: false };



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
        for (let i = 0; i < arrayLength; i++) {
          let resultContent = this.format(content, labels, i);
          // Skip if no content
          if (resultContent === '') continue;
          // If we are the last element, we dont need a delimter
          if (i != arrayLength - 1) resultContent += Formatter.DOUBLE_OPERATOR_DELIMETER;
          result += resultContent;
        }
        
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
        // We will have non strict mode for now
        // else if (knownArrayCount !== foundResult.length)
        // throw new Error('Arrays must have same length!');
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
    if (positionNumber > content.length) 
      return ""; // for now we will have non stirct mode
    // throw new Error('Can not find parameter position');

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
      case 'date':
        return this.tryParseDate(context, variableOption);
      case 'exceldate':
        return this.tryParseExcelDate(context, variableOption);
      case 'decimal':
        return this.tryParseNumber(context, NumberType.Decimal, variableOption);
      case 'number':
        return this.tryParseNumber(context, NumberType.Number, variableOption);
      case 'percent':
        return this.tryParseNumber(context, NumberType.Percent, variableOption);
      case 'currency':
        return this.tryParseNumber(context, NumberType.Currency, variableOption);
      case 'bool':
        return this.tryParseBool(context, variableOption);
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
  tryParseString(context: string, variableOption?: string): string {
    if (variableOption === undefined) return context;

    switch (variableOption.trim()) {
      case 'lower':
        return context.toLowerCase();
      case 'upper':
        return context.toUpperCase();
      case 'capitalize':
        return context.charAt(0).toUpperCase() + context.slice(1);
      case 'trim':
        return context.trim();
      case 'reverse':
        return context.split('').reverse().join('');
      default:
        throw new Error('Invalid variable option');
    }
  }

  /**
   * Trys to convert it to a Date
   * @param context
   * @param variableOption
   * @options
   *  - 2023-01-01
   */
  tryParseDate(context: string | Date, variableOption?: string): string {

    // Check if we are from the excel date function
    let date: Date;
    if (context instanceof Date) date = context;
    else {
      // regex to remove anything that is not a number, dash, colon, T, Z, or period
      const sanitized = context.replace(/[^0-9-:TZ.]/g, '');
      date = new Date(sanitized);
    }


    if (isNaN(date.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = {...Formatter.DEFAULT_DATE_FORMAT};
    // Do we have a variable option
    if (variableOption === undefined) return date.toLocaleDateString(undefined,options);

    // Parse options
    switch (variableOption.trim()) {
      case 'day':
        // Get the day of the week
        return date.toLocaleDateString(undefined, { weekday: 'long' });
      case 'month':
        return date.toLocaleDateString(undefined, { month: 'long' });
      case 'shortYear':
        return date.toLocaleDateString(undefined, { year: '2-digit' });
      case 'iso':
        return date.toISOString();
      default:
        // This is a format string
        return variableOption
          .replace(/yyyy/g, date.getFullYear().toString())
          .replace(/MM/g, (date.getMonth() + 1).toString().padStart(2, '0'))
          .replace(/dd/g, date.getDate().toString().padStart(2, '0'));
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
    const isMacDateSystem = false/* check workbook's 1904 date system flag */;
    const epochDate = isMacDateSystem ? new Date(Date.UTC(1904, 0, 1)) : new Date(Date.UTC(1900, 0, 1));
    const serialNumber = parseFloat(context);

    if (isNaN(serialNumber)) return '';
    const serial = Math.floor(serialNumber);

    // Calculate the fraction of the day elapsed
    const fraction = serialNumber - serial;
    const timeInMs = Math.round(fraction * 24 * 60 * 60 * 1000);

    const date = new Date(epochDate.getTime() + (serial - 1) * 24 * 60 * 60 * 1000 + timeInMs);
    
    return this.tryParseDate(date, format);
  }

  private getOrdinal(n: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const lastDigit = n % 10;
    const suffix = suffixes[lastDigit] || suffixes[0];
    return n + suffix;
  }

  private getCurrencyCode(option: string): string {
    let cleanedOption = option.trim();
    if (cleanedOption.length === 3) return cleanedOption.toUpperCase();
    else if (cleanedOption.length === 5) return cleanedOption.substring(3).toUpperCase();

    const currencyMap = new Map<string, string>([
      ['$', 'USD'],
      ['€', 'EUR'],
      ['£', 'GBP'],
      ['¥', 'JPY'],
      ['₩', 'KRW'],
      ['₹', 'INR'],
      ['₽', 'RUB'],
    ]);

    // Try parse the symbol
    const symbol = cleanedOption[0]
    if (!currencyMap.has(symbol))
      throw new Error('Invalid currency symbol');
    return currencyMap.get(symbol) as string;
  }
  /**
   * Trys to convert it from a string to a number with options
   * @param context
   * @param variableOption
   * @options
   *  - 123456
   */
  tryParseNumber(context: string, numberType: NumberType, formatOption?: string): string {
    const sanitized = context.replace(/[^0-9.-]/g, '');
    let number = Number.parseFloat(sanitized);
    if (isNaN(number)) return '';

    // This is a helper function to check if the format is set
    let checkIfFormatIsSet;
    if (formatOption === undefined) checkIfFormatIsSet = (tester?: string) => false;
    // The user can check to see if format is set to a specific value or if it is set at all
    else checkIfFormatIsSet = (tester?: string) => tester === undefined ? true : tester === formatOption;

    // Used by locale specific options
    let localeOptions: Intl.NumberFormatOptions = { ...Formatter.DEFAULT_NUMBER_FORMAT };

    // Used for format options that are not locale specific
    switch (numberType) {
      case NumberType.Decimal:
        localeOptions.style = 'decimal';
        localeOptions.maximumFractionDigits = 2;
        localeOptions.minimumFractionDigits = 2;
        localeOptions.useGrouping = true;

        if (checkIfFormatIsSet('rounded')) {
          number = Math.round(number);
          localeOptions.maximumFractionDigits = 0;
          localeOptions.minimumFractionDigits = 0;
        } 
        else if (checkIfFormatIsSet()) {
          // We know for sure formatOption is set tell typescript that
          formatOption = formatOption as string;

          // Try to get the number of decimal places
          localeOptions.maximumFractionDigits = parseInt(formatOption);
          if (isNaN(localeOptions.maximumFractionDigits))
            throw new Error('Invalid decimal format');
          localeOptions.minimumFractionDigits = localeOptions.maximumFractionDigits;          
        }
        break;
      case NumberType.Number:
        localeOptions.style = 'decimal';
        if (checkIfFormatIsSet('oddEven')) return number % 2 === 0 ? 'even' : 'odd';
        else if (checkIfFormatIsSet('positiveNegative')) {
          if (number === 0) return 'zero';
          return number >= 0 ? 'positive' : 'negative';
        }
        else if (checkIfFormatIsSet('ordinal')) return this.getOrdinal(number);
        else if (checkIfFormatIsSet('comma')) localeOptions.useGrouping = true;
        break;
      case NumberType.Percent:
        localeOptions.style = 'percent';
        localeOptions.maximumFractionDigits = 2;
        // Try normalize the number if it is not a percent
        if (number > 1) number /= 100;

        if (checkIfFormatIsSet('inverse')) number = 1 - number;
        break;
      case NumberType.Currency:
        localeOptions.style = 'currency';
        localeOptions.useGrouping = true;
        localeOptions.currency = 'USD';

        if (checkIfFormatIsSet()) {
          // We know for sure formatOption is set tell typescript that
          formatOption = formatOption as string;

          // Try to get the currency, it can be any currency symbol convert it to the code
          localeOptions.currency = this.getCurrencyCode(formatOption);
        }
        break;
    }

    // Used for format options that are locale specific
    return number.toLocaleString(
      undefined,
      localeOptions
    );
  }

  /**
  * Trys to convert it to a currency
  * @param context
  * @param variableOption
  * @options
  *  - USD
  */
  tryParseCurrency(context: string, variableOption?: string): string {
    const currency = parseFloat(context);
    if (isNaN(currency)) return '';


    return currency.toLocaleString('en-US', {
      style: 'currency',
      currency: variableOption ?? 'USD',
    });
  }

  /**
   * Trys to convert it to a boolean
   * @param context 
   * @param variableOption 
   */
  tryParseBool(context: string, variableOption?: string): string {
    if (variableOption === undefined) {
      if (context.toLowerCase().trim() === 'true') return 'true';
      else if (context.toLowerCase().trim() === 'false') return 'false';
      else return '';
    } else {
      if (variableOption === 'empty') {
        if (context.trim() === '') return 'yes';
        else return 'no';
      }

      switch (variableOption.trim()) {
        case 'yesno':
          if (context.toLowerCase().trim() === 'true') return 'yes';
          else if (context.toLowerCase().trim() === 'false') return 'no';
          else return '';
        case 'onoff':
          if (context.toLowerCase().trim() === 'true') return 'on';
          else if (context.toLowerCase().trim() === 'false') return 'off';
          else return '';
        default:
          return '';
      }
    }
  }
}