# Select
Fancier looking `select` component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component
| `disabled` | _boolean_ | `false` | If true, disables interaction with the `Select`
| `error` | _string_ | | Error text to show under the `Select`
| `label` | _string_ | | Label for the `Select`
| `info` | _string_ | | Informational text to show at the bottom of the `Select`
| `options` | _Array[object]_ | | An array of items to show as the options for the `Select`. Items must have a `label` and `value` property for the default display
| `origin` | _object_ | | The origin for the select options display. See [`Popover`](./popover.md) origin prop for details
| `value` | any | | The value of the selected item in the options. If no item matching the given value is found, a fallback is displayed
| `variant` | _string_ | | `Select` style variation. Valid options are: `"normal"`, `"outline"`
|
| `let:item` | | | Used by the unnamed slot to customize the display of options
| `let:selectedItem` | | | Used by the named slot `selected` to customize the content of the `Select`

## Named Slots
- selected

## Child Tags
| Tag Name | Description |
| --- | --- |
| `select-label` | Provides some default padding and alignment for the labels of items.

## Usage
The named slot `selected` is used to customize the content of the `Select` outside of the options.

Unnamed slots are used to customize the look of the options list when the `Select` is open.

```html
<Select {disabled} />
<Select {info} {error} {label} {options} bind:value />
<Select {class} {label} {options} {origin} {variant} bind:value />

<Select let:item>
    <select-label>
        Option: {item.label}
    </select-label>
</Select>
<Select let:selectedItem>
    <div slot="selected">
        {selectedItem.label ?? "Please Select"}
    </div>
</Select>
```
