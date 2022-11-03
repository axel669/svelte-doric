<script>
    import grid from "./util/grid.mjs"

    export let tabGroup
    export let value
</script>

<style>
    tab-panel {
        display: none;
    }
    tab-panel.active {
        display: block;
    }
</style>

<tab-panel class:active={tabGroup === value} use:grid={$$props}>
    <slot />
</tab-panel>
