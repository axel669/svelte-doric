# Radio

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `group` | `Array` | | Svelte `bind:group`
| `value` | any | | The value for use in Svelte `bind:group`
|
| `checkedIcon` | `string` | `"radio_button_checked"` | Name of the Material Icon to display when the `Radio` is selected
| `disabled` | `boolean` | |
| `color` | `string` | | The theme color to use for the `Radio` icon. See the colors section of [theme](./theme.md) for details
| `labelPlacement` | `string` | | Placement of the label relative to the checkmark
| `outlined` | `boolean` | | If true, use the outlined Material Icons instead of the regular icons
| `uncheckedIcon` | `string` | `"radio_button_unchecked"` | Name of the Material Icon to display when the `Radio` is not selected

## Usage
```html
<script>
    let selected = []
</script>

<Radio value={1} bind:group={selected}>
    First
</Radio>
<Radio value={2} bind:group={selected} disabled>
    Second
</Radio>
<Radio value={3} bind:group={selected} color="secondary">
    Third
</Radio>
<Radio value={4} bind:group={selected} outlined>
    Fourth
</Radio>
```
