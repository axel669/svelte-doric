Component for making title bars within Screen components.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `center` | _boolean_ | `false` | If `false` the `Appbar` text will be left-aligned by default. If `true` the text will be centered.

## Slots
- menu
- action
- extension

## Usage
```svelte
<Screen>
    <Appbar slot="title">
        Title
    </Appbar>
</Screen>

<Screen>
    <Appbar slot="title">
        Other Title

        <Button adorn slot="menu">
            <Icon name="bars" />
        </Button>
    </Appbar>
</Screen>
```
