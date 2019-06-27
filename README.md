Custom Input
============

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4e3a7cbd57cc4241950c12256c7cac34)](https://www.codacy.com/app/eight04/custom-input?utm_source=github.com&utm_medium=referral&utm_content=eight04/custom-input&utm_campaign=badger)

A library helping you create custom input elements in the browser. Add mask and validation to *input[text]*! Originally included in [angular-datetime](https://github.com/eight04/angular-datetime).

Installation
------------

Via npm:

```
npm install custom-input
```

```javascript
var {InputMask, TextParser} = require("custom-input");
```

There is also a pre-built dist which can be used in the browser:

```html
<!-- export cusomInput into global -->
<script src="https://unpkg.com/custom-input@0.3.1/dist/custom-input.js"></script>
```
```javascript
var {InputMask, TextParser} = customInput;
```

The pre-built dist is compatible with IE 8, but you have to polyfill missing APIs by including [@babel/polyfill](https://babeljs.io/docs/en/babel-polyfill).
	
Demo
----

A small example showing how it works:
https://rawgit.com/eight04/custom-input/master/demo.html

API reference
-------------

This module exports following members:

* `TextParser` - a parser which can parse text into model value.
* `InputMask` - bind a parser with an `input` element and create a nice input mask.
* `utils` - a set of utilities used by the library.

### TextParser

```js
new TextParser({
  tokens: Array<Token>,
  value: any,
  copyValue: value => clonedValue
})
  => parser
```

Create a stateful parser which can convert a model value to a string and vise versa. The parser uses a series of `Token` to construct a template. For example, the IP address: `xxx.xxx.xxx.xxx` can be represented with 7 tokens, which are *Number{1,3}*, *String "."*, *Number{1,3}*, *String "."*, *Number{1,3}*, *String "."*, *Number{1,3}*. The parser will try to parse text along the tokens, extract the value from text and store the value in the model.

* `tokens` is a list of [Token](#token).
* `value` is the initial model value.
* `copyValue` is a function which can clone the model.

#### parser.parse

```js
parser.parse(text: String) => parser
```

Parse a string and store the value in the parser.

This method returns the parser itself.

#### parser.setValue

```js
parser.setValue(value, preserveEmpty? = false) => parser
```

Set a new model value and format text according to the new value.

If `preserveEmpty` is `false`, parser will the reset empty flag of all nodes.

This method returns the parser itself.

#### parser.getValue

```js
parser.getValue() => value
```

Get the model value.

#### parser.getText

```js
parser.getText() => text: String
```

Get formatted text.

#### parser.isEmpty

```js
parser.isEmpty(text?: String) => Boolean
```

If `text` is supplied, parse the text without saving data and check if nodes contains empty node.

If some nodes are set, return `false`.

#### parser.isInit

```js
parser.isInit() => Boolean
```

If some nodes are empty, return `false`.

> **Note**: it is possible that `parser.isEmpty()` and `parser.isInit()` both returns `true`, which means all nodes are static.

#### parser.unset

```js
parser.unset() => parser
```

Unset every node. Mark them as empty.

#### parser.getNodes

```js
parser.getNodes(name?: String) => Array<Node>
```

Get a list of nodes. If `name` is provided, return the nodes having the same name.

#### parser events

* `change` - Emit when the model value is changed.

### Token

A token is an object that contains special information for parsing. Each token may represents a static string, a number, or a choice list.

#### Static token

```js
{
  type: "static",
  value: String
}
```

Set `type` to `"static"` to create a static token. It represent a static string.

`value` is the static string value.

#### Mutable token

Mutable tokens includes `number` token and `select` token. Some properties are shared with all types of mutable tokens:

```js
{
  name?: String,
  placeholder: String,
  prior?: Number,
  extract: (modelValue) => nodeValue,
  restore: (modelValue, nodeValue) => void,
  add: (modelValue, increment) => void
}
```

* `name` property should be used with `parser.getNodes()`. There is no need to set a name if you are not going to retrieve the node.

* `placeholder` is a string, which is displayed when the node is empty e.g. after calling `parser.unset()`.

* `prior` controls which node should be evaluated first. If there are two nodes whose value has been changed in the same time (via `parser.parse`), the node having higher prior will apply the change to the model first.

  Usually, it doesn't matter which node is evaluated first because the model value stores node values independently. But if you want to create a date string parser, you may have to decide the order carefully since each node will affect each other (e.g. the month may change when the day is changed/overflowed).
  
* `extract`, `restore`, and `add` are three hooks. The parser will call them when it want to perform corresponded operation to the model value.

  `nodeValue` is always a number. For `number` node, it is the node value. For `select` node, it is the index starting from 1.
  
  `increment` is an integer, can be negative.
  
##### number

```js
{
  type: "number",
  minLength?: Number,
  maxLength?: Number,
  min?: Number,
  max?: Number
}
```

* `minLength` and `maxLength` controls how the number should be represented. The formatter will zero-pad the value when the length is shorter than `minLength`, and will trim the text when the length is longer than `maxLength`.

* `min` and `max` controls the bounding of the number. You may want to set `min` to `0` so it won't become negative. It also affect the input mask. If the node value hits the limit, up/down arrow keys will be disabled.

##### select

```js
{
  type: "select",
  select: Array<option: String>
}
```

* `select` is a list of string that the text should match one of them.

  When converting text to model value, the parser will find the index of matched text, plus 1, then save it as node value (store it via the `restore` hook).


### InputMask

InputMask is built with an `<input>` element and a `TextParser`. It handles most of the HTML stuff like listening to events, tracking selection range of the input element, etc.

After the mask is applied, users can only edit part of the text that is not defined as "static". Users can also press left/right arrow keys or tab to navigate between each mutable node. Use up/down arrow keys to increase/decrease node value. If it is a "select" node, it will act like a typeahead component. If the user tries to delete the node, it will be replaced by the placeholder.

```js
new InputMask(element: Element, parser: TextParser, separators: String = "") => mask
```

* `element` is an object implementing [Element interface](#element-interface).
* `parser` is a parser object.
* `separators` - apart from tab key, add other keys that can navigate through nodes.

#### mask.digest

```js
mask.digest(node: Node | void, text: String, fixError?: Boolean = false)
```

The mask will try to parse the text. If an error occurs, try fixing it and parse it again.

* `node` - can be `null`

	If `node` is `null`, the mask will parse the text along with all nodes.
  
	If `node` is a node object, the mask will treat the text as the view value of the node.

* `text` is the text which should be parsed.

* `fixError`

	If `fixError` is `true`, the mask will try hardest to fix the error, even revert back the text to the previous state.

	If `fixError` is `false`, it will fix fatal errors, but leave `NUMBER_TOOSHORT`, `LEADING_ZERO`, etc.
	
#### mask events

* `digest` - emit when an digest error occurs. It may fire multiple times during one digest.

### Element interface

The Element interface wraps native input element and exposes some methods similar to jQuery.

#### Element.on

```js
Element.on(eventType: String, callback: (event) => void) => void
```

Wrap `addEventListener`. `InputMask` will listen to `input` event for text update, you might want to proxy it for cross browser compatibility.

`InputMask` uses following events:

* mousedown
* click
* focus
* input
* keydown
* keypress
* blur

#### Element.getSelection

```js
Element.getSelection() => Range | void
```

Get the current selection from the input element. Return `null` if the element is not focused/selected.


`Range` has following shape:

```js
{
  start: Number,
  end: Number
}
```

#### Element.setSelection

```js
Element.setSelection(start: Number, end: Number) => void
```

Set selection on the input. You may need to check if the input is active or some browsers will try to focus the input element when the selection changed.

#### Element.val

```js
Element.val() => String
Element.val(text: String) => void
```

Get or set the value of the input element. Like jQuery.
	
### utils

A set of utilities.

#### utils.num2str

```js
utils.num2str(number, minLength, maxLength) => String
```

Convert a number to a string. Pad the text with zero and trim the text if needed.
	
Changelog
---------

* 0.4.0 (Jun 27, 2019)

  - Some changes to `InputMask`:
  
    - **Breaking: deleting the entire node will reset the node now.**
    - **Breaking: prefer the node with lower index when finding the nearest node.**
    
  - Bump dependencies.

* 0.3.1 (Sep 17, 2017)

	- Fix: use unpkg field in package.json.
  
* 0.3.0 (Sep 17, 2017)

	- **Change: replace node's events with event-lite.**
  
* 0.2.1 (Jul 24, 2017)

	- Add `textParser` arg to `token.add` and `token.restore`.
	- Add `name` attribute to `Node`.
	- Add `name` arg to `TextParser.getNodes`.
  
* 0.2.0 (Mar 9, 2017)

	- Allow using empty string as placeholder
	- The "change" event of TextParser now sends model value to listener.
	- **Drop utils.Emitter. Use node's [events](https://nodejs.org/api/events.html).**
	- **Change the event name of InputMask: error -> digest.**
	- **Drop angular module, always use window.customInput.**
  
* 0.1.0 (Dec 19, 2016)

	- First release.
