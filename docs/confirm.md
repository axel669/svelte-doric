# Confirm

Shows a confirm box using [`dialog.show()`](./dialog.md).

## Props from Dialog
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `close` | _function_ | | Function that will close the dialog and pass the given value back up to the calling code

### Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `cancelText` | _string_ | `"Cancel"` | The text to show for the cancel button
| `message` | _string_ | | The message to show in the alert
| `okText` | _string_ | `"OK"` | The text to show for the confirm button
| `title` | _string_ | `"Alert"` | The title to show in the alert. Passing null will hide the title
