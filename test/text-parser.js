var {describe, it} = require("mocha"),
	assert = require("assert"),
	{TextParser} = require("../lib/text-parser");
	
describe("TextParser", () => {
	function prepare(options) {
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
	
	it("basic", () => {
		var parser = prepare();
		
		parser.parse("192.168.0.1");
		assert.deepEqual(parser.getValue(), [192, 168, 0, 1]);
		
		parser.setValue([140, 112, 172, 1]);
		assert.equal(parser.getText(), "140.112.172.1");
	});
	
	it("placeholder", () => {
		var parser = prepare();
		
		assert.throws(
			() => parser.parse("___.0.0.1"),
			err => err.code == "NOT_INIT"
		);
	});
	
	it("zero-length placeholder", () => {
		var parser = prepare({placeholder: ""});
		
		assert.throws(
			() => parser.parse(".0.0.1"),
			err => err.code == "NOT_INIT"
		);
	});
});
