Displays content over other items but isn't a full dialog window.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `anchor` | `object` | `{ left: "0px", top: "100%" }` | How to anchor the popover content to the content underneath
| `size` | `object` | `{ width: "100%", height: "auto" }` | Size of the popover content to use. Percentages are based on the size of the content underneath

## Bindings
- show
- hide

## Usage
```svelte
<Popover let:show let:hide>
    <Button on:tap={show} variant="outline">
        Show Popover
    </Button>

    <Paper card slot="content" on:tap={open}>
        <Text>
            Popover Content
        </Text>

        <Button slot="action" color="secondary" on:tap={hide}>
            Close
        </Button>
    </Paper>
</Popover>
```
