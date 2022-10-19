# Flex

Layout that uses flexbox under the hood to layout items with a few common
styles applied.

## Flex Alignment
All references to item alignment and justifying are from aligning items in flex
containers, summarized (with helpful images) on [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Aligning_Items_in_a_Flex_Container)

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `center` | _boolean_ | `false` | If true, centers content in the container, overriding item and content align.
| `contentAlign` | _string_ | | Flex line packing method on the cross axis. See Flex Alignment for details.
| `direction` | _string_ | `"column"` | The direction the elements should be laid out. See Flex Alignment for details.
| `gap` | _string_ | `"4px"` | Gap between elements. Include CSS units.
| `itemAlign` | _string_ | | Item positioning on the cross-axis. See Flex Alignment for details.
| `itemFill` | _boolean_ | `false` | If true, items will try to fill the available space.
| `itemJustify` | _string_ | | Item positioning on the main-axis. See Flex Alignment for details.
| `padding` | _string_ | `"4px"` | Padding between the container edge and the elements. Include CSS units.
| `scrollable` | _boolean_ | `false` | Allows the flex container to scroll when content overflows.
| `wrap` | _boolean_ | `false` | Allows items to wrap in the container.

## Usage
```svelte
<Flex direction gap padding scrollable>
    ...content
</Flex>
```
