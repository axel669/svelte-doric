Creates a small badge over content.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `anchor` | _object_ | | The anchor point to place the badge at. Use the `top` and `left` properties and include CSS units
| `color` | _string_ | `"default"` | The theme color to use for the badge. See the colors section of [theme](./theme.md) for details
| `translate` | _object_ | | The translation to apply to the badge. Use the `x` and `y` properties and include CSS units

## Slots
- content

## Usage
```svelte
<Badge anchor color translate>
    Content to show badge over
    <div slot="content">
        10
    </div>
</Badge>
```
