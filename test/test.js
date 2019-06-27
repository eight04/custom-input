/* eslint-env mocha */

const assert = require("assert");
const Emitter = require("event-lite");
const sinon = require("sinon");
const {TextParser, InputMask} = require("..");

const number = i => ({
  type: "number",
  placeholder: "?",
  minLength: 1,
  maxLength: 1,
  extract: o => o[i],
  restore: (o, v) => o[i] = v,
  add: (o, d) => o[i] += d
});

const string = v => ({
  type: "static",
  value: v
});

function timeout(time = 0) {
  return new Promise(r => setTimeout(r, time));
}
	
function createTextParser(options) {
	function num(i) {
		return Object.assign({
			i: i,
			name: "num",
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
			name: "dot",
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
	
	it("getNodes with name", () => {
		var parser = createTextParser();
		
		assert.equal(parser.getNodes().length, 7);
		assert.equal(parser.getNodes("num").length, 4);
		assert.equal(parser.getNodes("dot").length, 3);
	});
	
	it("add/restore test", () => {
		var parser = createTextParser({
			restore(o, v, _parser) {
				assert.equal(_parser, parser);
				o[this.i] = v;
			},
			add(o, d, _parser) {
				assert.equal(_parser, parser);
				o[this.i] += d;
			}
		});
		parser.parse("192.168.0.1");
		parser.getNodes()[0].add(1);
	});
});

describe("InputMask", () => {
	it("work with zero-length placeholder", async () => {
		const parser = createTextParser({placeholder: ""});
    const element = new Element;
		const mask = new InputMask(element, parser);
    const onChange = sinon.fake();
    parser.on("change", onChange);
    const onDigest = sinon.fake();
    mask.on("digest", onDigest);
    
    element.val("192.168.0.1");
    element.emit("input");
    await timeout();
    assert.equal(onChange.callCount, 1);
    assert.deepStrictEqual(onChange.lastCall.args[0], [192, 168, 0, 1]);
			
    element.val("...");
    element.emit("input");
    await timeout();
    assert.equal(onDigest.callCount, 1);
    assert.equal(onDigest.lastCall.args[0].code, "NOT_INIT");
	});
  
  it("select next node when the current node is finished", async () => {
    const parser = new TextParser({
      tokens: [number(0), string("-"), number(1)],
      value: [0, 0],
      copyValue: o => o.slice()
    });
    const element = new Element;
    new InputMask(element, parser);
    
    element.val("1-0");
    element.setSelection(1, 1);
    element.emit("keypress", {keyCode: "1".charCodeAt(0)});
    element.emit("input");
    await timeout();
    assert.deepStrictEqual(element.getSelection(), {start: 2, end: 3});
  });
  
  it("select next node when the current node is finished (no static separator)", async () => {
    const parser = new TextParser({
      tokens: [number(0), number(1), number(2)],
      value: [0, 0, 0],
      copyValue: o => o.slice()
    });
    const element = new Element;
    new InputMask(element, parser);
    
    element.val("100");
    element.setSelection(1, 1);
    element.emit("keypress", {keyCode: "1".charCodeAt(0)});
    element.emit("input");
    await timeout();
    
    assert.deepStrictEqual(element.getSelection(), {start: 1, end: 2});
    
    element.val("120");
    element.setSelection(2, 2);
    element.emit("keypress", {keyCode: "2".charCodeAt(0)});
    element.emit("input");
    await timeout();
    
    assert.deepStrictEqual(element.getSelection(), {start: 2, end: 3});
  });
  
  it("display placeholder after delete", async () => {
    const parser = new TextParser({
      tokens: [number(0), number(1)],
      value: [0, 0],
      copyValue: o => o.slice()
    });
    const element = new Element;
    new InputMask(element, parser);
    
    element.val("12");
    element.setSelection(0, 0);
    element.emit("focus");
    await timeout();
    
    assert.deepStrictEqual(element.getSelection(), {start: 0, end: 1});
    
    element.emit("keydown", {keyCode: 46});
    element.val("2");
    element.setSelection(0, 0);
    element.emit("input");
    await timeout();
    
    element.emit("blur");
    await timeout();
    
    assert.equal(parser.getText(), "?2");
  });
});
