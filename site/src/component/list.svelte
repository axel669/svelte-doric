<script>
    import {
        List,
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
</script>

<h1>List</h1>

<div style="height: 240px; overflow: hidden; display: grid;">
    <List
        data={tableData}
        title="Regular List"
        clickable
        on:click={console.log}
    />
</div>

<List
    data={tableData}
    title="Paginated List"
    clickable
    on:click={console.log}
    pageSize={7}
/>

<Markdown {docs} />
