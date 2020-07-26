<script>
export let vertical = false
;</script>

<style>
divider {
    display: block;
    height: 1px;
    margin: 8px;
    background-color: var(--text-secondary);
}
divider.vertical {
    width: 1px;
    height: 100%;
    align-self: stretch;
}
:global(list-container) > divider {
    margin: 0px;
}
</style>

<divider class:vertical />
