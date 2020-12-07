# Button

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | _string_ | `"default"` | The coloration of the `Button`. Valid options are `"default"`, `"primary"`, `"secondary"`, and `"danger"`
| `variant` | _string_ | `"normal"` | `Button` style variation. Valid options are `"normal"` `"outline"` `"fill"`
| `class` | _string_ | | Additional CSS classes to apply to the button
| `disabled` | _boolean_ | | If true, button will not react to user interaction
| `round` | _string_ | | Makes the corners of the button more or less round. Include CSS units for size
| `fab` | _boolean_ | | Shrinks the button down to fit with the size specified with `round` so that it is circular in shape

## Usage
```html
<Button color variant class disabled round fab>
    Button Content
</Button>
```
