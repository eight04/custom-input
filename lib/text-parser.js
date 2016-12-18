var { num2str } = require("./utils");

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
				viewValue: value
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

	// throw error
	var i;
	for (i = 0; i < result.length; i++) {
		if (result[i].err) {
			throw result[i];
		}
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
		this.empty = false;
		var value = addValue(this.parser.value, this.token, diff);
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
class TextParser {
	constructor ({tokens, noEmpty = false, value, text, copyValue = nocopy}) {
		if (!tokens || !tokens.length) {
			throw new Error("`tokens` is required");
		}
		this.tokens = tokens;
		this.nodes = createNodes(this, tokens);
		this.value = value;
		this.text = text;
		this.noEmpty = noEmpty;
		this.copyValue = copyValue;
		this.handler = {};
		
		this.setValue(value);
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
		
		result = parseNodes(this.nodes, text, this.value);
		
		// check emptiness
		var empties = result.filter(r => r.empty);
		if (empties.length && this.noEmpty) {
			throw {
				code: "NOT_INIT_FORBIDDEN",
				message: "Empty node is forbidden",
				text: text,
				node: empties[0]
			};
		}
		
		// grab changed nodes
		var changed = [];
		for (i = 0; i < result.length; i++) {
			if (!result[i].empty && result[i].viewValue != this.nodes[i].viewValue) {
				changed.push({
					token: this.nodes[i].token,
					result: result[i]
				});
			}
		}
		
		// apply change
		changed.sort((a, b) => {
			if (b.result.empty) {
				return -1;
			}
			if (a.result.empty) {
				return 1;
			}
			return (b.token.prior || 0) - (a.token.prior || 0);
		});
		
		var c, value = this.copyValue(this.value);
		for (c of changed) {
			value = restoreValue(value, c.token, c.result.value);
		}
		
		// Consistent check
		var newText = formatNodes(value, result).map(r => r.viewValue).join("");
		if (text != newText) {
			throw {
				code: "INCONSISTENT_INPUT",
				message: "Successfully parsed but the output text doesn't match the input",
				text: text,
				oldText: this.text,
				properText: newText
			};
		}
		
		// everything is ok, copy result value into nodes
		for (i = 0; i < result.length; i++) {
			this.nodes[i].value = result[i].value;
			this.nodes[i].viewValue = result[i].viewValue;
			this.nodes[i].offset = result[i].pos;
			this.nodes[i].empty = result[i].empty;
		}
		this.text = text;
		this.value = value;
		
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
	
	on(eventType, callback) {
		if (!this.handler[eventType]) {
			this.handler[eventType] = [];
		}
		this.handler[eventType].push(callback);
		return this;
	}
	
	off(eventType, callback) {
		if (!this.handler[eventType]) return;
		
		var i = this.handler.indexOf(callback);
		if (i < 0) return;
		this.handler[eventType].splice(i, 1);
		return this;
	}
	
	emit(eventType, value) {
		if (!this.handler[eventType]) return;
		for (callback of this.handler[eventType]) {
			try {
				callback(value);
			} catch (err) {
				console.error(err);
			}
		}
		return this;
	}
}

module.exports = {
	TextParser
};
