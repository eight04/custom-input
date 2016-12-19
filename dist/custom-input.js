(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

if ((typeof angular === "undefined" ? "undefined" : _typeof(angular)) == "object") {
	angular.module("custom-input", []).factory("customInput", function () {
		return require("../index.js");
	});
} else {
	window.customInput = require("../index.js");
}

},{"../index.js":2}],2:[function(require,module,exports){
"use strict";

module.exports = {
	TextParser: require("./lib/text-parser").TextParser,
	InputMask: require("./lib/input-mask").InputMask,
	utils: require("./lib/utils")
};

},{"./lib/input-mask":3,"./lib/text-parser":4,"./lib/utils":5}],3:[function(require,module,exports){
"use strict";

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require("./utils"),
    Emitter = _require.Emitter;

function findNearestNode(i, nodes) {
	if (!nodes.length) return;

	var _matchNodes$map = matchNodes(nodes, i).map(function (r) {
		return r.node;
	}),
	    left = _matchNodes$map[0],
	    right = _matchNodes$map[1];

	if (left == right) {
		return left;
	}

	if (i - left.offset - left.viewValue.length <= right.offset - i) {
		return left;
	}

	return right;
}

function matchNodes(nodes, start) {
	var end = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : start;

	var node, left, right;

	for (var _iterator = nodes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
		if (_isArray) {
			if (_i >= _iterator.length) break;
			node = _iterator[_i++];
		} else {
			_i = _iterator.next();
			if (_i.done) break;
			node = _i.value;
		}

		if (node.offset <= start) {
			left = {
				node: node,
				pos: start - node.offset
			};
		}
		if (node.offset + node.viewValue.length >= end && !right) {
			right = {
				node: node,
				pos: end - node.offset
			};
		}
	}

	if (!right) {
		var last = nodes[nodes.length - 1];
		right = {
			node: last,
			pos: last.viewValue.length
		};
	}

	if (!left) {
		var first = nodes[0];
		left = {
			node: first,
			pos: 0
		};
	}

	if (left.pos > left.node.viewValue.length) {
		left.pos = left.node.viewValue.length;
	}

	return [left, right];
}

var Selection = function () {
	function Selection(element, nodes) {
		_classCallCheck(this, Selection);

		this.el = element;
		this.nodes = nodes;
		this.range = {
			node: findNearestNode(0, this.nodes),
			start: 0,
			end: "end"
		};
	}

	Selection.prototype.selectNearestNode = function selectNearestNode() {
		var range = this.el.getSelection();
		if (!range) return;

		this.select({
			node: findNearestNode(range.start, this.nodes),
			start: 0,
			end: "end"
		});
	};

	Selection.prototype.select = function select(range) {
		range = Object.assign(this.range, range);
		if (range.node) {
			this.el.setSelection(range.node.offset + range.start, range.node.offset + (range.end == "end" ? range.node.viewValue.length : range.end));
		}
	};

	Selection.prototype.hasNext = function hasNext() {
		if (this.range.node) {
			return this.range.node.nextEdit;
		}
	};

	Selection.prototype.hasPrev = function hasPrev() {
		if (this.range.node) {
			return this.range.node.prevEdit;
		}
	};

	Selection.prototype.selectNext = function selectNext() {
		var node = this.hasNext(),
		    range = { start: 0, end: "end" };
		if (node) {
			range.node = node;
		}
		this.select(range);
	};

	Selection.prototype.selectPrev = function selectPrev() {
		var node = this.hasPrev(),
		    range = { start: 0, end: "end" };
		if (node) {
			range.node = node;
		}
		this.select(range);
	};

	Selection.prototype.get = function get() {
		if (!this.nodes.length) return;

		var range = this.el.getSelection();

		if (!range) return;

		var _matchNodes = matchNodes(this.nodes, range.start, range.end),
		    left = _matchNodes[0],
		    right = _matchNodes[1];

		if (left.node == right.node) {
			this.range = {
				node: left.node,
				start: left.pos,
				end: right.pos
			};
		}
	};

	Selection.prototype.atNodeEnd = function atNodeEnd() {
		if (!this.range.node) return;

		this.get();

		var len = this.range.node.viewValue.length,
		    max = this.range.node.token.maxLength,
		    start = this.range.start == "end" ? len : this.range.start,
		    end = this.range.end == "end" ? len : this.range.end;

		return start == end && start == (max != null ? max : len) || !len;
	};

	Selection.prototype.atNodeStart = function atNodeStart() {
		if (!this.range.node) return;

		this.get();

		var len = this.range.node.viewValue.length,
		    start = this.range.start == "end" ? len : this.range.start,
		    end = this.range.end == "end" ? len : this.range.end;

		return start == end && start == 0;
	};

	return Selection;
}();

var InputMask = function (_Emitter) {
	_inherits(InputMask, _Emitter);

	function InputMask() {
		_classCallCheck(this, InputMask);

		var _this = _possibleConstructorReturn(this, _Emitter.call(this));

		_this._constructor.apply(_this, arguments);
		_this.initialize();
		return _this;
	}

	InputMask.prototype._constructor = function _constructor(element, textParser) {
		var separators = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";

		this.el = element;
		this.tp = textParser;
		this.separators = separators;
		this.sel = new Selection(element, textParser.getNodes().filter(function (n) {
			return n.token.type != "static";
		}));
	};

	InputMask.prototype.initialize = function initialize() {
		var _this2 = this;

		this.el.on("mousedown", function () {
			_this2.mousedown = true;
		});

		this.el.on("focus", function () {
			if (_this2.mousedown) return; // wait mouseup then decide range
			setTimeout(function () {
				_this2.sel.select({
					start: 0,
					end: "end"
				});
			});
		});

		this.el.on("click", function () {
			_this2.mousedown = false;
			_this2.sel.selectNearestNode();
		});

		this.el.on("input", function () {
			_this2.digest(null, _this2.el.val());
		});

		this.el.on("keydown", function (e) {
			if (e.altKey || e.ctrlKey) {
				return;
			}
			if (e.keyCode == 37 || e.keyCode == 9 && e.shiftKey && _this2.sel.hasPrev()) {
				// Left, Shift + Tab
				e.preventDefault();
				_this2.tryFixingError();
				_this2.sel.selectPrev();
			} else if (e.keyCode == 39 || e.keyCode == 9 && !e.shiftKey && _this2.sel.hasNext()) {
				// Right, Tab
				e.preventDefault();
				_this2.tryFixingError();
				_this2.sel.selectNext();
			} else if (e.keyCode == 38) {
				// Up
				e.preventDefault();
				_this2.sel.selectNearestNode();
				if (_this2.sel.range.node) {
					// this.err = null;
					_this2.sel.range.node.add(1);
				}
				_this2.val(_this2.tp.getText());
				_this2.sel.select({
					start: 0,
					end: "end"
				});
			} else if (e.keyCode == 40) {
				// Down
				e.preventDefault();
				_this2.sel.selectNearestNode();
				if (_this2.sel.range.node) {
					// this.err = null;
					_this2.sel.range.node.add(-1);
				}
				_this2.val(_this2.tp.getText());
				_this2.sel.select({
					start: 0,
					end: "end"
				});
			} else if (e.keyCode == 36 || e.keyCode == 35) {
				// Home or End
				setTimeout(function () {
					return _this2.sel.selectNearestNode();
				});
			} else if (e.keyCode == 46) {
				// Del
				if (_this2.sel.atNodeEnd()) {
					e.preventDefault();
					_this2.tryFixingError();
					_this2.sel.selectNext();
				}
			} else if (e.keyCode == 8) {
				// Backspace
				if (_this2.sel.atNodeStart()) {
					e.preventDefault();
					_this2.tryFixingError();
					_this2.sel.selectPrev();
				}
			}
		});

		this.el.on("keypress", function (e) {
			var charCode = e.charCode == null ? e.keyCode : e.charCode,
			    key = String.fromCharCode(charCode),
			    separators = _this2.separators,
			    node = _this2.sel.range.node;

			// check for separator only when there is a next node which is static string
			if (node && node.next && node.next.token.type == "static") {
				separators += node.next.viewValue[0];
			}

			if (separators.includes(key)) {
				e.preventDefault();
				_this2.tryFixingError();
				_this2.sel.selectNext();
				return;
			}

			setTimeout(function () {
				if (_this2.sel.atNodeEnd() && _this2.sel.range.node.viewValue) {
					_this2.tryFixingError();
					_this2.sel.selectNext();
				}
			});
		});

		this.el.on("blur", function () {
			setTimeout(function () {
				_this2.tryFixingError();
			});
		});

		this.tp.on("change", function () {
			if (!_this2.err && !_this2.inDigest) {
				_this2.val(_this2.tp.getText());
				_this2.sel.select();
			}
		});

		// Init value
		var text = this.el.val();
		if (text) {
			this.digest(null, text, true);
		} else {
			this.val(this.tp.getText());
		}
	};

	InputMask.prototype.errorViewLength = function errorViewLength() {
		if (this.err && this.err.viewValue != null) {
			return this.err.viewValue.length;
		}
		return undefined;
	};

	InputMask.prototype.val = function val(text) {
		if (this.el.val() != text) {
			this.el.val(text);
		}
		this.err = null;
	};

	InputMask.prototype.tryFixingError = function tryFixingError() {
		if (!this.err) return;

		if (this.err.properValue) {
			this.digest(this.err.node, this.err.properValue, true);
		} else if (this.err.node) {
			this.err.node.unset();
			this.digest(null, this.tp.getText());
		}
	};

	InputMask.prototype.digest = function digest(node, text, fixErr) {
		var digest = 10,
		    range;

		this.inDigest = true;

		while (digest--) {
			this.err = null;
			try {
				if (node) {
					node.parse(text);
				} else {
					this.tp.parse(text);
				}
			} catch (err) {
				this.emit("error", err);

				this.sel.get();

				if (err.code == "NOT_INIT") {
					break;
				}

				this.err = err;

				if (!fixErr && (err.code == "NUMBER_TOOSHORT" || err.code == "NUMBER_TOOSMALL" || err.code == "NUMBER_MISMATCH" || err.code == "SELECT_MISMATCH" || err.code == "LEADING_ZERO")) {
					break;
				}

				if (err.code == "SELECT_INCOMPLETE") {
					node = err.node;
					text = err.selected;
					range = { end: "end" };
					continue;
				}

				if (err.properValue != null) {
					node = err.node;
					text = err.properValue;
				} else if (err.properText != null) {
					node = null;
					text = err.properText;
				} else {
					if (err.code == "EMPTY") {
						this.tp.unset();
					}
					if (err.node) {
						err.node.unset();
					}
					node = null;
					text = this.tp.getText();
					range = { start: 0, end: "end" };
				}
				continue;
			}
			break;
		}

		if (!this.err) {
			this.val(this.tp.getText());
			if (digest < 9) {
				this.sel.select(range);
			}
		}

		this.inDigest = false;

		if (digest < 0) {
			throw new Error("InputMask.digest crashed! Infinite loop on " + text);
		}
	};

	return InputMask;
}(Emitter);

module.exports = {
	InputMask: InputMask
};

},{"./utils":5}],4:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = require("./utils"),
    num2str = _require.num2str,
    Emitter = _require.Emitter;

