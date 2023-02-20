Automatically displays content as modal and includes a background for the modal
content to visually separate it from the content it overlays. `dialog` is not a
component, but is instead an object that is used to display dialogs.

## Options
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `persistent` | _boolean_ | `false` | If true, cliking the space surrounding a dialog box will not close the dialog

## Props

The dialog will automatically pass a `close` function prop to the component it
displays, in addition to the props passed into the options.

### Alert Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `message` | _string_ | | The message to show in the alert
| `okText` | _string_ | `"OK"` | The text to show for the alert button
| `title` | _string_ | `"Alert"` | The title to show in the alert. Passing null will hide the title

### Confirm Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `cancelText` | _string_ | `"Cancel"` | The text to show for the cancel button
| `message` | _string_ | | The message to show in the alert
| `okText` | _string_ | `"OK"` | The text to show for the confirm button
| `reaction` | _function_ | | If given, clicking the ok button will trigger a reactive element and execute the async function.
| `title` | _string_ | `"Alert"` | The title to show in the alert. Passing null will hide the title

### Prompt Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `cancelText` | _string_ | `"Cancel"` | The text to show for the cancel button
| `message` | _string_ | | The message to show in the alert
| `okText` | _string_ | `"OK"` | The text to show for the confirm button
| `placeholder` | _string_ | | Placeholder text for the text input
| `reaction` | _function_ | | If given, clicking the ok button will trigger a reactive element and execute the async function.
| `title` | _string_ | `"Alert"` | The title to show in the alert. Passing null will hide the title

## Usage
```svelte
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
