import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import svelte from "rollup-plugin-svelte"

import fs from "fs"
import path from "path"

const componentLoader = component => {
    const htmlTemplate = fs.readFileSync("demo/src/index.template.html")
    return {
        load: id => {
            if (id.endsWith("app.svelte")) {
                const file = fs.readFileSync(id).toString()
                return file.replace("$component", component)
            }
            return null
        },
        generateBundle: () => {
            fs.writeFileSync(
                `demo/pages/${component}.html`,
                htmlTemplate.toString().replace("$component", component)
            )
        }
    }
}
const libLoader = () => ({
    resolveId: id => {
        if (id === "#lib") {
            return path.resolve("index.js")
        }
    }
})

const configs = fs.readdirSync("demo/src/components").map(
    file => {
        const component = file.slice(0, -7)

        return {
            input: `demo/src/main.js`,
            output: {
                file: `demo/pages/${component}.js`,
                format: "iife",
            },
            plugins: [
                componentLoader(component),
                libLoader(),
                svelte(),
                resolve(),
                commonjs(),
            ]
        }
    }
)

export default configs
