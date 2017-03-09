Custom Input
============

A library helps you create custom input elements in the browser. Add mask and validation to *input[text]*! Originally included in [angular-datetime](https://github.com/eight04/angular-datetime).

It has 2 components, *InputMask* and *TextParser*. Import them with `require`:

```javascript
var {InputMask, TextParser} = require("custom-input");
```

Or you can use the pre-built dist:

```html
<!-- export cusomInput into global -->
<script src="path/to/custom-input/dist/custom-input.js"></script>
```
```javascript
var {InputMask, TextParser} = customInput;
```

The pre-built dist is compatbible with IE 8 by transpiling using Babel and babel-polyfill.

Installation
------------

	npm install -S custom-input
	
Demo
----

A small example showing how it works:
https://rawgit.com/eight04/custom-input/master/demo.html

API reference
-------------

Both TextParser and InputMask extend node's [EventEmitter](https://nodejs.org/api/events.html).

### TextParser

Create a stateful parser which can convert a model to a string and vise versa. The parser uses a series of Token to form a text template. For example, the IP address: `xxx.xxx.xxx.xxx` can be represented with 7 tokens, which are *Number{1,3}*, *String "."*, *Number{1,3}*, *String "."*, *Number{1,3}*, *String "."*, *Number{1,3}*. The parser will try to parse text along the tokens, extract the value from text and convert them into the model.

#### constructor(option: Object)

##### option object

* option.tokens - A list of definition token. See [Token](#token).
* option.value - Initial model value.
* option.copyValue - A function to clone the model. `value => clone(value)`

#### TextParser.parse(text: String) => textParser

Parse the string and create a model value. The value is saved in the parser.

#### TextParser.setValue(model, preserveEmptyFlag) => textParser

Set model value and convert to text.

If preserveEmptyFlag is not true, parser will reset all empty flag to false before converting to text.

#### TextParser.getValue() => model

Get model value in the parser.

#### TextParser.getText() => String

Get text in the parser.

#### TextParser.isEmpty([text: String]) => boolean

If text is supplied, parse the text without saving data and check if the text contains empty node.

If omitted, check if the text in the parser contains empty node.

#### TextParser.isInit() => boolean

Return true if there is no empty node.

#### TextParser.unset() => textParser

Mark every nodes empty.

#### TextParser.getNodes() => Array of Node

Get node list.

### TextParser events

* change - Emit when model changed.

### Token

A token is an object that contains special information for parsing. Each token may represents a static string, a number, or a choice list.

#### token.type: String, required

Can be `static`, `number`, or `select`, which represents 3 different types of node.

#### token.placeholder: String, required if type is not static

A placeholder to show when the node is empty.

#### token.value: String, required if type is static

The string value.

#### token.select: Array of String, required if type is select

A list of word that the string should match.

When converting text to model, parser will get the index of matched text, plus 1, then save as node value.

#### token.prior: Number, optional

If there are two nodes whose value has been changed in the same time, the node having higher prior will apply the change to the model first.

Next 4 optional properties only affect tokens with number type:

#### token.minLength: Number

The min length of the number.

#### token.maxLength: Number

The max length of the number.

#### token.min: Number

The min value of the number.

#### token.max: Number

The max value of the number.

Following functions are used to manipulate model value.
	
#### token.extract(model) => Number, required

A function that can extract node value from the model. It is used to convert model value to string.

#### token.add(model, diff: Number) => model, required

A function that can add node value to the model.

#### token.restore(model, nodeValue: number) => model, required

A function that can restore node value to the model.

### InputMask

InputMask is built on top of an input element and a TextParser. It handles most of the HTML stuff like listening to events, tracking selection range of the input element...

After the mask is applied, user can only edit partial text that is not defined as "static". User can also press left/right arrow keys or tab to navigate between each non-static node. Use up/down arrow keys to increase/decrease node value. If it is a "select" node, it will act like a typeahead component. If the user try to delete the node, it will be replaced by a placeholder.

#### constructor(element: Element, textParser, separators = "")

Arguments:

* element - An Element object follows [Element interface](#element-interface).
* textParser - A parser object.
* separators - Apart from tab key, add other keys that can navigate through nodes.

#### InputMask.digest(node: Node, text: String, fixError: Boolean)

The mask will try to parse the text. If there are any errors, try fixing it and parse it again.

Arguments:

* node - can be null

	If node is null, digest will parse text as `textParser.parse(text)`.
	If node is a Node, digest will parse text as `node.parse(text)`.

* text

	The text to parse.

* fixError - default to false

	If fixError is true, digest will try hardest to fix the error, even revert back the text to previous state.

	If fixError is false, digest will fix those fatal error, but leaves `NUMBER_TOOSHORT`, `LEADING_ZERO`...
	
### InputMask events

* digest - get parsing error while digesting. It might fire multiple times during one digest.

### Element interface

The Element interface wraps native input element and exposes some methods similar to jQuery.

#### Element.on(eventType: String, callback: Function)

Wrap addEventListener. InputMask will listen to `input` event for text update, you might want to proxy it for cross browser compatibility.

InputMask uses following events:

* mousedown
* click
* focus
* input
* keydown
* keypress
* blur

#### Element.getSelection() => Range object or null

Range object has two properties, start and end, showing the current state of the selection.

Return null if the element is not focused.

#### Element.setSelection(start: Number, end: Number)

Set selection on the input. You might need to check if the input is active or some browsers will try to focus the input when selection changed.

#### Element.val([text: String])

Set/get the value of the input. Like jQuery.
	
### utils

#### utils.num2str(number, minLength, maxLength) => String

Convert number to string, padding with zeros and trim out text after maxLength.
	
Changelog
---------
* 0.2.0 (Mar 9, 2017)
	- Allow using empty string as placeholder
	- The "change" event of TextParser now sends model value to listener.
	- **Drop utils.Emitter. Use node's [events](https://nodejs.org/api/events.html).**
	- **Change the event name of InputMask: error -> digest.**
	- **Drop angular module, always use window.customInput.**
* 0.1.0 (Dec 19, 2016)
	- First release.
