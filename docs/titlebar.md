Component for making title bars at the top of elements on the page.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `center` | _boolean_ | `false` | If `false` the `Titlebar` text will be left-aligned by default. If `true` the text will be centered.
| `compact` | _boolean_ | | If true, `Titlebar` will be shorter and remove the background color.
| `sticky` | _boolean_ | `false` | If `true` the `Titlebar` will use sticky positioning at the top.

## Slots
- menu
- action
- extension

## Usage
```svelte
<Paper>
    <Titlebar slot="title">
        Title
    </Titlebar>
</Paper>
<Paper>
    <Titlebar slot="title">
        Other Title

        <Button adorn slot="menu">
            <Icon name="bars" />
        </Button>
    </Titlebar>
</Paper>
```
