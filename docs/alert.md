# Alert
Shows an alert box using the [`Dialog`](./dialog.md) component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `close` | _function_ | | Function that will close the dialog and pass the given value back up to the calling code
| `okText` | _string_ | `"OK"` | The text to show for the alert button
| `options` | _object_ | | The options that were passed into the `Dialog.show` function
| `position` | _object_ | | The position of the alert dialog on screen. Use `x` and `y` with CSS units. Position is realtive to the center of the `Alert`
