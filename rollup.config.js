import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";

export default {
	moduleName: "customInput",
	entry: "index.js",
	dest: "dist/custom-input.js",
	format: "iife",
	plugins: [nodeResolve(), commonjs(), babel()]
};
