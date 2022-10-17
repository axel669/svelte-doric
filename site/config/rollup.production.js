import { terser } from "rollup-plugin-terser"

import config from "./rollup.dev.js"

config.output.file = `build/app-${Date.now()}.min.js`
config.plugins.push(terser())

export default config
