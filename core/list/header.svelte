<script>
    export let title
</script>

<style>
    doric-list-header {
        align-items: center;
        display: flex;
        font-weight: 700;
        height: 48px;
        padding: 8px;
        position: sticky;
        top: 0px;
        z-index: +1;

        background-color: var(--primary);
        color: var(--text-invert);
        font-size: var(--text-size-header);
    }
</style>

<doric-list-header>
    {title}
</doric-list-header>
