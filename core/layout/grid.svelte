<script>
    import vars from "../util/vars.js"
    import grid from "../util/grid.mjs"

    export let adorn
    export let areas = "initial"
    export let autoCols = "initial"
    export let autoRows = "initial"
    export let cols = "initial"
    export let direction = "row"
    export let gap = "4px"
    export let fit
    export let overflow = false
    export let padding = "4px"
    export let rows = "initial"
    export let scrollable = false

    $: flowVars = {
        direction,
        padding,
        gap,
        cols,
        rows,
        autoCols,
        autoRows,
        areas: Array.isArray(areas)
            ? areas.map(line => `"${line}"`).join("\n")
            : areas
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
        grid-template-areas: var(--areas);

        grid-auto-columns: var(--autoCols);
        grid-auto-rows: var(--autoRows);
    }
    .scrollable {
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        height: 100%;
        scroll-behavior: auto;
    }
    .overflow {
        overflow: visible;
    }
    .fit {
        max-height: 100%;
    }
</style>

<grid-layout
use:vars={flowVars}
class:scrollable
class:overflow
class:fit
class:ignore-appbar-reskin={adorn === "no-reskin"}
use:grid={$$props}>
    <slot />
</grid-layout>
