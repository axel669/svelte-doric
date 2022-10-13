# Dialog

Automatically displays content as modal and includes a background for the modal
content to visually separate it from the content it overlays. `dialog` is not a
component, but is instead an object that is used to display dialogs.

## Options
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `persistent` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the dialog

## Usage
```html
<script>
    import { dialog, Alert, Confirm } from "svelte-doric"

    const openDialog = async () => {
        const value = await dialog.show(
            Alert,
            {
                persistent: true,
                ...alertOptions
            }
        )
    }
    const removeItem = async () => {
        const value = await dialog.show(
            Confirm,
            {
                persistent: true,
                ...confirmOptions
            }
        )
    }
</script>
```
