import path from "path"

import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import svelte from "rollup-plugin-svelte"

const rootPath = path.resolve(
    __dirname,
    ".."
)
const namedPaths = {
    "@core": path.resolve(rootPath, "index.js"),
    "@dialog": path.resolve(rootPath, "dialog.js"),
    "@layout": path.resolve(rootPath, "layout.js"),
    "@theme": path.resolve(rootPath, "theme.js"),
}

const libShortcut = {
    resolveId: (id) => namedPaths[id]
}

export default {
    input: "demo/src/main.js",
    output: {
        file: "demo/demo.js",
        format: "iife",
        name: "demo",
    },
    plugins: [
        libShortcut,
        svelte({
            emitCss: false,
        }),
        commonjs(),
        resolve(),
    ]
}
