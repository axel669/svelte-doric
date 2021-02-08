# Dialog
Automatically displays content as modal and includes a background for the modal
content to visually separate it from the content it overlays.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `forceInteraction` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the dialog
| `let:close` | | | This property allows the dialog component to pass a close function to the dialog content
| `let:options` | | | The options passed in the `show` function are passed to dialog content when `show` is called

## Usage
```html
<script>
    import DialogWindow from "source"

    const openDialog = async () => {
        const value = await dialogVariable.show(options)
    }
</script>

<Dialog bind:this={dialogVariable} let:close let:options>
    <DialogWindow {options} {close} />
</Dialog>
```
