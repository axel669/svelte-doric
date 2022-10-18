# Svelte Doric

Collection of UI components for Svelte to help create Single Page Applications
easily and reliably. It was written from the ground up to be a standalone
library to keep installation and usage as simple as possible. Right now the
components must be used with the provided baseline css and theme components,
but that will likely change in the future once I figure out how to decouple
some of those things without breaking what I have.

Inspired by similar libraries in React and Svelte like MUI CSS and Smelte,
Svelte Doric is based on material design concepts, but deviates in a few areas
to try something new (and hopefully interesting/useful). Development is mainly
driven by my and my friend's experiences in building web apps, so hopefully
this makes it stay on track and not add complexity needlessly.

## Installation

```bash
npm add svelte-doric
```

### Rollup

It is recommended to use the `emitCss: false` option within the rollup svelte
config to make everything work nicely.

```js
import svelte from "rollup-plugin-svelte"
import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"

export default {
    input: "src/main.js",
    output: {
        file: `build/app.js`,
        format: "iife",
    },
    plugins: [
        svelte({
            emitCss: false,
        }),
        resolve(),
        commonjs(),
    ]
}
```

That's it. That's all it takes to get things installed and going.

## Getting Started

Svelte Doric has set of baseline css that it needs to ensure everything works
well and behaves consistently between browsers, all of which is bundled into
the `Baseline` component, and rendered by the `AppStyle` component. It ships
with 3 themes: `LightTheme`, `DarkTheme`, and `TronTheme`, which can be swapped
out at anytime during runtime safely, and extended into custom themes.

> If `AppStyle` is not used, nothing will look correct, and some things will not
> behave as expected in some browsers (usually Safari).

```svelte
<script>
    import {
        AppStyle,
        Baseline as baseline,
        TronTheme as theme,
    } from "svelte-doric"
</script>

<AppStyle {baseline} {theme} />
```
