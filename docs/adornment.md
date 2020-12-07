# Adornment

Component for adding extra bits of content into other components.

Supported in:
- `Chip`
- `Control`
- `TextArea`
- `TextInput`
- `TitleBar`

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `position` | _string_ | `""` | Position to put the adornment in. Accepted values: `start`,  `end` |
| `stretch` | _boolean_ | `false` | If true, apply `align-items: stretch` style

## Usage
```html
<component>
    <Adornment position stretch>
        Adornment Content
    </Adornment>
</component>
```
