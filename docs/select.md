# Select
> svelte-doric

Complete replacement to the html select element using what I hope will be a
better way to handle the interaction without losing fucntionality.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component
| `disabled` | _boolean_ | `false` | If true, disables interaction with the `Select`
| `label` | _string_ | | Label for the `Select`
| `options` | _Array[object]_ | | An array of items to show as the options for the `Select`. Items must have a `label` and `value` property for the default display
| `value` | any | | The value of the selected item in the options. If no item matching the given value is found, a fallback is displayed
| `variant` | _string_ | | `Select` style variation. See `Button` variants
| `let:info` | | | Used by the named slot `options` to customize the items in the open `Select`. Will be an object of `{currentValue, options, select}`, where `select` is a function to change the current value
| `let:selected` | | | Used by the named slot `selected` to customize the content of the `Select`

## Named Slots
- selected

## Child Tags
| Tag Name | Description |
| --- | --- |
| `select-label` | Provides some default padding and alignment for the labels of items.

## Usage
The named slot `selected` is used to customize the content of the `Select` outside of the options.
The named slot `options` is used to customize the look of the items in the `Select` list.

```html
<Select {disabled} />
<Select {info} {error} {label} {options} bind:value />
<Select {class} {label} {options} {origin} {variant} bind:value />

<Select let:info>
    <OptionList {info} slot="options" />
</Select>
<Select let:selectedItem>
    <div slot="selected">
        {selectedItem.label ?? "Please Select"}
    </div>
</Select>
```
