Used to display dynamic information and interaction in contrast with buttons
that remain largely static in position.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `clickable` | _boolean_ | | If true, `Chip` will have a ripple effect when clicked
| `color` | _string_ | `"default"` | The theme color to use for the `Chip`. See the colors section of [theme](./theme.md) for details.
| `label` | _string_ | | Text to display in the `Chip`

## Supported Adornment Slots
- start
- end

## Events
- tap

## Usage
```svelte
<Chip label color clickable on:tap />
```
