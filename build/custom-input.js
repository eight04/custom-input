if (typeof angular == "object") {
	angular
		.module("custom-input", [])
		.factory("customInput", function() {
			return require("../index.js");
		});
} else {
	window.customInput = require("../index.js");
}
