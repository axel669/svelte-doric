# Adornment
> svelte-doric

Used to add small pieces of information or interaction to other components.

Supported in:
- `Chip`
- `TextInput`
- `TitleBar`

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `flush` | _boolean_ | | If `true`, remove adornment padding

## Usage
```html
<component>
    <Adornment slot="" flush>
        Adornment Content
    </Adornment>
</component>
```
