# Icon
> svelte-doric/core/icon

Displays a regular or outlined icon from the Material Icons library.
> [Material Icons](https://material.io/resources/icons/?style=baseline)
>
> [Outlined Material Icons](https://material.io/resources/icons/?style=outline)

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes
| `name` | _string_ | | Name of the icon. See link above for icon names
| `outlined` | _boolean_ | `false` | If true, uses the outlined icons
| `size` | _string_ | | Size of the icons, uses CSS font sizes

## Usage
```html
<Icon name size outlined class />
```
