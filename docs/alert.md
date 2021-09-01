# Alert
> svelte-doric/core/dialog/alert

Shows an alert box using the [`Dialog`](./dialog.md) component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `close` | _function_ | | Function that will close the dialog and pass the given value back up to the calling code
| `options` | _object_ | | The options that were passed into the `Dialog.show` function

### Options
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `message` | _string_ | | The message to show in the alert
| `okText` | _string_ | `"OK"` | The text to show for the alert button
| `title` | _string_ | `"Alert"` | The title to show in the alert. Passing null will hide the title
