<script>
    export let tabGroup
    export let value
</script>

<style>
    tab-panel {
        display: none;
        grid-area: panel;
    }
    tab-panel.active {
        display: block;
    }
</style>

<tab-panel class:active={tabGroup === value}>
    <slot />
</tab-panel>
