<script>
    export let vertical = false
;</script>

<style>
tab-list {
    grid-area: label;
    display: flex;
    background-color: var(--control-background);
    box-shadow: 0px 2px 2px rgba(0, 0, 0, 0.25);
    z-index: +5;
}
tab-list.vertical {
    flex-direction: column;
    align-content: stretch;
}
</style>

<tab-list class:vertical>
    <slot />
</tab-list>
