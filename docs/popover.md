# Popover
> svelte-doric/core/popover

Displays content over other items but isn't a full dialog window.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `origin` | `object` | `{}` | The transform origin for the popover content
| `size` | `object` | `{}` | Minimum width and height for the popover content to use. Percentages are based on the size of the static element
| `visible` | `boolean` | `false` | If `true`, the popover will be visible

## Usage
```html
<Popover {visible} anchor={{left: "0px", top: "10px"}}>
    Regular Content
    <div slot="content">
        Popover Content
    </div>
</Popover>
```
