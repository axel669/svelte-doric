# Dialog
> svelte-doric/dialog

Automatically displays content as modal and includes a background for the modal
content to visually separate it from the content it overlays.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `component` | _SvelteElement_ | | The component to display as the dialog window
| `persistent` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the dialog

## Usage
```html
<script>
    const openDialog = async () => {
        const value = await dialogVariable.show(options)
    }
</script>

<Dialog bind:this={dialogVariable} component={Alert} persistent />
```
