<script>
    import vars from "../util/vars"

    export let autoCol = null
    export let autoRow = null
    export let cols = null
    export let direction = "row"
    export let gap = "4px"
    export let padding = "4px"
    export let rows = null
    export let scrollable = false

    $: flowVars = {
        direction,
        padding,
        gap,
        cols,
        rows,
        autoCol,
        autoRow,
    }
</script>

<style>
    grid-layout {
        display: grid;
        overflow: hidden;
        padding: var(--padding);
        gap: var(--gap);
        grid-auto-flow: var(--direction);

        grid-template-columns: var(--cols);
        grid-template-rows: var(--rows);

        grid-auto-columns: var(--autoCol);
        grid-auto-rows: var(--autoRow);
    }
    .scrollable {
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        height: 100%;
        scroll-behavior: auto;
    }
</style>

<grid-layout use:vars={flowVars} class:scrollable>
    <slot />
</grid-layout>
