# Drawer

Shows a drawer that slides in and out from the left side of the screen.

## Drawer Content
The content of a drawer should be a component that takes a `close` property,
which is a function that can be called to close the drawer from code. Drawers
will automatically close if the user clicks outside the content area.

Each property of the options argument will be passed into the provided
component as indivudual component props.

## Usage
```svelte
<script>
    import { drawer } from "svelte-doric"

    drawer.open(
        DrawerContent,
        {...options}
    )
</script>
```
