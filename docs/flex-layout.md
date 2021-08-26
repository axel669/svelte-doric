# FlexLayout
Layout that uses flexbox under the hood to layout items with a few common
styles applied.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `direction` | _string_ | `"row"` | The direction the elements should be laid out. See flexbox direction for values
| `gap` | _string_ | `"2px"` | Gap between elements. Include CSS units
| `padding` | _string_ | `"8px"` | Padding between the container edge and the elements. Include CSS units

## Usage
```html
<Card>
    <ActionLayout>
        <FlexLayout {direciton} {gap} {padding}>
            ...content
        </FlexLayout>

        <GridLayout>
            ...actions
        </GridLayout>
    </ActionLayout>
</Card>
```
