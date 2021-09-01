# FlexLayout
> svelte-doric/core/layout/grid

Layout that uses flexbox under the hood to layout items with a few common
styles applied.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `cols` | _number_ | `null` | Number of columns. If `null`, defaults to 1 column. If not `null`, uses repeat(cols, colWidth)
| `colWidth` | _number_ | `"1fr"` | Width of columns. Only used if cols is not `null`
| `direction` | _string_ | `"column"` | The direction the elements should be laid out. See flexbox direction for values
| `gap` | _string_ | `"2px"` | Gap between elements. Include CSS units
| `padding` | _string_ | `"8px"` | Padding between the container edge and the elements. Include CSS units
| `rows` | _number_ | `null` | Number of rows. If null, defaults to 1 row. If not null, uses repeat(rows, rowHeight)
| `rowHeight` | _number_ | `"1fr"` | Height of rows. Only used if rows is not `null`

## Usage
```html
<Card>
    <ActionLayout>
        <GridLayout {direciton} {gap} {padding} {rows} {rowHeight}>
            ...content
        </GridLayout>

        <GridLayout {direciton} {gap} {padding} {cols} {colWidth}>
            ...actions
        </GridLayout>
    </ActionLayout>
</Card>
```
