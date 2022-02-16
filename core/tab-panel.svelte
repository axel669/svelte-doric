<script>
    export let tabGroup
    export let value
    export let area
</script>

<style>
    tab-panel {
        display: none;
    }
    tab-panel.active {
        display: block;
    }
    tab-panel.area {
        grid-area: panel;
    }
</style>

<tab-panel class:area class:active={tabGroup === value}>
    <slot />
</tab-panel>
