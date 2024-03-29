Component for showing data tables.

## Props
The table is actually just a List with custom elements defined so it takes the
same props, but the `cols` prop actually does something (documented below).

## Usage
```svelte
<script>
    const tableData = Array.from(
        { length: 50 },
        (_, i) => ({
            name: `Item ${i + 1}`,
            text: `Item ${i + 1}`,
            value: i,
            icon: (i % 2) === 0 ? "sun" : "moon",
            code: i ** 2 % 100,
            long: "a*".repeat(i)
        })
    )
    const tableCols = [
        { value: "name", label: "Name" },
        { value: "code", label: "Item Code" },
        { value: "long", label: "Long Text", size: "3fr" },
    ]
</script>

<Table data={tableData} />
<Table
    data={tableData}
    pageSize={8}
    cols={tableCols}
/>
```
