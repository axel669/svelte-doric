import path from "path"
import fs from "fs/promises"

import svelte from "rollup-plugin-svelte"
import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import del from "rollup-plugin-delete"
import html from "@axel669/rollup-html-input"

const rootPath = path.resolve(
    __dirname,
    "..",
    ".."
)
// const namedPaths = {
//     "@core": path.resolve(rootPath, "index.js")
// }

const libShortcut = {
    resolveId: (id, source) => {
        if (id === "@core") {
            return path.resolve(rootPath, "index.js")
        }

        if (id === "@docs") {
            return path.resolve(
                rootPath,
                "docs",
                `${path.basename(source, path.extname(source))}.md`
            )
        }

        if (id.endsWith("*") === true) {
            return path.resolve(
                path.dirname(source),
                id
            )
        }
    },
    load: async (id) => {
        if (id.endsWith(".md") === true) {
            const md = await fs.readFile(id, "utf8")
            return {
                code: `export default ${JSON.stringify(md)}`
            }
        }

        if (id.endsWith("*") === false) {
            return null
        }

        const dir = id.slice(0, -2)
        const files = await fs.readdir(dir)
        const code = files.map(
            (name) => {
                const fullName = JSON.stringify(path.resolve(dir, name))
                const exportName =
                    path.basename(name, path.extname(name))
                    .replace(/\-(\w)/g, (_, s) => s.toUpperCase())

                if (name.endsWith(".svelte") === true) {
                    // const exp = `${exportName.charAt(0).toUpperCase()}${exportName.slice(1)}`
                    return `export {default as ${exportName}} from ${fullName}`
                }

                return `export * as ${exportName} from ${fullName}`
            }
        ).join("\n")
        return { code }
    }
}

export default {
    input: "site/src/index.html",
    output: {
        file: `site/build/site-${Date.now()}.js`,
        format: "iife",
    },
    plugins: [
        libShortcut,
        html(),
        del({ targets: "site/build/*" }),
        svelte({
            emitCss: false,
        }),
        resolve(),
        commonjs(),
    ]
}
