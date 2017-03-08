var { num2str, Emitter } = require("./utils");

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
	var result = parseToken(text, token, pos);
	
	// check placeholder
	if (
		result.err &&
		token.type != "static" && text.startsWith(token.placeholder, pos) &&
		(result.err > 1 || result.viewValue.length <= token.placeholder.length)
	) {
		return {
			empty: true,
			viewValue: token.placeholder
		};
	}
	
	return result;
}

function parseToken(text, token, pos) {
	var m, match, value, j;

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
	var pos = 0, node, result = [], r;

	for (node of nodes) {
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
	var result = [], r, node;
	for (node of nodes) {
		r = formatNode(value, node.token);
		if (node.token.type != "static" && node.empty && !ignoreEmpty) {
			r.value = null;
			r.viewValue = node.token.placeholder;
		}
		result.push(r);
	}
	return result;
}

class Node {
	constructor (parser, token) {
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

	unset () {
		if (this.token.type == "static" || this.parser.noEmpty) {
			return;
		}
		this.empty = true;
		this.parser.setValue(this.parser.value, false);
	}

	parse (text, pos = 0) {
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
	}

	add (diff) {
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
	}
}

function addValue(o, tk, v) {
	if (typeof o == "object") {
		tk.add(o, v);
		return o;
	} else {
		return tk.add(o, v);
	}
}

function restoreValue(o, tk, v) {
	if (typeof o == "object") {
		tk.restore(o, v);
		return o;
	} else {
		return tk.restore(o, v);
	}
}

function createNodes(parser, tokens) {
	var tk, i, edit,
		nodes = [];

	for (tk of tokens) {
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
class TextParser extends Emitter {
	constructor() {
		super();
		this._constructor.apply(this, arguments);
		this.initialize();
	}
	
	_constructor ({tokens, noEmpty = false, value, text, copyValue = nocopy}) {
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
	}
	
	initialize() {
		this.setValue(this.value);
	}

	parse (text) {
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
		var changed = [], comparer;
		
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
		var empties = result.filter(r => r.empty),
			errors = result.filter(r => r.err);

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
		changed.sort((a, b) => {
			if (b.empty) {
				return -1;
			}
			if (a.empty) {
				return 1;
			}
			return (b.token.prior || 0) - (a.token.prior || 0);
		});

		// consistent check
		var c, value = this.copyValue(this.value);
		for (c of changed) {
			value = restoreValue(value, c.token, c.value);
		}

		var newText = formatNodes(value, result).map(r => r.viewValue).join("");
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

		this.emit("change", this.value);

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
	}

	setValue (value, ignoreEmpty = true) {
		// value => text
		var result = formatNodes(value, this.nodes, ignoreEmpty);
		var i, pos = 0, text = "";
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

		this.emit("change", this.value);

		return this;
	}

	isEmpty (text) {
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
	}

	isInit() {
		var node;
		for (node of this.nodes) {
			if (node.token.type != "static" && node.empty) {
				return false;
			}
		}
		return true;
	}

	unset() {
		var node;
		for (node of this.nodes) {
			node.empty = true;
		}
		this.setValue(this.value, false);

		return this;
	}

	getText() {
		return this.text;
	}

	getValue() {
		return this.value;
	}

	getNodes() {
		return this.nodes;
	}
}

module.exports = {
	TextParser
};
