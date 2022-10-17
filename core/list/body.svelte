<script>
    import { createEventDispatcher } from "svelte"

    import Ripple from "../ripple.svelte"

    export let clickable
    export let data
    export let page
    export let pageSize

    const dispatch = createEventDispatcher()

    $: items =
        pageSize === null
        ? data
        : Array.from(
            { length: pageSize },
            (_, index) => data[page * pageSize + index]
        )
    $: itemTap = (item) => {
        if (clickable !== true) {
            return
        }
        dispatch("tap", item)
    }
</script>

<style>
    doric-list-item {
        align-items: center;
        display: flex;
        height: 40px;
        padding: 8px;
        position: relative;
        user-select: none;

        background-color: var(--layer-background);
    }
    doric-list-item:nth-child(2n) {
        background-color: var(--background);
    }
    doric-list-item.clickable {
        cursor: pointer;
    }
</style>

{#each items as item}
    <doric-list-item on:tap={() => itemTap(item)} class:clickable>
        {item?.label ?? ""}
        {#if clickable === true}
            <Ripple />
        {/if}
    </doric-list-item>
{/each}
