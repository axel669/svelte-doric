# Dialog

Component for showing dialog boxes.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `forceInteraction` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the dialog

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
