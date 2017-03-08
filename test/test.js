var assert = require("assert"),
	{describe, it} = require("mocha"),
	{TextParser, InputMask, utils: {Emitter}} = require("../index");
	
function createTextParser(options) {
	function num(i) {
		return Object.assign({
			type: "number",
			minLength: 1,
			maxLength: 3,
			max: 256,
			min: 0,
			placeholder: "___",
			extract: o => o[i],
			restore: (o, v) => o[i] = v,
			add: (o, d) => o[i] += d
		}, options);
	}
	
	function dot() {
		return {
			type: "static",
			value: "."
		};
	}
	
	return new TextParser({
		tokens: [num(0), dot(), num(1), dot(), num(2), dot(), num(3)],
		value: [0, 0, 0, 0],
		copyValue: o => o.slice()
	});
}

class Element extends Emitter {
	constructor() {
		super();
		this.value = "";
		this.range = {
			start: 0,
			end: 0
		};
	}
	val(text) {
		if (text == undefined) {
			return this.value;
		}
		this.value = text;
		return this;
	}
	getSelection() {
		return this.range;
	}
	setSelection(start, end) {
		this.range.start = start;
		this.range.end = end;
	}
}

describe("TextParser", () => {
	
	it("basic", () => {
		var parser = createTextParser();
		
		parser.parse("192.168.0.1");
		assert.deepEqual(parser.getValue(), [192, 168, 0, 1]);
		
		parser.setValue([140, 112, 172, 1]);
		assert.equal(parser.getText(), "140.112.172.1");
	});
	
	it("placeholder", () => {
		var parser = createTextParser();
		
		assert.throws(
			() => parser.parse("___.0.0.1"),
			err => err.code == "NOT_INIT"
		);
	});
	
	it("zero-length placeholder", () => {
		var parser = createTextParser({placeholder: ""});
		
		assert.throws(
			() => parser.parse(".0.0.1"),
			err => err.code == "NOT_INIT"
		);
	});
});

describe("InputMask", () => {
	
	it("zero-length placeholder", () => {
		var parser = createTextParser({placeholder: ""}),
			element = new Element,
			mask = new InputMask(element, parser);
			
		function test(text, event, value) {
			return new Promise(resolve => {
				var handle = event == "change" ? parser : mask;
				handle.once(event, result => {
					if (event == "change") {
						assert.deepEqual(value, result);
					} else {
						assert.equal(result.code, value);
					}
					resolve();
				});
				element.value = text;
				element.emit("input");
			});
		}
			
		return test("192.168.0.1", "change", [192, 168, 0, 1]).then(
			() => test("...", "digest", "NOT_INIT")
		);
	});
});
