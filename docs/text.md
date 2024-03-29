Displays text with some predefined styles. Not required to show text, just a
handy way to use the shorthands defined in the library, and have text interact
with the layouts in a sane and predictable fashion.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `adorn` | _boolean_/_string_ | | See [adornments](#adornment)
| `align` | _string_ | `"left"` | Text alignment for normal text boxes (non adorn text).
| `block` | _boolean_ | `false` | If true, text will be displayed in a block element instead of an inline element.
| `color` | _string_ | `"default"` | The coloration of the `Text`. Valid options are `"default"`, `"primary"`, `"secondary"`, and `"danger"`.
| `subtitle` | _boolean_ | `false` | Displays the text smaller for use in secondary text in titles.
| `textColor` | _string_ | | Set the color of the text using CSS for colors outside the standard ones.
| `textSize` | _string_ | | Sets the text size. Include CSS units.

## Usage

```svelte
<Text>Some text</Text>
<Text color="primary">Some text</Text>

<div>
    <Text>a line of text</Text>
    <Text block>Block text</Text>
    <Text>another line of text</Text>
</div>
```
