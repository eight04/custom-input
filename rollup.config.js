import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel from "rollup-plugin-babel";
import uglify from "rollup-plugin-uglify";

export default {
	input: "index.js",
	output: {
		file: "dist/custom-input.js",
		format: "iife",
		name: "customInput"
	},
	plugins: [
		resolve(),
		commonjs(),
		babel(),
		uglify()
	]
};
