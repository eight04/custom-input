Custom Input
============
Create special input element on browsers. Add mask and parse rules to `input[text]`! Originally included in [angular-datetime](https://github.com/eight04/angular-datetime).

This module have 2 components, `InputMask` and `TextParser`. Import them with `require`:

	var {InputMask, TextParser} = require("custom-input");

There is a pre-built Angular 1 dist, which is used by [angular-datetime](https://github.com/eight04/angular-datetime).

Installation
------------

	npm install -S custom-input

API reference
-------------

### TextParser

Create a stateful parser which can convert a *model* to a *string* and vise versa. The parser uses a series of *nodes* to represent text format. A *node* is an object that is defined by a Token, and contains other information like `isEmpty` or `viewValue`. For example, the IP address: `xxx.xxx.xxx.xxx` can be represented with 7 nodes, which are `Number{1,3}`, `String "."`, `Number{1,3}`, `String "."`, `Number{1,3}`, `String "."`, `Number{1,3}`.

#### constructor(option: Object)

##### option object

* option.tokens - A list of definition token. See [Token](#token).
* option.value - Initial model value.
* option.opyValue - A function being able to clone your model. `value => clone(value)`

#### TextParser.parse(text: String) => textParser

Parse the string and create a model value. The value is saved in the parser.

#### TextParser.setValue(value) => textParser

Convert the model value to a string.

#### TextParser.getValue() => value

Get current value in the parser.

#### TextParser.getText() => text: String

Get current text in the parser.

#### TextParser.isEmpty([text: String]) => boolean

If text is supplied, parse the text without saving data and check if the text contains empty node.

If omitted, check if the text in the parser contains empty node.

#### TextParser.isInit() => boolean

Return true if there is no empty node.

#### TextParser.unset() => textParser

Set every nodes to empty.

#### TextParser.getNodes() => Array of Node

Get node list.

### Token

A token is an object that contains special information for parsing. Each token may represents a static string, a number, or a selection list.

#### token.type: String, required

Can be `static`, `number`, or `select`, which represents 3 different types of node.

#### token.placeholder: String, required if type is not static

A placeholder to show when the node is empty, i.e. no value has been set.

#### token.value: String, required if type is static

The string value.

#### token.select: Array of String, required if type is select

A list of word that the string should match.

#### token.prior: Number, optional

If there are two nodes whose value has been changed in the same time, the node having higher prior will apply the change to the model first.

Next 4 optional properties only affect tokens that type == "number":

#### token.minLength: Number

The min length of the number.

#### token.maxLength: Number

The max length of the number.

#### token.min: Number

The min value of the number.

#### token.max: Number

The max value of the number. Currently TextParser doesn't check this property.

Following functions are used to manipulate model value.
	
#### token.extract(model) => value, required

A function that can extract node value from the model. It is used when converting model value to string.

#### token.add(model, diff) => model, required

A function that can add node value to the model.

#### token.restore(model, nodeValue) => model, required

A function that can restore node value to the model.

### InputMask

InputMask is built on top of an input element and a TextParser. It will handle most of the HTML stuff. Like listen to events, track current node under the cursor.

After the mask is applied, user can only edit partial text that is not defined as "static". The user can also use left/right arrow keys or tab to navigate between each non-static node. Use up/down arrow keys to increase/decrease node value. If it is a "select" node, it will act like a typeahead component. If the user tried to delete the node, it will be replaced by a placeholder.

#### constructor(element: Element, textParser, separators = "")

Arguments:

* element - An Element object follows [Element interface](#element-interface).
* textParser - A parser object.
* separators - Apart from tab key, add other keys that can navigate through nodes.

#### InputMask.digest(node: Node, text: String, fixError: Boolean)

Main parsing loop. The mask will try to parse the text, if there are any errors, it will try to fix it and parse it again.

Arguments:

* node - can be null

	If node is null, digest will parse text as `textParser.parse(text)`.
	If node is a Node, digest will parse text as `node.parse(text)`.

* text

	The text to parse.

* fixError - default to false

	If fixError is true, digest will try hardest to fix the error, even revert back the text to previous state.

	If fixError is false, digest will fix those fatal error, but leaves `NUMBER_TOOSHORT`, `LEADING_ZERO`...

#### InputMask.on(eventType: String, callback: Function)

Register a handler to inputMask. Currently, there is only a `update` event that will fire when the model value is updated.

### Element interface

The Element interface wraps native input element and exposes some methods similar to jQuery.

#### IElement.on(eventType: String, callback: Function)

Wrap addEventListener. InputMask will listen to `input` event for text update, you might want to proxy it for cross browser compatibility.

#### IElement.getSelection() => Range object

Range object has two properties, start and end, showing the current state of the selection.

#### IElement.setSelection(start: Number, end: Number)

Set selection on the input. You might need to check if the input is active or some browsers will try to focus the input when selection changed.

#### IElement.val([text: String])

Set/get the value of the input. Like jQuery.
	
Changelog
---------
* Next
	- First release.
