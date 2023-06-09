# ts-formatter
A simple string formatter written in typescript with jest testing

## Code
```ts
import { Formatter } from 'ts-formatter';

const formatString = "Hello {0}!";
const input = ["World"];

const format = new Formatter();

console.log(format.format(formatString, input)); 
// Hello World!
```

## Examples
| Format | Input | Output |
| - | - | - |
| `"Hello {0}!"` | `["World"]` | `"Hello World"` |
| `"Hello {0}! The time is {1:time}!"` | `["World", "2023-06-09T21:05:11.764Z"]` | `"Hello World! The time is 2:05 PM!"` |
| `"Core reactor is at {2:percent}! Current Reactor Heats:{{ Name:{0:upper} Temp:{1:decimal:2}\n}}"` | `[["Main reactor", "Sub reactor"], ["23.5432","63.2"], "23.0"]` | `"Core reactor is at 23%! Current Reactor Heats: Name:Main reactor Temp:23.54\n  Name:Sub reactor Temp:63.20\n "` |
| `"The first time to do is {0:0}!"` | `[["eat","sleep","work"]]` | `"The first time to do is eat!"` |
# Building the Inputs
*There are two inputs to the formatter.*
## The Format String

This is a string that contains the expected output text, to add values you use the `{}` operator. Keep in mind you can not use these characters in the string, if you wish to use them you must use alternatives like `[]`. 

Example:
```
Using Strings: "Hello {0}"  + ["World"] = "Hello World"
Format types: "The time is {0:time}" + ["2023-06-09T21:05:11.764Z"] = "The time is 2:05 PM"
Index into arrays: "The first time to do is {0:0}!" + [["eat","sleep","work"]] = "The first time to do is eat!"
```

If the user wishes to itterate over an array and display repeat the format for every entry in the array they may use the double `{{}}` operator. You can put another format string inside the double operator and it will provide the new format string for every variable in the array. You can provide multiple arrays and it will work with an increasing index on both.  To refrence contents in the format string you can follow the parameter spec.

*keep in mind: if you do use the `{{}}` operator and the provided arrays are of different length, it will repeat based on the size of the largest array returning and empty string for all other arrays*
## Parameters
 Each parameter is delimitated by the `:` symbol. To prevent weird behavior it is recomened to format them without including white space. 
 
 For example:

**GOOD**
```
"The current time is {0:time} and my battery is at {2:percent}."
```
**BAD**
```
"The current time is {0: time} and my battery is at { 2 :percent }."
 ```

1. The first parameter of every variable is always a number. This refrences the position of the argument that is being retrieved. If this is an array, the next parameter must be another number, unless it is inside a double `{{}}` operator, in which case it will be auto set by the itterator.
2. The second parameter, after the potential array indexor, is an optional type processor. This type processor allows users to have custom behavior modify the string in a way that displays the content. See type processor.
3. The third optional parameter is a argument that can be provided to the type processor, this depends on the type processor.

**Short story long, there can be many different ways to declare variables in the format string, so here are a few examples:**

- `{0}` - The value at offset 0
- `{1:decimal}` - The value at offset 1, displayed as a decimal
- `{1:time:day}` - The value at offset 1, displayed as a time, with the processor parameter: "day"
- `{0:1}` - The value in the array at offset 0 at index 1
- `{{0:time}}` - For every value in the array at offset 0 display the as time

**attempting to get an array without an index will cause an error*

## The Value String

The value string is pretty simple, it is an array of either strings or array of strings.
```ts
type Input = (string | string[])[]

var example: Input = ["foo",["bar"]]
```

# Type Processors

## String - `:string`
Main default for all, just returns the existing value. Following additional type parameters:
### `:lower`
Converts the string lowercase
### `:upper`
Converts the string to uppercase
## Date - `:date`
Converts the string to a date, uses the javascript `Date()` function to parse the string, following additional type parameters:

### `:{yyyy}{MM}{dd}`
Converts the date to readable time, provide a string after the `:` of the prefered format, include the `{yyyy}` or `{MM}` or `{dd}` if you want to show the respective part of the date. For example:
```
{0:date:Year- yyyy}  -> "Year- 2023"
```

## Time `:time`
TODO

## Excel Date `:exceldate`
TODO

## Decimal - `:decimal`
TODO

## Percent - `:percent`
TODO

## Currency - `:currency`
TODO

## Boolean - `:bool`
TODO

