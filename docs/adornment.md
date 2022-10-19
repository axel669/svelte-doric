Component to add small pieces of information or interaction to other components.

## Supported Components
- `AppBar`
- `Chip`
- `TextInput`
- `TitleBar`

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `flush` | _boolean_ | | If `true`, remove adornment padding

## Usage
```svelte
<AppBar>
    <Adornment slot="menu">
        <Button on:tap={openMenu}>
            <Icon name="menu" />
        </Button>
    </Adornment>
</AppBar>

<TextInput label="Cost">
    <Adornment slot="start">
        $
    </Adornment>
</TextInput>
```
