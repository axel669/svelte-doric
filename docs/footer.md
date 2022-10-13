# Footer

Element for displaying a footer at the bottom of a `Screen` component.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `bordered` | _boolean_ | `false` | Show a border around the footer.
| `borderColor` | _string_ | | The color of the border, if shown. Use CSS colors.

## Usage
```html
<Screen>
    <Paper>
    </Paper>

    <Footer slot="footer">
        <Button>Do Something</Button>
    </Footer>
</Screen>
```
