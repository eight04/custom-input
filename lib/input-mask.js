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

function findInputKey(a, b) {
	if (a.length >= b.length) {
		return;
	}
	var i, j, key;

	for (i = 0, j = 0; i < a.length && j < b.length; i++, j++) {
		if (a[i] == b[j]) continue;
		if (!key) {
			key = b[j];
			i--;
		} else {
			return;
		}
	}

	return key;
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
		var sel = this.el.getSelection(),
			node = findNearestNode(sel.start, this.nodes);
		this.select({
			node: node,
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
		
		var {start, end} = this.el.getSelection(),
			[left, right] = matchNodes(this.nodes, start, end);

		if (left.node == right.node) {
			this.range = {
				node: left.node,
				start: left.pos,
				end: right.pos
			};
		}
	}
	atNodeEnd(len) {
		if (!this.range.node) return;
		
		if (len == null) {
			len = this.range.node.token.maxLength || this.range.node.viewValue.length;
		}
		
		this.get();

		var start = this.range.start == "end" ? len : this.range.start,
			end = this.range.end == "end" ? len : this.range.end;

		return start == end && start == len;
	}
	atNodeStart(len) {
		if (!this.range.node) return;
		
		if (len == null) {
			len = this.range.node.viewValue.length;
		}
			
		this.get();

		var start = this.range.start == "end" ? len : this.range.start,
			end = this.range.end == "end" ? len : this.range.end;

		return start == end && start == 0;
	}
}

class InputMask {
	constructor(element, textParser, separators = "") {
		this.el = element;
		this.tp = textParser;
		this.separators = separators;
		this.handler = {};
		
		var nodes = textParser.getNodes().filter(n => n.token.type != "static");
		this.sel = new Selection(element, nodes);

		this.el.on("mousedown", () => {
			this.mousedown = true;
		});

		this.el.on("focus", e => {
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
					this.sel.range.node.add(1);
				}
				this.val(this.tp.getText());
				this.sel.select({
					start: 0,
					end: "end"
				});
				this.emit("update");
			} else if (e.keyCode == 40) {
				// Down
				e.preventDefault();
				this.sel.selectNearestNode();
				if (this.sel.range.node) {
					this.sel.range.node.add(-1);
				}
				this.val(this.tp.getText());
				this.sel.select({
					start: 0,
					end: "end"
				});
				this.emit("update");
			} else if (e.keyCode == 36 || e.keyCode == 35) {
				// Home or End
				setTimeout(() => this.sel.selectNearestNode());
			} else if (e.keyCode == 46) {
				// Del
				if (this.sel.atNodeEnd(this.errorViewLength())) {
					e.preventDefault();
					this.tryFixingError();
					this.sel.selectNext();
				}
			} else if (e.keyCode == 8) {
				// Backspace
				if (this.sel.atNodeStart(this.errorViewLength())) {
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
				if (this.sel.atNodeEnd()) {
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
	}
	errorViewLength() {
		if (this.err && this.err.viewValue != null) {
			return this.err.viewValue.length;
		}
		return undefined;
	}
	digest(node, text, fixErr) {
		var digest = 10,
			range;

		while (digest--) {
			this.err = null;
			try {
				if (node) {
					node.parse(text);
				} else {
					this.tp.parse(text);
				}
			} catch (err) {
				if (err.code == "NOT_INIT") {
					break;
				}
				// console.log(err);
				this.err = err;
				if (!fixErr && (err.code == "NUMBER_TOOSHORT" || err.code == "NUMBER_TOOSMALL" || err.code == "NUMBER_MISMATCH" || err.code == "SELECT_MISMATCH")) {
					// the user is still inputing
					break;
				}
				if (err.code == "LEADING_ZERO") {
					node = err.node;
					text = err.properValue;
					if (err.viewValue.length >= err.node.token.maxLength) {
						range = {
							node: node.nextEdit,
							start: 0,
							end: "end"
						};
					} else {
						range = null;
					}
				} else if (err.code == "SELECT_INCOMPLETE") {
					node = err.node;
					text = err.selected;
					this.sel.get();
					range = {
						end: "end"
					};
				} else if (err.properText) {
					node = null;
					text = err.properText;
					range = null;
				} else if (err.properValue) {
					node = err.node;
					text = err.properValue;
					range = null;
				} else {
					if (err.code == "EMPTY") {
						this.tp.unset();
					}
					if (err.node) {
						err.node.unset();
					}
					node = null;
					text = this.tp.getText();
					range = {
						start: 0,
						end: "end"
					};
				}
				continue;
			}
			break;
		}

		if (digest < 0) {
			throw "element mask crashed! Infinite loop?";
		}

		if (!range) {
			this.sel.get();
		}

		if (!this.err) {
			this.val(this.tp.getText());
		}

		this.sel.select(range);
		this.emit("update");
	}
	val(text) {
		this.el.val(text);
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
	on(name, callback) {
		if (!this.handler[name]) {
			this.handler[name] = [];
		}
		this.handler[name].push(callback);
	}
	emit(name, value) {
		if (!this.handler[name]) return;

		var callback;
		for (callback of this.handler[name]) {
			callback(value);
		}
	}
}

module.exports = {
	InputMask
};
