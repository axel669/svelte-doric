# Checkbox

Basic checkbox component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `checked` | _boolean_ | |
| `group` | _Array_ | | Svelte `bind:group`
| `value` | _any_ | | The value for use in Svelte `bind:group`
|
| `checkedIcon` | _string_ | `"check_box"` | Name of the Material Icon to display when the `Checkbox` is checked
| `color` | _string_ | `"default"` | The theme color to use for the `Checkbox` checkmark. See the colors section of [theme](./theme.md) for details.
| `disabled` | _boolean_ | |
| `labelPlacement` | _string_ | `"right"` | Placement of the label relative to the checkmark
| `labelToggle` | _boolean_ | `true` | If false, clicking the label will not toggle the `Checkbox`
| `outlined` | _boolean_ | `false` | If true, use the outlined Material Icons instead of the regular icons
| `uncheckedIcon` | _string_ | `"check_box_outline_blank"` | Name of the Material Icon to display when the `Checkbox` is unchecked

## Usage
```html
<script>
    let group = []
    let checked = false
</script>

<Checkbox disabled color labelPlacement labelToggle checkedIcon uncheckedIcon outlined>
    Checkbox Label
</Checkbox>

<Checkbox bind:group value>
    Checkbox Label
</Checkbox>
<Checkbox bind:checked>
    Checkbox Label
</Checkbox>
```
