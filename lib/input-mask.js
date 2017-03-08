var {Emitter} = require("./utils");

function findNearestNode(i, nodes) {
	if (!nodes.length) return;

	var [left, right] = matchNodes(nodes, i).map(r => r.node);

	if (left == right) {
		return left;
	}

	if (i - left.offset - left.viewValue.length <= right.offset - i) {
		return left;
	}

	return right;
}

function matchNodes(nodes, start, end = start) {
	var node, left, right;

	for (node of nodes) {
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

class Selection {
	constructor(element, nodes) {
		this.el = element;
		this.nodes = nodes;
		this.range = {
			node: findNearestNode(0, this.nodes),
			start: 0,
			end: "end"
		};
	}
	selectNearestNode() {
		var range = this.el.getSelection();
		if (!range) return;
		
		this.select({
			node: findNearestNode(range.start, this.nodes),
			start: 0,
			end: "end"
		});
	}
	select(range) {
		range = Object.assign(this.range, range);
		if (range.node) {
			this.el.setSelection(
				range.node.offset + range.start,
				range.node.offset + (range.end == "end" ? range.node.viewValue.length : range.end)
			);
		}
	}
	hasNext() {
		if (this.range.node) {
			return this.range.node.nextEdit;
		}
	}
	hasPrev() {
		if (this.range.node) {
			return this.range.node.prevEdit;
		}
	}
	selectNext() {
		var node = this.hasNext(),
			range = {start: 0, end: "end"};
		if (node) {
			range.node = node;
		}
		this.select(range);
	}
	selectPrev() {
		var node = this.hasPrev(),
			range = {start: 0, end: "end"};
		if (node) {
			range.node = node;
		}
		this.select(range);
	}
	get() {
		if (!this.nodes.length) return;
		
		var range = this.el.getSelection();
		
		if (!range) return;

		var [left, right] = matchNodes(this.nodes, range.start, range.end);

		if (left.node == right.node) {
			this.range = {
				node: left.node,
				start: left.pos,
				end: right.pos
			};
		}
	}
	atNodeEnd() {
		if (!this.range.node) return;

		this.get();

		var len = this.range.node.viewValue.length,
			max = this.range.node.token.maxLength,
			start = this.range.start == "end" ? len : this.range.start,
			end = this.range.end == "end" ? len : this.range.end;

		return start == end && start == (max != null ? max : len) || !len;
	}
	atNodeStart() {
		if (!this.range.node) return;

		this.get();

		var len = this.range.node.viewValue.length,
			start = this.range.start == "end" ? len : this.range.start,
			end = this.range.end == "end" ? len : this.range.end;

		return start == end && start == 0;
	}
}

class InputMask extends Emitter {

	constructor() {
		super();
		this._constructor.apply(this, arguments);
		this.initialize();
	}

	_constructor(element, textParser, separators = "") {
		this.el = element;
		this.tp = textParser;
		this.separators = separators;
		this.sel = new Selection(element, textParser.getNodes().filter(n => n.token.type != "static"));
	}

	initialize() {
		this.el.on("mousedown", () => {
			this.mousedown = true;
		});

		this.el.on("focus", () => {
			if (this.mousedown) return;	// wait mouseup then decide range
			setTimeout(() => {
				this.sel.select({
					start: 0,
					end: "end"
				});
			});
		});

		this.el.on("click", () => {
			this.mousedown = false;
			this.sel.selectNearestNode();
		});

		this.el.on("input", () => {
			this.digest(null, this.el.val());
		});

		this.el.on("keydown", (e) => {
			if (e.altKey || e.ctrlKey) {
				return;
			}
			if (e.keyCode == 37 || e.keyCode == 9 && e.shiftKey && this.sel.hasPrev()) {
				// Left, Shift + Tab
				e.preventDefault();
				this.tryFixingError();
				this.sel.selectPrev();
			} else if (e.keyCode == 39 || e.keyCode == 9 && !e.shiftKey && this.sel.hasNext()) {
				// Right, Tab
				e.preventDefault();
				this.tryFixingError();
				this.sel.selectNext();
			} else if (e.keyCode == 38) {
				// Up
				e.preventDefault();
				this.sel.selectNearestNode();
				if (this.sel.range.node) {
					// this.err = null;
					this.sel.range.node.add(1);
				}
				this.val(this.tp.getText());
				this.sel.select({
					start: 0,
					end: "end"
				});
			} else if (e.keyCode == 40) {
				// Down
				e.preventDefault();
				this.sel.selectNearestNode();
				if (this.sel.range.node) {
					// this.err = null;
					this.sel.range.node.add(-1);
				}
				this.val(this.tp.getText());
				this.sel.select({
					start: 0,
					end: "end"
				});
			} else if (e.keyCode == 36 || e.keyCode == 35) {
				// Home or End
				setTimeout(() => this.sel.selectNearestNode());
			} else if (e.keyCode == 46) {
				// Del
				if (this.sel.atNodeEnd()) {
					e.preventDefault();
					this.tryFixingError();
					this.sel.selectNext();
				}
			} else if (e.keyCode == 8) {
				// Backspace
				if (this.sel.atNodeStart()) {
					e.preventDefault();
					this.tryFixingError();
					this.sel.selectPrev();
				}
			}
		});

		this.el.on("keypress", e => {
			var charCode = e.charCode == null ? e.keyCode : e.charCode,
				key = String.fromCharCode(charCode),
				separators = this.separators,
				node = this.sel.range.node;

			// check for separator only when there is a next node which is static string
			if (node && node.next && node.next.token.type == "static") {
				separators += node.next.viewValue[0];
			}

			if (separators.includes(key)) {
				e.preventDefault();
				this.tryFixingError();
				this.sel.selectNext();
				return;
			}

			setTimeout(() => {
				if (this.sel.atNodeEnd() && this.sel.range.node.viewValue) {
					this.tryFixingError();
					this.sel.selectNext();
				}
			});
		});

		this.el.on("blur", () => {
			setTimeout(() => {
				this.tryFixingError();
			});
		});

		this.tp.on("change", () => {
			if (!this.err && !this.inDigest) {
				this.val(this.tp.getText());
				this.sel.select();
			}
		});
		
		// Init value
		var text = this.el.val();
		if (text) {
			this.digest(null, text, true);
		} else {
			this.val(this.tp.getText());
		}
	}
	errorViewLength() {
		if (this.err && this.err.viewValue != null) {
			return this.err.viewValue.length;
		}
		return undefined;
	}
	val(text) {
		if (this.el.val() != text) {
			this.el.val(text);
		}
		this.err = null;
	}
	tryFixingError() {
		if (!this.err) return;

		if (this.err.properValue) {
			this.digest(this.err.node, this.err.properValue, true);

		} else if (this.err.node) {
			this.err.node.unset();
			this.digest(null, this.tp.getText());
		}
	}
	digest(node, text, fixErr) {
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
				this.emit("digest", err);
				
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
					range = {end: "end"};
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
					range = {start: 0, end: "end"};
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
			throw new Error(`InputMask.digest crashed! Infinite loop on ${text}`);
		}
	}
}

module.exports = {
	InputMask
};