function getMatch(str, pos, pattern) {
	var i = 0,
	    strQ = str.toUpperCase(),
	    patternQ = pattern.toUpperCase();

	while (strQ[pos + i] && strQ[pos + i] == patternQ[i]) {
		i++;
	}

	return str.substr(pos, i);
}

function getInteger(str, pos) {
	str = str.substring(pos);
	var match = str.match(/^\d+/);
	return match && match[0];
}

function parseNode(text, token, pos) {
	var m, match, value, j;

	if (token.type != "static" && text.startsWith(token.placeholder, pos)) {
		return {
			empty: true,
			viewValue: token.placeholder
		};
	}

	if (token.type == "static") {
		if (!text.startsWith(token.value, pos)) {
			return {
				err: 2,
				code: "TEXT_MISMATCH",
				message: "Pattern value mismatch"
			};
		}
		return {
			viewValue: token.value
		};
	}

	if (token.type == "number") {
		value = getInteger(text, pos);

		if (value == null) {
			return {
				err: 1,
				code: "NUMBER_MISMATCH",
				message: "Invalid number",
				viewValue: ""
			};
		}

		if (value.length < token.minLength) {
			return {
				err: 1,
				code: "NUMBER_TOOSHORT",
				message: "The length of number is too short",
				value: +value,
				viewValue: value,
				properValue: num2str(+value, token.minLength, token.maxLength)
			};
		}

		if (value.length > token.maxLength) {
			value = value.substr(0, token.maxLength);
		}

		if (+value < token.min) {
			return {
				err: 1,
				code: "NUMBER_TOOSMALL",
				message: "The number is too small",
				value: +value,
				viewValue: value,
				properValue: num2str(token.min, token.minLength, token.maxLength)
			};
		}

		if (value.length > token.minLength && value[0] == "0") {
			return {
				err: 1,
				code: "LEADING_ZERO",
				message: "The number has too many leading zero",
				value: +value,
				viewValue: value,
				properValue: num2str(+value, token.minLength, token.maxLength)
			};
		}

		if (+value > token.max) {
			return {
				err: 1,
				code: "NUMBER_TOOLARGE",
				message: "The number is too large",
				value: +value,
				viewValue: value,
				properValue: num2str(token.max, token.minLength, token.maxLength)
			};
		}

		return {
			value: +value,
			viewValue: value
		};
	}

	if (token.type == "select") {
		match = "";
		for (j = 0; j < token.select.length; j++) {
			m = getMatch(text, pos, token.select[j]);
			if (m && m.length > match.length) {
				value = j;
				match = m;
			}
		}
		if (!match) {
			return {
				err: 1,
				code: "SELECT_MISMATCH",
				message: "Invalid select",
				viewValue: ""
			};
		}

		if (match != token.select[value]) {
			return {
				err: 1,
				code: "SELECT_INCOMPLETE",
				message: "Incomplete select",
				value: value + 1,
				viewValue: match,
				selected: token.select[value]
			};
		}

		return {
			value: value + 1,
			viewValue: match
		};
	}

	throw "Unknown token type: " + token.type;
}

