# Text
> svelte-doric/core/text

Displays text with some predefined styles. Not required to show text, just a
handy way to use the shorthands defined in the library.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `adorn` | _boolean_ | | Has the text align to the center horizontally and vertically to look better when used as adornments
| `align` | _string_ | `"left"` | Text alignment for normal text boxes (non adorn text)
| `block` | _boolean_ | `false` | If true, text will be displayed in a block element instead of an inline element
| `class` | _string_ | | Additional CSS classes to apply to the component
| `color` | _string_ | `"default"` | The coloration of the `Text`. Valid options are `"default"`, `"primary"`, `"secondary"`, and `"danger"`
| `variant` | _string_ | `"normal"` | `Text` style variation. Valid options are: `"normal"`, `"secondary"`
