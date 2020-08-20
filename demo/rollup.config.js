import path from "path"

import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import svelte from "rollup-plugin-svelte"

const libLoader = () => ({
    resolveId: id => {
        if (id === "#lib") {
            return path.resolve("index.js")
        }
    }
})

export default {
    input: "demo/src/main.js",
    output: {
        file: "demo/demo.js",
        format: "iife",
        name: "demo",
    },
    plugins: [
        libLoader(),
        svelte({
            // dev: true,
        }),
        resolve(),
        commonjs(),
    ]
}
