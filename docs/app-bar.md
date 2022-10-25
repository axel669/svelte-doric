Component for making title bars within Screen components.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `center` | _boolean_ | `false` | If `false` the `AppBar` text will be left-aligned by default. If `true` the text will be centered.

## Supported Adornment Slots
- menu
- action
- extension

## Usage
```svelte
<Screen>
    <AppBar slot="title">
        Title
    </AppBar>
</Screen>

<Screen>
    <AppBar slot="title">
        Other Title

        <Adornment slot="menu">
            <Button adorn>
                <Icon name="bars" />
            </Button>
        </Adornment>
    </AppBar>
</Screen>
```
