# Theme

Themes in svelte-doric are collections of CSS variables that are rendered using
a `<style>` tag inside the `AppStyle` component.

Themes can be extended by rendering it as a child and rendering additional
style tags afterwards in the htmlx.

Built-in Themes:
- `LightTheme`
- `DarkTheme`
- `TronTheme`

## Extending
```svelte
<script>
    import { LightTheme, css } from "svelte-doric"

    const extendedCSS = css`
        body {
            --primary: teal;
            --secondary: lightgreen;
        }
    `
</script>

<LightTheme />
{@html extendedCSS}
```
