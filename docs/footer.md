Element for displaying a footer at the bottom of a `Screen` or `Paper`
component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `bordered` | _boolean_ | `false` | Show a border around the footer.
| `borderColor` | _string_ | | The color of the border, if shown. Use CSS colors.

## Slots
- left
- right

## Usage
```svelte
<Screen>
    <Paper>
        Content
    </Paper>

    <Footer slot="footer">
        <Button>Do Something</Button>
    </Footer>
</Screen>
```
