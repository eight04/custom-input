module.exports = {
	num2str(num, minLength, maxLength) {
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
	Emitter: class {
		constructor() {
			this.handler = {};
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
			for (var callback of this.handler[eventType]) {
				try {
					callback(value);
				} catch (err) {
					console.error(err);
				}
			}
			return this;
		}
	}
};
