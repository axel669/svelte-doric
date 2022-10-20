# Portal

Svelte action that moves children into a different area of the DOM tree so that
elements can be logically grouped but not forced into the same area of the DOM.

## Usage
```svelte
<script>
    import { portal } from "svelte-doric"
</script>

<tag use:portal />
```
