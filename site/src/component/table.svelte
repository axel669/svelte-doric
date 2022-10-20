<script>
    import {
        Table,
    } from "@core"

    import Markdown from "../app/markdown.svelte"
    import docs from "@docs"

    const tableData = Array.from(
        { length: 50 },
        (_, i) => ({
            name: `Item ${i + 1}`,
            label: `Item ${i + 1}`,
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

<h1>Table</h1>

<div style="height: 240px; overflow: hidden; display: grid;">
    <Table data={tableData} />
</div>

<Table
    data={tableData}
    pageSize={8}
    cols={tableCols}
/>

<Markdown {docs} />
