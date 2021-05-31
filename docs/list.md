# List
Component for displaying lists of items that may or may not have interactions.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `class` | _string_ | | Additional CSS classes to apply to the component
| `compact` | _boolean_ | | If true, rows will be more compact in size
| `height` | _string_ | | Set the height of the list, will allow for scrolling if set. Include CSS units
| `items` | _array_ | | The items to display in the list. Items with a `header` property exists on the item, it will be rendered as a list header
| `let:item` | | | Item or header element being rendered

## Child Tags
| Name | Description |
| --- | --- |
| `list-header` | Renders a list header
| `list-header-content` | Renders the content of a list header
| `list-item` | Renders a list item
| `list-item-content` | Renders the content of a list item

## Child Tag Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `list-item[control]` | _boolean_ | | If true, the item will be rendered without padding to allow the control all the item space
| `list-item[dividers]` | _boolean_ | | If true, items will be rendered with dividers

## Usage
```html
<List {class} {compact} {height} {items} compact />

<List let:item>
    <list-header slot="header">
        <list-header-content>
            {item.header}
        </list-header-content>
    </list-header>

    <list-item>
        <list-item-content>
            {item.label}
        </list-item-content>
    </list-item>
</List>
```
