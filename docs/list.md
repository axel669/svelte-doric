Component for displaying lists of items that can optionally have interactions.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `clickable` | _boolean_ | | If true, items will be clickable and fire an `on:click` event with the item clicked as the detail property of the event
| `cols` | _array_ | | Not used by the default list, but allows column information to passed into components for table-like behavior on custom components
| `data` | _array_ | | The data to display in the list
| `flat` | _boolean_ | `false` | If true, list will not have a border
| `itemID` | _function_ | `(item) => item` | An optional function to use as the id in the svelte `#each`
| `title` | _string_ | | The title to put into the header of the list
| `square` | _boolean_ | `false` | If true, removes the rounded corners on the lsit
| |
| `body` | `Component` | | Custom component to render the body of the list
| `footer` | `Component` | | Custom component to render the footer of the list
| `header` | `Component` | | Custom component to render the header of the list
| |
| `page` | _number_ | | If paginated, what the current page is. Default list components will control the page without external management needed
| `pageSize` | _number_ | | If defined, list will be paginated with pages of the size specified

### Props passed to Header component
- cols
- data
- title

### Props passed to Body component
- data
- cols
- clickable
- page
- pageSize
- itemID

### Props passed to Footer component
- data
- bind:page
- pageSize

## Usage
```svelte
<List
    data={tableData}
    title="Regular List"
    clickable
    on:click={console.log}
/>

<List
    data={tableData}
    title="Paginated List"
    clickable
    on:click={console.log}
    pageSize={7}
/>
```