function parseNodes(nodes, text) {
	var pos = 0,
	    node,
	    result = [],
	    r;

	for (var _iterator = nodes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
		if (_isArray) {
			if (_i >= _iterator.length) break;
			node = _iterator[_i++];
		} else {
			_i = _iterator.next();
			if (_i.done) break;
			node = _i.value;
		}

		r = parseNode(text, node.token, pos);
		r.node = node;
		r.pos = pos;
		r.token = node.token;
		if (r.err >= 2) {
			r.text = text;
			throw r;
		}
		pos += r.viewValue.length;
		result.push(r);
	}

	// throw TEXT_TOOLONG error
	var last = result[result.length - 1];
	if (last.pos + last.viewValue.length < text.length) {
		throw {
			code: "TEXT_TOOLONG",
			message: "Text is too long",
			text: text
		};
	}

	return result;
}

function formatNode(value, token) {
	if (token.type == "static") {
		return {
			viewValue: token.value
		};
	}
	var v = token.extract(value);
	if (token.type == "number") {
		return {
			value: v,
			viewValue: num2str(v, token.minLength, token.maxLength)
		};
	}
	if (token.type == "select") {
		return {
			value: v,
			viewValue: token.select[v - 1]
		};
	}
	throw "Unknown type to format: " + token.type;
}

