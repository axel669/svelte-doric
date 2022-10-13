# Switch

Basic switch toggle component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `checked` | _boolean_ | |
| `group` | _Array_ | | Svelte `bind:group`
| `value` | _any_ | | The value for use in Svelte `bind:group`
| |
| `color` | _string_ | `"default"` | The theme color to use for the `Switch` checkmark. See the colors section of [theme](./theme.md) for details
| `disabled` | _boolean_ | | If true, disabled the `Switch`
| `labelPlacement` | _string_ | `"right"` | Placement of the label relative to the checkmark

## Usage
```html
<script>
    let group = []
    let checked = false
</script>

<Switch disabled color labelPlacement>
    Switch Label
</Switch>

<Switch bind:group value>
    Switch Label
</Switch>
<Switch bind:checked>
    Switch Label
</Switch>
```
