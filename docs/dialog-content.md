# DialogContent
> svelte-doric/core/dialog/content

Container for displaying dialog boxes with simple positioning controls.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `top` | _string_ | `"0%"` | Vetical position of the container
| `left` | _string_ | `"0%"` | Horizontal position of the container
| `originX` | _string_ | `"0%"` | The point within the container to use for horizontal positioning
| `originY` | _string_ | `"0%"` | The point within the container to use for vertical positioning
| `width` | _string_ | | Width of the container
| `height` | _string_ | | Height of the container


## Usage
```html
<DialogContent {top} {left} {originX} {originY} {width} {height}>
    ...content
</DialogContent>
```
