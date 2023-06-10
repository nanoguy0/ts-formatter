# TS-Formatter: An Intuitive String Formatter

TS-Formatter is a user-friendly string formatter developed using TypeScript and Jest Testing. It allows you to insert data dynamically into strings using a simple formatting syntax.

## Sample Usage

```ts
import { Formatter } from \'ts-formatter\';

const formatString = "Hello {0}!";
const input = ["World"];

const format = new Formatter();

console.log(format.format(formatString, input)); 
// Output: Hello World!
```

## Example Scenarios

| Format Template | Input | Output |
| - | - | - |
| `"Hello {0}!"` | `["World"]` | `"Hello World"` |
| `"Hello {0}! The time is {1:date}!"` | `["World", "2023-06-09T21:05:11.764Z"]` | `"Hello World! The time is 2:05 PM!"` |
| `"Core reactor is at {2:percent}! Current Reactor Heats:{{ Name:{0:upper} Temp:{1:decimal:2}}}"` | `[["Main reactor", "Sub reactor"], ["23.5432","63.2"], "23.0"]` | `"Core reactor is at 23%! Current Reactor Heats: Name:Main reactor Temp:23.54 Name:Sub reactor Temp:63.20"` |
| `"The first time to do is {0:0}!"` | `[["eat","sleep","work"]]` | `"The first time to do is eat!"` |

# Constructing the Inputs

There are two vital components to using the formatter: the Format String and the Value String.

## Format String

The format string contains the expected output text, with `{}` operators to insert values. Please note, the `{}` characters cannot be used literally in the string. Alternative characters like `[]` should be used instead. 

Example:
```
String Inputs: "Hello {0}"  + ["World"] = "Hello World"
Type Formats: "The time is {0:date}" + ["2023-06-09T21:05:11.764Z"] = "The time is 2:05 PM"
Array Inputs: "The first time to do is {0:0}!" + [["eat","sleep","work"]] = "The first time to do is eat!"
```

For iterating over an array and repeating the format for every entry, use the double `{{}}` operator. It accepts another format string inside, supplying a new format string for every variable in the array. The formatter can handle multiple arrays and will automatically increment the index for each one. 

Do note, if the `{{}}` operator is used and the provided arrays have differing lengths, the formatter will iterate based on the largest array\'s size, returning an empty string for all shorter arrays.

## Parameters

Each parameter is delimited by the `:` symbol. Avoid including white spaces for better formatting.

**Recommended**
```
"The current time is {0:date} and my battery is at {2:percent}."
```
**Not Recommended**
```
"The current time is {0: time} and my battery is at { 2 :percent }."
 ```

1. The first parameter for every variable is always a number. This signifies the argument\'s position being retrieved. If this is an array, the next parameter must be another number, unless it\'s inside a double `{{}}` operator, in which case the iterator automatically sets it.
2. The second parameter, following the potential array indexer, is an optional type processor. This enables users to modify the string display content with custom behavior. See type processor.
3. The third optional parameter is an argument provided to the type processor, which depends on the type processor.

Here are a few examples of how to declare variables in the format string:

- `{0}` - Value at offset 0
- `{1:decimal}` - Value at offset 1, displayed as a decimal
- `{1:date:day}` - Value at offset 1, displayed as time, with the processor parameter: "day"
- `{0:1}` - Value in the array at offset 0 at index 1
- `{{0:date}}` - Display each value in the array at offset 0 as time

Attempting to retrieve an array without an index will cause an error.

## Value String

The value string is quite simple - it is an array of strings or array of strings.
```ts
type Input = (string | string[])[]

var example: Input = ["foo",["bar"]]
```

# Type Processors
Type processors give you the ability to manipulate the string representation of the inserted data according to specific rules. Here's a detailed look at the existing type processors.

## String - `:string`
Returns the existing value. Additional type parameters are:
- `:lower`: Converts the string to lowercase
- `:upper`: Converts the string to uppercase
- `:capitalize`: Transforms the first character of the string to uppercase
- `:trim`: Trims leading and trailing whitespaces from the string.
- `:reverse`: Reverses the string characters. For example, {0:string:reverse} for "Hello" outputs "olleH".

## Date - `:date`
Converts the string to a date, using the JavaScript `Date()` function to parse the string. Additional type parameters:
- `:{yyyy}{MM}{dd}`: Converts the date to a readable format. Use `{yyyy}`, `{MM}`, or `{dd}` to display the respective part of the date. For example: `{0:date:Year- yyyy}` -> "Year- 2023"
- `:day` Outputs the day of the week. For example, `{0:date:day}` -> "Monday".
- `:month`: Outputs the full month name. For example, `{0:date:month}` for "2023-06-09" outputs "June".
- `:shortYear`: Outputs the last two digits of the year. For example, `{0:date:shortYear}` for "2023-06-09" outputs "23".
- `:iso`: Outputs the date in ISO 8601 format.

## Excel Date `:exceldate`
*No additional processors for excel date*

## Decimal - `:decimal`
- `:rounded`: Rounds off the decimal number to the nearest integer. For example, {1:decimal:rounded} outputs 24 for an input of 23.6.

## Number - `:number`
- `:oddEven`: Outputs "odd" for odd numbers and "even" for even numbers.
- `:positiveNegative`: Outputs "positive" for positive numbers, "negative" for negative numbers and "zero" for zero.
- `:ordinal`: Outputs the ordinal form of the number. For example, `{1:number:ordinal}` for "23" outputs "23rd".
- `:comma`: Adds a comma grouping to the outputed number For example `{1:number:comma}` for "2300" outputs "2,300".

## Percent - `:percent`
- `:inverse`: Gives the complement of the percentage. For example, {2:percent:inverse} outputs 77% for an input of 23%. 

## Currency - `:currency`
- `:{format}`: Allows the currency format to be specified. For example, {1:currency:£} outputs £100 for an input of 100.

## Boolean - `:bool`
- `:yesno`: Outputs "yes" for true and "no" for false. For example, {0:bool:yesno} outputs "yes" for true.
- `:onoff`: Outputs "on" for true and "off" for false.
- `:empty`: Outputs "yes" for empty and "no" for not empty.