function formatNodes(value, nodes, ignoreEmpty) {
	var result = [],
	    r,
	    node;
	for (var _iterator2 = nodes, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
		if (_isArray2) {
			if (_i2 >= _iterator2.length) break;
			node = _iterator2[_i2++];
		} else {
			_i2 = _iterator2.next();
			if (_i2.done) break;
			node = _i2.value;
		}

		r = formatNode(value, node.token);
		if (node.token.type != "static" && node.empty && !ignoreEmpty) {
			r.value = null;
			r.viewValue = node.token.placeholder;
		}
		result.push(r);
	}
	return result;
}

var Node = function () {
	function Node(parser, token) {
		_classCallCheck(this, Node);

		this.parser = parser;
		this.token = token;
		this.value = null;
		this.viewValue = token.value;
		this.offset = 0;
		this.next = null;
		this.prev = null;
		this.nextEdit = null;
		this.prevEdit = null;
		this.empty = true;
	}

	Node.prototype.unset = function unset() {
		if (this.token.type == "static" || this.parser.noEmpty) {
			return;
		}
		this.empty = true;
		this.parser.setValue(this.parser.value, false);
	};

	Node.prototype.parse = function parse(text) {
		var pos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

		var result = parseNode(text, this.token, pos);
		if (result.err) {
			result.node = this;
			result.token = this.token;
			throw result;
		}

		if (this.parser.noEmpty && result.empty) {
			throw {
				code: "NOT_INIT_FORBIDDEN",
				message: "Empty node is forbidden",
				node: this
			};
		}

		if (result.empty) {
			this.unset();
			return;
		}

		this.empty = false;

		var value = restoreValue(this.parser.copyValue(this.parser.value), this.token, result.value);
		this.parser.setValue(value, false);
	};

	Node.prototype.add = function add(diff) {
		var value = this.parser.copyValue(this.parser.value),
		    nodeValue;

		this.empty = false;

		value = addValue(value, this.token, diff);
		nodeValue = this.token.extract(value);

		// min/max check
		var min, max;
		if (this.token.type == "number") {
			min = this.token.min;
			max = this.token.max;
		} else if (this.token.type == "select") {
			min = 1;
			max = this.token.select.length;
		}

		if (nodeValue < min) {
			value = restoreValue(value, this.token, min);
		}
		if (nodeValue > max) {
			value = restoreValue(value, this.token, max);
		}

		this.parser.setValue(value, false);
	};

	return Node;
}();

