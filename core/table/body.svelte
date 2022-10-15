<script>
    export let cols
    export let data
    export let page
    export let pageSize

    $: items =
        pageSize === null
        ? data
        : Array.from(
            { length: pageSize },
            (_, index) => data[page * pageSize + index]
        )
</script>

<style>
    table-cell {
        align-items: center;
        display: flex;
        position: relative;
        user-select: none;
        overflow: hidden;
    }

    table-row {
        display: grid;
        height: 40px;
        padding: 8px;

        background-color: var(--layer-background);
        grid-template-columns: var(--col-template);
    }
    table-row:nth-child(2n) {
        background-color: var(--background);
    }
</style>

{#each items as item}
    <table-row>
        {#if item !== undefined}
            {#each cols as col}
                <table-cell>
                    {col.value(item)}
                </table-cell>
            {/each}
        {/if}
    </table-row>
{/each}
