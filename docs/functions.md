# Functions
Functions that can be imported alongside any of the components in the library.

## vars

Function for managing CSS variables on html elements.
For use with Svelte `use:`.

Takes an object with variable names as the object keys and the information to create
the css values as the object values. Values that are non-arrays are passed in as
is. Values that are `null` or `undefined` are not added (or removed) from the
nodes' variables. Values that are arrays will be joined, and if the first value
in the array is `null` or `undefined` it is skipped. This allows much simpler
passing of variables with measurements that will not always be rendered but can be
tracked in objects very simply.

### Usage
```svelte
<script>
    export let height = 100
    $: cssVars = {
        width: "200px",
        height: [height, "px"],
        opacity: 0.5,
        // Won't be added
        "bg-color": null,
        "offset-x": [null, "%"]
    }
</script>

<div use:vars={cssVars} />
```

## css

Template literal tag for rendering css directly without svelte automatically
scoping it (mainly used for themes).

### Usage

```svelte
<script>
    import { css } from "svlete-doric"

    const theme = css`
        body {
            --font: Orbitron;
            --background: #030303;
            --background-layer: #04080C;
            --layer-border-width: 1px;
            --layer-border-color: #00EEEE;
            --title-bar-background: #00EEEE;
        }
    `
</script>

{@html theme}

```