function addValue(o, tk, v) {
	if ((typeof o === "undefined" ? "undefined" : _typeof(o)) == "object") {
		tk.add(o, v);
		return o;
	} else {
		return tk.add(o, v);
	}
}

function restoreValue(o, tk, v) {
	if ((typeof o === "undefined" ? "undefined" : _typeof(o)) == "object") {
		tk.restore(o, v);
		return o;
	} else {
		return tk.restore(o, v);
	}
}

function createNodes(parser, tokens) {
	var tk,
	    i,
	    edit,
	    nodes = [];

	for (var _iterator3 = tokens, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
		if (_isArray3) {
			if (_i3 >= _iterator3.length) break;
			tk = _iterator3[_i3++];
		} else {
			_i3 = _iterator3.next();
			if (_i3.done) break;
			tk = _i3.value;
		}

		nodes.push(new Node(parser, tk));
	}
	// Build relationship between nodes
	for (i = 0; i < nodes.length; i++) {
		nodes[i].next = nodes[i + 1] || null;
		nodes[i].prev = nodes[i - 1] || null;
	}

	edit = null;
	for (i = 0; i < nodes.length; i++) {
		nodes[i].prevEdit = edit;
		if (nodes[i].token.type != "static") {
			edit = nodes[i];
		}
	}

	edit = null;
	for (i = nodes.length - 1; i >= 0; i--) {
		nodes[i].nextEdit = edit;
		if (nodes[i].token.type != "static") {
			edit = nodes[i];
		}
	}

	return nodes;
}

