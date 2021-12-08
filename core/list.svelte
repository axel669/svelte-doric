<script>
    import Divider from "./divider.svelte"

    export let items = []
    export let height
    export let compact
    let klass = ""
    export {klass as class}
</script>

<style>
    doric-list {
        display: flex;
        overflow: auto;
        height: var(--list-height);
        user-select: none;
        flex-direction: column;
    }

    doric-list > :global(list-item), doric-list > :global(list-header) {
        display: grid;
        position: relative;
        overflow: hidden;
        padding: 12px 16px;
        color: var(--text-normal);
        grid-template-areas:
            "start-adornment content end-adornment"
        ;
        grid-template-columns: auto 1fr auto;
    }
    doric-list > :global(list-header) > :global(list-header-content) {
        font-size: var(--text-size-header);
        font-weight: 700;
    }
    doric-list > :global(list-item > a) {
        position: absolute;
        top: 0px;
        left: 0px;
        bottom: 0px;
        right: 0px;
        opacity: 0;
    }
    doric-list > :global(list-item[dividers]:not(:last-child)) {
        border-top: 1px solid var(--text-secondary);
        border-bottom: 1px solid var(--text-secondary);
        margin-top: -1px;
    }

    doric-list > :global(list-item) > :global(list-header-content),
    doric-list > :global(list-header) > :global(list-header-content) {
        grid-area: content;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
        grid-area: content;
    }
    doric-list > :global(list-item[control]) {
        padding: 0px;
    }
</style>

<doric-list class:compact class={klass} style="--list-height: {height}">
    {#each items as item}
        {#if item.header !== undefined}
            <slot name="header" {item}>
                <list-header>
                    <list-header-content>
                        {item.header}
                    </list-header-content>
                </list-header>
            </slot>
        {:else}
            <slot {item}>
                <list-item>
                    <list-item-content>
                        {item ?? ""}
                    </list-item-content>
                </list-item>
            </slot>
        {/if}
    {/each}
</doric-list>
