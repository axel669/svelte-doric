<script>
    import vars from "../util/vars"

    export let direction = "row"
    export let padding = "8px"
    export let gap = "2px"

    export let cols = null
    export let colWidth = "1fr"
    export let rows = null
    export let rowHeight = "1fr"

    $: flowVars = {
        direction,
        padding,
        gap,
        col: cols ? `repeat(${cols}, ${colWidth})` : null,
        row: rows ? `repeat(${rows}, ${rowHeight})` : null,
        autoCol: colWidth,
        autoRow: rowHeight,
    }
</script>

<style>
    grid-layout {
        display: grid;
        padding: var(--padding);
        gap: var(--gap);
        grid-auto-flow: var(--direction);

        grid-template-columns: var(--col);
        grid-template-rows: var(--row);

        grid-auto-columns: var(--autoCol);
        grid-auto-rows: var(--autoRow);
    }
</style>

<grid-layout use:vars={flowVars}>
    <slot />
</grid-layout>
