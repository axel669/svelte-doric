import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import replace from "rollup-plugin-replace"
import svelte from "rollup-plugin-svelte"
// import babel from "rollup-plugin-babel"

export default {
    input: "./src/main.js",
    output: {
        file: "dist/app.js",
        format: "iife",
        // globals: {
        //     "material-ui": "MaterialUI",
        //     "react": "React",
        //     "react-dom": "ReactDOM",
        //     "styled-components": "styled",
        // }
    },
    // external: [
    //     "material-ui",
    //     "react",
    //     "react-dom",
    //     "styled-components",
    // ],
    plugins: [
        svelte({
            // outputFilename: "app.js.map",
            // preprocess: {
            //     style: (info) => {
            //         console.log(info)
            //         return {
            //             code: info.content
            //         }
            //     }
            // }
        }),
        // babel({
        //     exclude: "node_modules/**",
        //     include: "src/**/*.js",
        //     babelrc: false,
        //     plugins: [
        //         "@babel/plugin-transform-react-jsx",
        //         "@babel/plugin-proposal-optional-chaining",
        //         "@babel/plugin-proposal-nullish-coalescing-operator",
        //     ]
        // }),
        resolve(),
        commonjs(),
        replace({
            "process.env.NODE_ENV": JSON.stringify("development")
        }),
    ]
}
