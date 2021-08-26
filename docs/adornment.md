# Adornment

Used to add small pieces of information or interaction to other components.

Supported in:
- `Chip`
- `Control`
- `TextArea`
- `TextInput`
- `TitleBar`

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `position` | _string_ | `""` | Position to put the adornment in. See supporting elements for possible positions
| `stretch` | _boolean_ | `false` | If true, apply `align-items: stretch` style

## Usage
```html
<component>
    <Adornment position stretch>
        Adornment Content
    </Adornment>
</component>
```
