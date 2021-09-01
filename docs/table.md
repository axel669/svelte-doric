# Table
> svelte-doric/core/table

Component for showing data tables.

## Props
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| colWidth | _string_ | `"repeat(auto-fit, minmax(0px, 1fr))"` | The width of the columns for each row. Use the syntax for the `grid-template-columns` CSS property
| data | _array_ | | The data to display. Normal binding rules for rows
| compact | _boolean_ | `false` | If true, rows will be more compact in size
| rowID | _function_ | `item => item` | A function to create unique identifiers for each row. See [Svelte #each](https://svelte.dev/docs#each) for details
| rowHeight | _string_ | | Predefined height for rows. If no value is provided, rows will adjust height based on content. Include CSS measurements
| scrollHeight | _string_ | | If defined, table will have a max height and allow scrolling through rows

## Child Tags
| Tag Name | Description |
| --- | --- |
| `table-cell` | A cell within a row.
| `table-header` | Header row for the table.
| `table-row` | Represents a row within the table. Allows for row-level events or css.

## Usage
```html
<script>
    const data = [...]
</script>

<Table {data} let:item rowID={item => item.id} scrollHeight="100px">
    <table-header slot="header">
        <table-cell>Name</table-cell>
        <table-cell>Description</table-cell>
    </table-header>

    <table-row>
        <table-cell>{item.name}</table-cell>
        <table-cell>{item.description}</table-cell>
    </table-row>

    <div slot="empty">
        No items in the data set!
    </div>

    <div slot="footer">
        Summary data?
    </div>
</Table>

<Table {data} colWidth="repeat(2, 1fr)" compact rowHeight="40px">
    ...
</Table>
```
