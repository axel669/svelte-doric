Sets up the baseline CSS for an application.

Instead of taking in props, a baseline component renders style tags and adds
external fonts using `svelte:head`

`Baseline` can be extended by rendering it as a child and rendering
additional style tags afterwards in the htmlx.

## Usage
```svelte
<AppStyle {baseline} {theme} />
```

## Extending
```svelte
<script>
    import { Baseline, css } from "svelte-doric"

    const extendedCSS = css`
        body {
            background-image: url(some-image.jpg);
        }
    `
</script>

<Baseline />
{@html extendedCSS}
```
