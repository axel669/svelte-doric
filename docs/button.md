# Button

Elements intended to direct user interaction in many places within an
application.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `adorn` | _boolean_ | | If true, padding will be much smaller than normal
| `buttonColor` | _CSS String_ | | Custom color for the button outside of the standard colors
| `color` | _string_ | `"default"` | The coloration of the `Button`. Valid options are `"default"`, `"primary"`, `"secondary"`, and `"danger"`
| `compact` | _boolean_ | | If true, default padding will be half the normal size
| `disabled` | _boolean_ | | If true, button will not react to user interaction
| `round` | _string_ | | Makes the corners of the button more or less round. Include CSS units for size
| `square` | _boolean_ | | If true, button will not have rounded corners
| `variant` | _string_ | `"normal"` | `Button` style variation. Valid options are: `"normal"`, `"outline"`, `"fill"`

## Events
- tap

## Usage
```html
<Button color compact disabled round variant on:tap>
    Button Content
</Button>
<Button adorn color disabled square variant on:tap>
    Square Button
</Button>
```
