<script>
    import vars from "../util/vars.js"

    export let cols
</script>

<style>
    table-header {
        display: grid;
        font-weight: 700;
        height: 48px;
        padding: 8px;
        position: sticky;
        top: 0px;
        user-select: none;
        z-index: +1;

        grid-template-columns: var(--col-template);
        background-color: var(--primary);
        color: var(--text-invert);
        font-size: var(--text-size-header);
    }
    header-item {
        align-items: center;
        display: flex;
    }
</style>

<table-header>
    {#each cols as col}
        <header-item>
            {col.label}
        </header-item>
    {/each}
</table-header>