function nocopy(o) {
	return o;
}

// a stated text parser

var TextParser = function (_Emitter) {
	_inherits(TextParser, _Emitter);

	function TextParser() {
		_classCallCheck(this, TextParser);

		var _this = _possibleConstructorReturn(this, _Emitter.call(this));

		_this._constructor.apply(_this, arguments);
		_this.initialize();
		return _this;
	}

	TextParser.prototype._constructor = function _constructor(_ref) {
		var tokens = _ref.tokens,
		    _ref$noEmpty = _ref.noEmpty,
		    noEmpty = _ref$noEmpty === undefined ? false : _ref$noEmpty,
		    value = _ref.value,
		    text = _ref.text,
		    _ref$copyValue = _ref.copyValue,
		    copyValue = _ref$copyValue === undefined ? nocopy : _ref$copyValue;

		if (!tokens || !tokens.length) {
			throw new Error("option.tokens is required");
		}
		this.tokens = tokens;
		this.nodes = createNodes(this, tokens);
		this.value = value;
		this.text = text;
		this.noEmpty = noEmpty;
		this.copyValue = copyValue;
		this.err = false;
	};

	TextParser.prototype.initialize = function initialize() {
		this.setValue(this.value);
	};

	TextParser.prototype.parse = function parse(text) {
		if (!text) {
			throw {
				code: "EMPTY",
				message: "The input is empty",
				oldText: this.text
			};
		}

		var result, i;

		result = parseNodes(this.nodes, text);

		// grab changed nodes
		var changed = [],
		    comparer;

		if (this.err) {
			comparer = parseNodes(this.nodes, this.text);
		} else {
			comparer = this.nodes;
		}

		for (i = 0; i < result.length; i++) {
			if (!result[i].empty && result[i].viewValue != comparer[i].viewValue) {
				// expose token for sorting and consistent check
				result[i].token = this.nodes[i].token;
				changed.push(result[i]);
			}
		}

		// grab empty nodes
		var empties = result.filter(function (r) {
			return r.empty;
		}),
		    errors = result.filter(function (r) {
			return r.err;
		});

		// copy result value into nodes
		for (i = 0; i < result.length; i++) {
			this.nodes[i].value = result[i].value;
			this.nodes[i].viewValue = result[i].viewValue;
			this.nodes[i].offset = result[i].pos;
			this.nodes[i].empty = result[i].empty;
		}

		// throw error
		if (errors.length) {
			this.err = true;
			throw errors[0];
		} else {
			this.err = false;
		}

		// sort result
		changed.sort(function (a, b) {
			if (b.empty) {
				return -1;
			}
			if (a.empty) {
				return 1;
			}
			return (b.token.prior || 0) - (a.token.prior || 0);
		});

		// consistent check
		var c,
		    value = this.copyValue(this.value);
		for (var _iterator4 = changed, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
			if (_isArray4) {
				if (_i4 >= _iterator4.length) break;
				c = _iterator4[_i4++];
			} else {
				_i4 = _iterator4.next();
				if (_i4.done) break;
				c = _i4.value;
			}

			value = restoreValue(value, c.token, c.value);
		}

		var newText = formatNodes(value, result).map(function (r) {
			return r.viewValue;
		}).join("");
		if (text != newText) {
			this.err = true;
			throw {
				code: "INCONSISTENT_INPUT",
				message: "Successfully parsed but the output text doesn't match the input",
				text: text,
				oldText: this.text,
				properText: newText
			};
		}

		// Done. Manipulate value and text
		this.text = text;
		this.value = value;

		this.emit("change");

		// throw not_init error
		if (empties.length) {
			throw {
				code: "NOT_INIT",
				message: "Some nodes are empty",
				text: text,
				node: empties[0]
			};
		}

		return this;
	};

	TextParser.prototype.setValue = function setValue(value) {
		var ignoreEmpty = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

		// value => text
		var result = formatNodes(value, this.nodes, ignoreEmpty);
		var i,
		    pos = 0,
		    text = "";
		for (i = 0; i < result.length; i++) {
			this.nodes[i].value = result[i].value;
			this.nodes[i].viewValue = result[i].viewValue;
			this.nodes[i].offset = pos;
			this.nodes[i].empty = ignoreEmpty ? false : this.nodes[i].empty;
			pos += this.nodes[i].viewValue.length;
			text += this.nodes[i].viewValue;
		}
		this.value = value;
		this.text = text;

		this.emit("change");

		return this;
	};

	TextParser.prototype.isEmpty = function isEmpty(text) {
		var result;
		if (text) {
			try {
				result = parseNodes(this.nodes, text);
			} catch (err) {
				return false;
			}
		} else {
			result = this.nodes;
		}
		var i;
		for (i = 0; i < result.length; i++) {
			if (this.nodes[i].token.type != "static" && !result[i].empty) {
				return false;
			}
		}
		return true;
	};

	TextParser.prototype.isInit = function isInit() {
		var node;
		for (var _iterator5 = this.nodes, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
			if (_isArray5) {
				if (_i5 >= _iterator5.length) break;
				node = _iterator5[_i5++];
			} else {
				_i5 = _iterator5.next();
				if (_i5.done) break;
				node = _i5.value;
			}

			if (node.token.type != "static" && node.empty) {
				return false;
			}
		}
		return true;
	};

	TextParser.prototype.unset = function unset() {
		var node;
		for (var _iterator6 = this.nodes, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
			if (_isArray6) {
				if (_i6 >= _iterator6.length) break;
				node = _iterator6[_i6++];
			} else {
				_i6 = _iterator6.next();
				if (_i6.done) break;
				node = _i6.value;
			}

			node.empty = true;
		}
		this.setValue(this.value, false);

		return this;
	};

	TextParser.prototype.getText = function getText() {
		return this.text;
	};

	TextParser.prototype.getValue = function getValue() {
		return this.value;
	};

	TextParser.prototype.getNodes = function getNodes() {
		return this.nodes;
	};

	return TextParser;
}(Emitter);

