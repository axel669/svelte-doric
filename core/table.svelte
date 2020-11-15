<script>
    export let colWidth = "repeat(auto-fit, minmax(0px, 1fr))"
    export let data
    export let compact
    export let rowID = i => i
    export let rowHeight = "min-content"
    export let scrollHeight
;</script>

<style>
    doric-table {
        display: block;
        margin: 4px;
        border: 1px solid var(--text-secondary);
        overflow: hidden;
        border-radius: 4px;
        grid-template-rows: min-content auto min-content;
    }
    doric-table :global(table-row), :global(table-header) {
        position: relative;
        display: grid;
        grid-template-columns: var(--cols);
        border-bottom: 1px solid var(--text-secondary);
    }
    doric-table :global(table-row:last-child) {
        border-bottom-width: 0px;
    }
    doric-table :global(table-cell) {
        position: relative;
        display: flex;
        align-items: center;
        padding: 12px;
        overflow: hidden;
    }
    doric-table.compact :global(table-cell) {
        padding: 4px;
    }
    doric-table :global(table-cell[control]) {
        padding: 4px;
        display: grid;
    }

    doric-table > :global(table-header table-cell) {
        align-items: center;
        font-weight: 700;
        text-decoration: underline;
    }
    table-body {
        display: grid;
        grid-template-columns: 1fr;
        grid-auto-rows: var(--rows);
        overflow: auto;
        height: var(--scroll);
    }
</style>

<doric-table style="--cols: {colWidth}; --rows: {rowHeight}" class:compact>
    <slot name="header">
        <div />
    </slot>
    <table-body style="--scroll: {scrollHeight};">
        {#each data as item (rowID(item))}
            <slot {item} />
        {:else}
            <slot name="empty" />
        {/each}
    </table-body>
    <slot name="footer" />
</doric-table>
