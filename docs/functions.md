# Svelte-Doric Functions
Functions that can be imported alongside any of the components in the library.

## vars
Function for managing CSS variables on html elements.
For use with Svelte `:use`.

Takes an object with variable names as the object keys and the information to create
the css values as the object values. Values that are non-arrays are passed in as
is. Values that are `null` or `undefined` are not added (or removed) from the
nodes' variables. Values that are arrays will be joined, and if the first value
in the array is `null` or `undefined` it is skipped. This allows much simpler
passing of variables with measurements that not always be rendered but can be
tracked in objects very simply.

### Usage
```html
<script>
    export let height = 100
    $: cssVars = {
        width: "200px",
        height: [height, "px"],
        opacity: 0.5,
        // Won't be added
        bgColor: null,
        offsetX: [null, "%"]
    }
</script>

<div use:vars={cssVars} />
```