module.exports = {
	TextParser: TextParser
};

},{"./utils":5}],5:[function(require,module,exports){
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

module.exports = {
	num2str: function num2str(num, minLength, maxLength) {
		var i;
		num = "" + num;
		if (num.length > maxLength) {
			num = num.substr(num.length - maxLength);
		} else if (num.length < minLength) {
			for (i = num.length; i < minLength; i++) {
				num = "0" + num;
			}
		}
		return num;
	},

	Emitter: function () {
		function Emitter() {
			_classCallCheck(this, Emitter);

			this.handler = {};
		}

		Emitter.prototype.on = function on(eventType, callback) {
			if (!this.handler[eventType]) {
				this.handler[eventType] = [];
			}
			this.handler[eventType].push(callback);
			return this;
		};

		Emitter.prototype.off = function off(eventType, callback) {
			if (!this.handler[eventType]) return;

			var i = this.handler.indexOf(callback);
			if (i < 0) return;
			this.handler[eventType].splice(i, 1);
			return this;
		};

		Emitter.prototype.emit = function emit(eventType, value) {
			if (!this.handler[eventType]) return;
			for (var _iterator = this.handler[eventType], _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
				var _ref;

				if (_isArray) {
					if (_i >= _iterator.length) break;
					_ref = _iterator[_i++];
				} else {
					_i = _iterator.next();
					if (_i.done) break;
					_ref = _i.value;
				}

				var callback = _ref;

				try {
					callback(value);
				} catch (err) {
					console.error(err);
				}
			}
			return this;
		};

		return Emitter;
	}()
};

},{}]},{},[1]);
