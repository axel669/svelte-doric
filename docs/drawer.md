# Drawer

Shows a drawer that slides in and out from the left side of the screen.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | _boolean_ | | If `true`, the drawer will be open

## Usage
```html
<script>
    import { drawer } from "svelte-doric"

    drawer.open(
        DrawerContent,
        {...options}
    )
</script>
```
