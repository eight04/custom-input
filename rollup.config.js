import resolve from "rollup-plugin-node-resolve";
import cjs from "rollup-plugin-cjs-es";
import babel from "rollup-plugin-babel";
import {uglify} from "rollup-plugin-uglify";

export default {
	input: "index.js",
	output: {
		file: "dist/custom-input.js",
		format: "iife",
		name: "customInput"
	},
	plugins: [
		resolve(),
		cjs({nested: true}),
		babel(),
		uglify({
      ie8: true
    })
	]
};
