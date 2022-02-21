# ActionLayout
> svelte-doric/layout

Layout that has 2 spaces: 1 for content, 1 for actions (usually buttons).
If the container is larger than the content + actions, the elements are snapped
to opposite sides of the container (top-bottom or left-right).

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `direction` | _string_ | `"column"` | The direction the elements should be laid out. See flexbox direction for values

## Usage
```html
<Card>
    <Action {direction}>
        <Flex>
            ...content
        </Flex>

        <Grid>
            ...actions
        </Grid>
    </Action>
</Card>
```
