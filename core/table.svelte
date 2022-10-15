<script context="module">
    const processCol = (col) => {
        const { value, ...rest} = col

        return {
            ...rest,
            value:
                (typeof value === "function")
                ? value
                : (item) => item[value]
        }
    }
</script>

<script>
    import vars from "./util/vars.js"

    import List from "./list.svelte"

    import Body from "./table/body.svelte"
    import Header from "./table/header.svelte"

    export let cols = null
    export let data
    export let pageSize
    export let rowHeight = "40px"

    $: columns =
        cols?.map(processCol)
        ?? Object.keys(data[0])
            .map(
                (key) => ({
                    value: (item) => item[key],
                    label: key,
                })
            )

    $: tableVars = {
        "col-template": columns.map(col => col.size ?? "1fr").join(" "),
        "row": rowHeight,
    }
</script>

<style>
    doric-table {
        display: grid;
        overflow: hidden;
    }
</style>

<doric-table use:vars={tableVars}>
    <List
        {data}
        {pageSize}
        body={Body}
        cols={columns}
        header={Header}
    />
</doric-table>
