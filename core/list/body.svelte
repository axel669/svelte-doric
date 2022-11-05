<script>
    import { createEventDispatcher } from "svelte"

    import Ripple from "../ripple.svelte"

    export let clickable
    // export let data
    export let items
    export let itemID
    // export let page
    // export let pageSize

    const dispatch = createEventDispatcher()

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

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#each items as item (itemID(item))}
    <doric-list-item on:click={() => itemTap(item)} class:clickable>
        {item?.label ?? ""}
    </doric-list-item>
{/each}
