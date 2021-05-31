import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import svelte from "rollup-plugin-svelte"

export default {
    input: "demo/src/main.js",
    output: {
        file: "demo/demo.js",
        format: "iife",
        name: "demo",
    },
    plugins: [
        svelte({
            emitCss: false,
        }),
        commonjs(),
        resolve(),
    ]
}
