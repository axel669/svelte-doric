# Radio
> svelte-doric/core/radio/buttons

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `Array` | | Options for the radio group. See below for option properties
| `value` | any | | Value for the radio group
| `checkedIcon` | `string` | `"radio_button_checked"` | Name of the Material Icon to display when the option is selected
| `uncheckedIcon` | `string` | `"radio_button_unchecked"` | Name of the Material Icon to display when the option is not selected
| `labelPosition` | `string` | `right` | Position of the label relative to the checkmark
| `labelToggle` | `boolean` | `true` | If false, clicking the label of an option will not change the radio group's value
| `cols` | `number` | `1` | Number of columns to use when displaying the options

## Slots
| Name | Description |
| --- | --- |
| `label` | Customize the label of each item. Can use custom option properties to extend display options

## Radio Option Properties
```javascript
{
    // The theme color to use for the icon. See the colors section of theme for details
    color: Optional(String),
    label: String,
    value: Object,
}
```

## Usage
```html
<script>
    let value = "first"
    const radioOptions = [
        {label: "First", value: "first"},
        {label: "Second", value: "second"},
        {label: "Numeric", value: 0},
    ]
</script>

<Radio bind:value options={radioOptions} cols={2} />
<Radio bind:value options={radioOptions} cols={2} let:option>
    <div slot="label">
        {option.label.toUpperCase()}
    </div>
</Radio>
```
